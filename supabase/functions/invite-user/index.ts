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
    // Create a Supabase client with the Auth context of the logged in user.
    const _supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    // TODO: Add permission checks here using _supabaseClient if needed,
    // e.g., ensure the invoking user is an admin of the org_id passed.

    // Expect email, org_id, inviter_name, and an optional redirect_url from client
    const { email, org_id, inviter_name, redirect_url, selected_role = "viewer" } = await req.json();

    if (!email || !org_id) {
      return new Response(JSON.stringify({ error: "Email and Organisation ID are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Fetch the organization's domain
    console.log(`[invite-user V9] Fetching domain for org_id: ${org_id}`);
    const { data: orgData, error: orgFetchError } = await supabaseAdmin
      .from('orgs')
      .select('domain')
      .eq('id', org_id)
      .single();

    if (orgFetchError || !orgData) {
      console.error("[invite-user V9] Error fetching organization or org not found:", orgFetchError);
      return new Response(JSON.stringify({ error: "Organization not found or error fetching organization details.", type: "ORG_FETCH_ERROR" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgDomain = orgData.domain;
    if (!orgDomain) {
      console.warn(`[invite-user V9] Organization ${org_id} does not have a domain configured. Allowing invite by default.`);
      // Decide if you want to error out or allow invites if org domain is not set.
      // For now, let's assume if no domain is set, any email can be invited (or change to error).
    } else {
      const invitedUserEmailDomain = email.substring(email.lastIndexOf('@') + 1);
      console.log(`[invite-user V9] Org Domain: ${orgDomain}, Invited User Domain: ${invitedUserEmailDomain}`);
      if (invitedUserEmailDomain.toLowerCase() !== orgDomain.toLowerCase()) {
        console.log("[invite-user V9] Email domain mismatch. Invitation denied.");
        return new Response(JSON.stringify({ 
          error: `Invitation failed: Users can only be invited from the organization's domain (@${orgDomain}).`, 
          type: "DOMAIN_MISMATCH"
        }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let finalRedirectUrl = redirect_url;
    if (finalRedirectUrl) {
      const url = new URL(finalRedirectUrl);
      url.searchParams.set('org_id', org_id);
      url.searchParams.set('email', email);
      finalRedirectUrl = url.toString();
    }

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { 
        redirectTo: finalRedirectUrl, 
        data: { org_id: org_id, invited_by_name: inviter_name, initial_role: selected_role } 
      }
    );

    if (inviteError) {
      console.error("[invite-user V9] Error from inviteUserByEmail:", inviteError);
      // @ts-ignore
      const status = inviteError.status || (inviteError.error && inviteError.error.status);
      // @ts-ignore
      const message = inviteError.message || (inviteError.error && inviteError.error.message) || 'Unknown error';

      if (status === 422 && message.includes('already been registered')) {
        console.log("[invite-user V9] User already exists, invite process will still send an email with new context.");
        return new Response(JSON.stringify({ 
          message: "User already exists. An invitation to join this organization has been sent to their email.", 
          type: "USER_ALREADY_EXISTED_AND_INVITED"
        }), {
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ 
        error: message, 
        type: "INVITE_UNEXPECTED_ERROR" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[invite-user V9] Invitation email sent successfully to new user:", inviteData.user);
    return new Response(JSON.stringify({ 
      message: "Invitation email sent successfully.", 
      user: inviteData.user,
      type: "NEW_USER_INVITED"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[invite-user V9] Error in Edge Function (outer catch):", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}); 