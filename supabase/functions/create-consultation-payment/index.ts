import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

// Allowed origins for CORS - restrict to your domains only
const allowedOrigins = [
  "https://vibeshiftstudio.lovable.app",
  "https://id-preview--9d25c426-f64e-4f23-85cf-2cebfabb0756.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && allowedOrigins.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app')
  );
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
};

// Mask email for logging (e.g., "user@example.com" -> "u***@e***.com")
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const [domainName, ...tlds] = domain.split(".");
  const maskedLocal = local.length > 1 ? local[0] + "***" : "***";
  const maskedDomain = domainName.length > 1 ? domainName[0] + "***" : "***";
  return `${maskedLocal}@${maskedDomain}.${tlds.join(".")}`;
}

// Consultation fee price ID
const CONSULTATION_PRICE_ID = "price_1SwQ4mCEyzqaryb8RIoTHGwM";

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

  try {
    const { email, name } = await req.json();

    // Input validation - email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
      return new Response(
        JSON.stringify({ error: "Valid email address is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedEmail = email.trim().toLowerCase().slice(0, 255);
    const sanitizedName = typeof name === "string" ? name.trim().slice(0, 100) : "";

    console.log("Creating consultation payment for:", maskEmail(sanitizedEmail));

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if a Stripe customer already exists for this email
    const customers = await stripe.customers.list({ email: sanitizedEmail, limit: 1 });
    let customerId: string | undefined;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("Found existing customer:", customerId);
    } else {
      // Create a new customer
      const customer = await stripe.customers.create({
        email: sanitizedEmail,
        name: sanitizedName || undefined,
      });
      customerId = customer.id;
      console.log("Created new customer:", customerId);
    }

    // Create a one-time payment session for the consultation
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: CONSULTATION_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success`,
      cancel_url: `${req.headers.get("origin")}/services`,
      metadata: {
        type: "consultation",
        customerEmail: sanitizedEmail,
        customerName: sanitizedName,
      },
    });

    console.log("Created checkout session:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    // Log detailed error for debugging, but return generic message to client
    console.error("Error creating consultation payment:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create payment session. Please try again." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
