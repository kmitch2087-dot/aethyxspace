import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

// Allowed origins for CORS
const allowedOrigins = [
  "https://aethyx.space",
  "https://www.aethyx.space",
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

// Mask email for logging
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const [domainName, ...tlds] = domain.split(".");
  const maskedLocal = local.length > 1 ? local[0] + "***" : "***";
  const maskedDomain = domainName.length > 1 ? domainName[0] + "***" : "***";
  return `${maskedLocal}@${maskedDomain}.${tlds.join(".")}`;
}

// Valid price IDs for all services
const VALID_PRICE_IDS = [
  // Service Tiers
  "price_1SwpcpCEyzqaryb8mReM49oZ", // Tier 1 - $750
  "price_1SwpdDCEyzqaryb8rqSMuwob", // Tier 2 - $1,750
  "price_1SwpdWCEyzqaryb8wafKCMRx", // Tier 3 - $2,500
  // Quick Deliverables
  "price_1SwQOyCEyzqaryb8zKLQHt8r", // Logo Creation - $100
  "price_1SwQPkCEyzqaryb8SJkRanuX", // Brand Assets From Logo - $150
  "price_1SwQPxCEyzqaryb8ducbgf3I", // Logo & Assets Package - $200
  // Add-ons (addon pricing)
  "price_1SwpdfCEyzqaryb8aOLSLDHU", // Email Campaign - Add-on $150
  "price_1SwpdhCEyzqaryb8yqo6buXZ", // Cloud Storage - Add-on $100
  "price_1SwpdjCEyzqaryb8gwnxARTu", // Client Dashboard - Add-on $250
  "price_1SwpdlCEyzqaryb8ujQAeBB9", // E-commerce - Add-on $300
  "price_1SwpdoCEyzqaryb8dPlLGtlf", // Booking & Scheduling - Add-on $125
  "price_1SwpdqCEyzqaryb8MUI1razb", // Analytics - Add-on $100
  // Add-ons (standalone pricing)
  "price_1SwpdgCEyzqaryb8S6mTStEJ", // Email Campaign - Standalone $250
  "price_1SwpdiCEyzqaryb8no3iEqu0", // Cloud Storage - Standalone $175
  "price_1SwpdkCEyzqaryb8Q3UDllDR", // Client Dashboard - Standalone $400
  "price_1SwpdmCEyzqaryb856v55Tz1", // E-commerce - Standalone $500
  "price_1SwpdpCEyzqaryb889g2b8pq", // Booking & Scheduling - Standalone $200
  "price_1SwpdrCEyzqaryb8CxEu3L38", // Analytics - Standalone $175
  // App Development
  "price_1SwpdxCEyzqaryb8Oi2d6PwR", // Native App - Add-on $1,500
  "price_1SwpdxCEyzqaryb8oiaeHHXG", // Native App - Standalone $4,500
  "price_1SwpdzCEyzqaryb8N4HRAuij", // PWA - Add-on $300
  "price_1SwpdzCEyzqaryb8fBB1OGte", // PWA - Standalone $900
  // Subscriptions
  "price_1SwQQECEyzqaryb8F6NdVpEd", // Site Maintenance - $100/mo
  // /launch offer packages (2026-07-18)
  "price_1Tui8RCEyzqaryb8UeFDNbLX", // Launch-Ready Site — 50% Deposit $374.50
  "price_1Tui8SCEyzqaryb8UCrbrMUZ", // Get Found Locally - $199
  "price_1Tui8SCEyzqaryb8uuXmTBZm", // Care Plan - $99/mo (subscription)
  "price_1Tui8SCEyzqaryb8REiA9V9l", // Live Checkout Test - $1 (verification)
];

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!corsHeaders["Access-Control-Allow-Origin"]) {
    console.warn("Blocked request from unauthorized origin:", origin);
    return new Response(JSON.stringify({ error: "Unauthorized origin" }), {
      headers: { "Content-Type": "application/json" },
      status: 403,
    });
  }

  try {
    const { email, name, priceId, serviceName, isSubscription, cancelPath } = await req.json();
    // Only same-origin absolute paths may override the cancel destination.
    const safeCancelPath = typeof cancelPath === "string" && /^\/[a-z0-9\-\/]*$/i.test(cancelPath) ? cancelPath : "/services";

    // Input validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
      return new Response(
        JSON.stringify({ error: "Valid email address is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!priceId || typeof priceId !== "string" || !VALID_PRICE_IDS.includes(priceId)) {
      return new Response(
        JSON.stringify({ error: "Invalid service selected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const sanitizedEmail = email.trim().toLowerCase().slice(0, 255);
    const sanitizedName = typeof name === "string" ? name.trim().slice(0, 100) : "";
    const sanitizedServiceName = typeof serviceName === "string" ? serviceName.trim().slice(0, 100) : "";

    console.log("Creating service payment for:", maskEmail(sanitizedEmail), "Service:", sanitizedServiceName);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: sanitizedEmail, limit: 1 });
    let customerId: string | undefined;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("Found existing customer:", customerId);
    } else {
      const customer = await stripe.customers.create({
        email: sanitizedEmail,
        name: sanitizedName || undefined,
      });
      customerId = customer.id;
      console.log("Created new customer:", customerId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: isSubscription ? "subscription" : "payment",
      success_url: `${req.headers.get("origin")}/payment-success`,
      cancel_url: `${req.headers.get("origin")}${safeCancelPath}`,
      metadata: {
        type: "service",
        serviceName: sanitizedServiceName,
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
    console.error("Error creating service payment:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create payment session. Please try again." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
