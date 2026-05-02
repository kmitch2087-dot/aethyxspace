import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Allowed origins for CORS - restrict to your domains only
const allowedOrigins = [
  "https://vibeshiftstudio.lovable.app",
  "https://id-preview--9d25c426-f64e-4f23-85cf-2cebfabb0756.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && allowedOrigins.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app') || origin.endsWith('.lovableproject.com')
  );
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
};

// Input validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const urlRegex = /^https?:\/\/.+/;

// Mask email for logging (e.g., "user@example.com" -> "u***@e***.com")
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const [domainName, ...tlds] = domain.split(".");
  const maskedLocal = local.length > 1 ? local[0] + "***" : "***";
  const maskedDomain = domainName.length > 1 ? domainName[0] + "***" : "***";
  return `${maskedLocal}@${maskedDomain}.${tlds.join(".")}`;
}

interface WaitingListInput {
  name: string;
  email: string;
  updateFrequency: string;
  websiteUrl?: string;
}

function validateInput(data: unknown): { valid: true; data: WaitingListInput } | { valid: false; error: string } {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Invalid request body" };
  }

  const input = data as Record<string, unknown>;

  // Validate name
  if (!input.name || typeof input.name !== "string" || input.name.trim().length === 0) {
    return { valid: false, error: "Name is required" };
  }
  if (input.name.length > 100) {
    return { valid: false, error: "Name must be less than 100 characters" };
  }

  // Validate email
  if (!input.email || typeof input.email !== "string") {
    return { valid: false, error: "Email is required" };
  }
  const trimmedEmail = input.email.trim().toLowerCase();
  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, error: "Valid email address is required" };
  }
  if (trimmedEmail.length > 255) {
    return { valid: false, error: "Email must be less than 255 characters" };
  }

  // Validate updateFrequency
  if (!input.updateFrequency || typeof input.updateFrequency !== "string" || input.updateFrequency.trim().length === 0) {
    return { valid: false, error: "Update frequency is required" };
  }
  if (input.updateFrequency.length > 500) {
    return { valid: false, error: "Update frequency must be less than 500 characters" };
  }

  // Validate websiteUrl (optional)
  let sanitizedUrl: string | undefined;
  if (input.websiteUrl && typeof input.websiteUrl === "string" && input.websiteUrl.trim().length > 0) {
    const trimmedUrl = input.websiteUrl.trim();
    if (!urlRegex.test(trimmedUrl)) {
      return { valid: false, error: "Website URL must be a valid URL starting with http:// or https://" };
    }
    if (trimmedUrl.length > 500) {
      return { valid: false, error: "Website URL must be less than 500 characters" };
    }
    sanitizedUrl = trimmedUrl;
  }

  return {
    valid: true,
    data: {
      name: input.name.trim().slice(0, 100),
      email: trimmedEmail.slice(0, 255),
      updateFrequency: input.updateFrequency.trim().slice(0, 500),
      websiteUrl: sanitizedUrl?.slice(0, 500),
    },
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Block requests from non-allowed origins
  if (!corsHeaders["Access-Control-Allow-Origin"]) {
    console.warn("Blocked request from unauthorized origin:", origin);
    return new Response(JSON.stringify({ error: "Unauthorized origin" }), {
      headers: { "Content-Type": "application/json" },
      status: 403,
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    const body = await req.json();

    // Validate input
    const validation = validateInput(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { name, email, updateFrequency, websiteUrl } = validation.data;

    console.log("Submitting waiting list entry for:", maskEmail(email));

    // Initialize Supabase client with service role for checking duplicates
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check for duplicate email (rate limiting - prevent multiple submissions)
    const { data: existingEntry, error: checkError } = await supabaseAdmin
      .from("waiting_list")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking for duplicate:", checkError);
      // Continue anyway - better to allow potential duplicate than block legitimate user
    } else if (existingEntry) {
      // Email already exists - return success to avoid leaking information
      // but don't insert duplicate
      console.log("Duplicate submission attempt for:", maskEmail(email));
      return new Response(
        JSON.stringify({ success: true, message: "Successfully added to waiting list" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Initialize Supabase client with anon key for insert
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Insert into waiting_list table
    const { error: insertError } = await supabase
      .from("waiting_list")
      .insert({
        name,
        email,
        update_frequency: updateFrequency,
        website_url: websiteUrl || null,
      });

    if (insertError) {
      console.error("Database insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to submit. Please try again." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("Successfully added to waiting list:", maskEmail(email));

    // Notify admin via transactional email (fire-and-forget)
    try {
      await supabaseAdmin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "inquiry-notification",
          recipientEmail: "kristinmitchell@aethyx.space",
          idempotencyKey: `inquiry-notify-${email}-${Date.now()}`,
          templateData: {
            name,
            email,
            message: `Update frequency: ${updateFrequency}${websiteUrl ? `\n\nExisting site: ${websiteUrl}` : ""}`,
            source: "Waiting list / Inquiry form",
            submittedAt: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
          },
        },
      });
    } catch (notifyErr) {
      console.warn("Admin notification email failed:", notifyErr);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Successfully added to waiting list" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error processing waiting list submission:", error);
    return new Response(
      JSON.stringify({ error: "Failed to submit. Please try again." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
