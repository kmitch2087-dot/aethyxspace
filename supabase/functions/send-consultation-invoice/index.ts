import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const allowedOrigins = [
  "https://aethyxspace.lovable.app",
  "https://aethyx.space",
  "http://localhost:8080",
  "http://localhost:5173",
];

const getCorsHeaders = (origin: string | null) => {
  const isAllowed =
    origin &&
    (allowedOrigins.includes(origin) ||
      origin.endsWith(".lovable.app") ||
      origin.endsWith(".lovableproject.com"));
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
};

const CONSULTATION_PRICE_ID = "price_1SwQ4mCEyzqaryb8RIoTHGwM";

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!corsHeaders["Access-Control-Allow-Origin"]) {
    return new Response(JSON.stringify({ error: "Unauthorized origin" }), {
      headers: { "Content-Type": "application/json" },
      status: 403,
    });
  }

  try {
    // Validate caller is admin
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Auth required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const { email, name, intakeId } = await req.json();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(String(email).trim())) {
      return new Response(JSON.stringify({ error: "Valid email required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const cleanEmail = String(email).trim().toLowerCase().slice(0, 320);
    const cleanName = typeof name === "string" ? name.trim().slice(0, 200) : "";

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create customer
    const customers = await stripe.customers.list({ email: cleanEmail, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: cleanEmail,
        name: cleanName || undefined,
      });
      customerId = customer.id;
    }

    // Create draft invoice with the consultation price
    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: "send_invoice",
      days_until_due: 7,
      description: "Aethyx Strategy Consultation",
      metadata: {
        type: "consultation_invoice",
        intake_id: intakeId || "",
      },
    });

    await stripe.invoiceItems.create({
      customer: customerId,
      price: CONSULTATION_PRICE_ID,
      invoice: invoice.id,
    });

    // Finalize and send
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
    await stripe.invoices.sendInvoice(finalized.id);

    return new Response(
      JSON.stringify({
        success: true,
        invoiceId: finalized.id,
        hostedUrl: finalized.hosted_invoice_url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error: unknown) {
    console.error("Invoice error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to send invoice",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
