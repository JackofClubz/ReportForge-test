import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create a Supabase admin client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the request body
    const { user_id, org_id, role } = await req.json();

    // Validate required parameters
    if (!user_id) {
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!org_id) {
      return new Response(JSON.stringify({ error: "Organisation ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!role) {
      return new Response(JSON.stringify({ error: "Role is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if a record already exists to avoid duplicates
    const { data: existingRecord, error: queryError } = await supabaseAdmin
      .from('org_users')
      .select('*')
      .eq('user_id', user_id)
      .eq('org_id', org_id)
      .maybeSingle();

    if (queryError) {
      console.error("Error checking for existing record:", queryError);
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If record already exists, just update the role
    if (existingRecord) {
      console.log("Record already exists, updating role");
      const { data: updateData, error: updateError } = await supabaseAdmin
        .from('org_users')
        .update({ role })
        .eq('id', existingRecord.id)
        .select();

      if (updateError) {
        console.error("Error updating org_users record:", updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ 
        message: "Organisation membership updated successfully",
        data: updateData 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new record
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('org_users')
      .insert({
        user_id,
        org_id,
        role,
      })
      .select();

    if (insertError) {
      console.error("Error creating org_users record:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      message: "Organisation membership created successfully",
      data: insertData 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in Edge Function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}); 