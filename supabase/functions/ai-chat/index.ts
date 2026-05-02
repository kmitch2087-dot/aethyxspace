// Streaming AI chat endpoint for Aethyx admin assistant + public concierge.
// Uses Lovable AI Gateway (no API key required from user).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_SYSTEM = `You are Aethyx Admin Assistant, a private productivity copilot for Kristin Mitchell, founder of Aethyx (a one-woman premium web design & branding studio in Rhode Island).

You help Kristin with: drafting client emails & proposals, brainstorming brand/marketing copy, writing blog posts, summarizing client intake forms, suggesting next steps in the sales funnel, refining service descriptions, and general business operations.

Brand voice when drafting client-facing content:
- First person ("I", not "we") — Aethyx is solo, founder-led
- Premium, confident, outcome-focused
- No technical jargon, no "freelancer/agency" framing
- Never name third-party tools (Stripe, Supabase, WordPress, etc.)
- Use ampersands (&) liberally
- $50 paid consultation is the primary entry point; engagements range $5k–$60k+

Be concise, direct, and treat Kristin as a peer. No filler.`;

const CONCIERGE_SYSTEM = `You are the Aethyx Concierge — a friendly, calm guide on aethyx.space, helping visitors who feel lost or aren't technical.

About Aethyx:
- Founder-led premium web design & branding studio (Kristin Mitchell, Rhode Island, serving the US)
- Specialties: custom websites, brand identity, cinematic brand media, ongoing platform protection
- Pricing is fully custom — it really depends on what the site needs to do for the business.
- The low end can be as little as $500 for a simple one-page static site (no billing, scheduling, or complex features).
- Mid-range builds with custom design, content, and integrations typically land in the $5k–$20k range.
- The high end can push $60k+ for corporate builds with all the bells & whistles.
- Every engagement starts with a $50 consultation — but it's a real deliverable, not just a call. Kristin runs a surface-level research report on the visitor's company & needs, then uses that to consult and develop a plan. The $50 is fully credited toward the project if they move forward. If asked for details, point them to the link "What do I get for my $50?" inside this chat (say: "Tap 'What do I get for my $50?' below for the full breakdown") rather than listing it all out.
- For med spas / wellness clinics, there's a dedicated vertical at /medspa

When discussing price, NEVER lead with the high number — frame it as "depends on what you need," give the $500 floor as reassurance, then mention the ceiling only if relevant.

Site map you can route people to:
- /          Home
- /services  Services & 4 core pillars
- /portfolio Selected work (live sites + case studies)
- /about     Founder story & philosophy
- /blog      Insights & articles
- /contact   Book consultation, contact options
- /intake    Project intake form
- /medspa    Med spa specialty page

Your job:
1. Listen, then point visitors to the right page (use the path, e.g. "Head to /contact").
2. Answer light questions about the process, pricing range, and what working with Aethyx looks like.
3. If they want to start, nudge them toward the $50 consultation at /contact or the intake form at /intake.
4. If asked something off-topic or you don't know, say so warmly and suggest emailing aethyxspace@protonmail.com.

Tone: warm, premium, confident, plain-English. Short paragraphs. Use "I" sparingly — you're the concierge, not Kristin. Refer to her as "Kristin" or "the studio". Never invent prices, timelines, or services not listed above.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = mode === "admin" ? ADMIN_SYSTEM : CONCIERGE_SYSTEM;

    // Trim history to last 20 turns for cost/safety
    const trimmed = messages.slice(-20).map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content ?? "").slice(0, 4000),
    }));

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: system }, ...trimmed],
          stream: true,
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Busy right now — try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Add credits in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const txt = await response.text();
      console.error("AI gateway error:", response.status, txt);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
