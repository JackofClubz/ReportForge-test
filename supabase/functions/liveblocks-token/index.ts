import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get environment variables (these are automatically provided by Supabase Edge Functions)
    const LIVEBLOCKS_SECRET_KEY = Deno.env.get("LIVEBLOCKS_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("[liveblocks-token] Environment check:", {
      hasLiveblocksKey: !!LIVEBLOCKS_SECRET_KEY,
      hasSupabaseUrl: !!SUPABASE_URL,
      hasSupabaseAnonKey: !!SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: SUPABASE_URL,
    });

    if (!LIVEBLOCKS_SECRET_KEY) {
      console.error("[liveblocks-token] Missing LIVEBLOCKS_SECRET_KEY environment variable");
      return new Response(JSON.stringify({ error: "Missing LIVEBLOCKS_SECRET_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[liveblocks-token] Missing required Supabase environment variables");
      return new Response(JSON.stringify({ 
        error: "Missing Supabase configuration",
        details: {
          hasUrl: !!SUPABASE_URL,
          hasAnonKey: !!SUPABASE_ANON_KEY,
          hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create authenticated Supabase client
    const supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Get current user from auth
    console.log("[liveblocks-token] Attempting to get user from token...");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error("[liveblocks-token] Authentication failed:", { authError, hasUser: !!user });
      return new Response(JSON.stringify({ 
        error: "Authentication required", 
        details: authError?.message || "No user found"
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[liveblocks-token] Successfully authenticated user: ${user.id}`);

    // Create admin Supabase client to fetch user details
    console.log("[liveblocks-token] Creating admin Supabase client...");
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user profile information
    console.log("[liveblocks-token] Fetching user profile for:", user.id);
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error("[liveblocks-token] Error fetching user profile:", { profileError, hasProfile: !!userProfile });
      return new Response(JSON.stringify({ 
        error: "User profile not found",
        details: profileError?.message || "Profile query returned null"
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[liveblocks-token] Successfully fetched user profile:", userProfile.full_name);

    // Get user's organization information for permissions
    console.log("[liveblocks-token] Fetching organization info for user:", user.id);
    const { data: orgUser, error: orgError } = await supabaseAdmin
      .from('org_users')
      .select('org_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (orgError) {
      console.log("[liveblocks-token] Organization lookup error (this is OK):", orgError.message);
    } else {
      console.log("[liveblocks-token] Found organization info:", { role: orgUser?.role, orgId: orgUser?.org_id });
    }

    // Generate consistent user color (same logic as client-side)
    const generateUserColor = (userId: string): string => {
      const colors = [
        "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", 
        "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
        "#F8C471", "#82E0AA", "#AED6F1", "#D7BDE2", "#F9E79F"
      ];
      
      let hash = 0;
      for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
      }
      
      return colors[Math.abs(hash) % colors.length];
    };

    // Prepare user metadata for Liveblocks
    const userInfo = {
      name: userProfile.full_name || user.email?.split('@')[0] || 'User',
      avatar: "",
      color: generateUserColor(user.id),
      email: userProfile.email || user.email || '',
      role: orgUser?.role || 'viewer',
      orgId: orgUser?.org_id || null,
    };

    // Determine permissions based on user role
    let roomAccess = ["room:read"];
    if (orgUser?.role === 'admin' || orgUser?.role === 'qp') {
      roomAccess = ["room:read", "room:write", "room:presence:write"];
    } else if (orgUser?.role === 'editor' || orgUser?.role === 'author') {
      roomAccess = ["room:read", "room:write", "room:presence:write"];
    } else {
      roomAccess = ["room:read", "room:presence:write"];
    }

    // Generate token using Liveblocks REST API
    console.log("[liveblocks-token] Calling Liveblocks API with userInfo:", userInfo);
    const response = await fetch("https://api.liveblocks.io/v2/authorize-user", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LIVEBLOCKS_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: user.id,
        userInfo: userInfo,
        permissions: {
          "report-*": roomAccess,
        },
      }),
    });

    console.log("[liveblocks-token] Liveblocks API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[liveblocks-token] Liveblocks API error:", { status: response.status, body: errorText });
      return new Response(JSON.stringify({ 
        error: "Liveblocks API error",
        details: `Status: ${response.status}, Body: ${errorText}`
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const responseData = await response.json();
    console.log("[liveblocks-token] Liveblocks API response:", { hasToken: !!responseData.token });
    const { token } = responseData;

    console.log(`[liveblocks-token] Token generated successfully for user: ${userProfile.full_name}`);

    return new Response(JSON.stringify({ 
      token,
      user: {
        id: user.id,
        name: userProfile.full_name,
        email: userProfile.email,
        role: orgUser?.role || 'viewer',
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[liveblocks-token] Error generating token:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to generate token",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}); 