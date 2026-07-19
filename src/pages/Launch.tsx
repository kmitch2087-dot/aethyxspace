import { useState } from "react";
import { ArrowRight, Check, Loader2, Rocket, Search, ShieldCheck, Video, CreditCard, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ── SWAP ME ─────────────────────────────────────────────────────────────────
// Replace with Kristin's real scheduling link (Calendly or the consultation
// booking flow) before promoting this page.
const CALENDLY_URL = "https://calendly.com/REPLACE-ME/15min-teardown";
// ────────────────────────────────────────────────────────────────────────────

// Live Stripe price IDs (created 2026-07-18, allow-listed in create-service-payment)
const PACKAGES = [
  {
    key: "launch_ready_site",
    name: "Launch-Ready Site",
    price: "$749",
    priceNote: "50% deposit ($374.50) to start",
    priceId: "price_1Tui8RCEyzqaryb8UeFDNbLX",
    isSubscription: false,
    cta: "Start my site",
    icon: Rocket,
    features: [
      "Up to 5 custom pages",
      "Mobile-ready design",
      "Contact form + click-to-call",
      "Basic SEO",
      "Google Business Profile setup",
      "Live in 7 days",
    ],
    highlight: true,
  },
  {
    key: "get_found_locally",
    name: "Get Found Locally",
    price: "$199",
    priceNote: "one-time",
    priceId: "price_1Tui8SCEyzqaryb8UCrbrMUZ",
    isSubscription: false,
    cta: "Get me found",
    icon: Search,
    features: [
      "Google Business Profile setup & optimization",
      "Consistent listings",
      "Photos, services & posts",
      "Done in 3 days",
    ],
    highlight: false,
  },
  {
    key: "care_plan",
    name: "Care Plan",
    price: "$99/mo",
    priceNote: "cancel anytime",
    priceId: "price_1Tui8SCEyzqaryb8uuXmTBZm",
    isSubscription: true,
    cta: "Add a care plan",
    icon: ShieldCheck,
    features: [
      "Hosting & security checks",
      "Monthly edits",
      "Monthly performance report",
    ],
    highlight: false,
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ga = (event: string, params?: Record<string, any>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gtag = (window as any).gtag;
  if (typeof gtag === "function") gtag("event", event, params || {});
};

const emptyLead = { name: "", email: "", phone: "", business_name: "", website_url: "", need: "" };

const Launch = () => {
  const { toast } = useToast();
  const [payingKey, setPayingKey] = useState<string | null>(null);
  const [checkoutFor, setCheckoutFor] = useState<typeof PACKAGES[number] | null>(null);
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [checkoutName, setCheckoutName] = useState("");
  const [lead, setLead] = useState(emptyLead);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  const startCheckout = (pkg: typeof PACKAGES[number]) => {
    ga("package_click", { package: pkg.key });
    if (pkg.key === "launch_ready_site") ga("deposit_click", { package: pkg.key });
    setCheckoutFor(pkg);
  };

  const launchStripe = async () => {
    if (!checkoutFor) return;
    const email = checkoutEmail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast({ title: "Enter a valid email", description: "Stripe needs it for your receipt.", variant: "destructive" });
      return;
    }
    setPayingKey(checkoutFor.key);
    const { data, error } = await supabase.functions.invoke("create-service-payment", {
      body: {
        email,
        name: checkoutName.trim(),
        priceId: checkoutFor.priceId,
        serviceName: checkoutFor.name,
        isSubscription: checkoutFor.isSubscription,
        cancelPath: "/launch",
      },
    });
    setPayingKey(null);
    if (error || !data?.url) {
      toast({ title: "Couldn't start checkout", description: "Please try again or use the form below.", variant: "destructive" });
      return;
    }
    window.location.assign(data.url);
  };

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead.name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email.trim())) {
      toast({ title: "Name and a valid email are required", variant: "destructive" });
      return;
    }
    setLeadSubmitting(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("offer_leads").insert({
      name: lead.name.trim().slice(0, 200),
      email: lead.email.trim().toLowerCase().slice(0, 320),
      phone: lead.phone.trim() ? lead.phone.trim().slice(0, 50) : null,
      business_name: lead.business_name.trim() ? lead.business_name.trim().slice(0, 200) : null,
      website_url: lead.website_url.trim() ? lead.website_url.trim().slice(0, 500) : null,
      need: lead.need.trim() ? lead.need.trim().slice(0, 2000) : null,
    });
    if (error) {
      setLeadSubmitting(false);
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
      return;
    }
    // Notify Kristin — fire and forget; the lead row is already safely stored.
    supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "offer-lead-notification",
        templateData: {
          name: lead.name.trim(),
          email: lead.email.trim(),
          phone: lead.phone.trim(),
          businessName: lead.business_name.trim(),
          websiteUrl: lead.website_url.trim(),
          need: lead.need.trim(),
        },
      },
    }).catch(() => {});
    ga("form_submit", { form: "launch_lead" });
    setLeadSubmitting(false);
    setLeadSubmitted(true);
  };

  const bookTeardown = () => {
    ga("booking_click", { source: "launch_page" });
    window.open(CALENDLY_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <Seo
        title="Launch-Ready Websites — Live in 7 Days, Fixed Price | Aethyx"
        description="A custom website live in 7 days — fixed price, fixed timeline, no agency runaround. Launch-ready sites from $749, local SEO setup, and monthly care plans."
        path="/launch"
      />
      <Navbar />

      {/* HERO */}
      <section className="relative pt-40 pb-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <p className="text-primary text-xs tracking-[0.4em] uppercase mb-6">Fixed Price · Fixed Timeline</p>
          <h1 className="font-display font-black tracking-tight leading-[1.05] text-4xl md:text-6xl lg:text-7xl mb-8">
            A website that's live in 7 days — <span className="text-outline">without the chaos.</span>
          </h1>
          <p className="text-foreground/70 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Custom design, built for your business, ready to bring in customers.
            Fixed price. Fixed timeline. No agency runaround.
          </p>
          <Button
            onClick={bookTeardown}
            size="lg"
            className="rounded-full px-8 h-14 text-sm tracking-[0.2em] uppercase font-semibold"
          >
            <Video className="h-4 w-4 mr-2" />
            Book a free 15-min website teardown
          </Button>
        </div>
      </section>

      {/* PACKAGES */}
      <section className="py-24 px-6 border-t border-border/20">
        <div className="max-w-6xl mx-auto">
          <p className="text-primary text-xs tracking-[0.4em] uppercase text-center mb-4">Pick Your Package</p>
          <h2 className="font-display text-3xl md:text-5xl text-center mb-16 tracking-tight">Three ways to get moving</h2>
          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.key}
                className={`rounded-2xl border p-8 flex flex-col backdrop-blur-sm transition-all ${
                  pkg.highlight
                    ? "border-primary/60 bg-primary/5 shadow-[0_0_40px_-12px] shadow-primary/30"
                    : "border-border/40 bg-card/40 hover:border-primary/40"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                  <pkg.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display text-2xl mb-1">{pkg.name}</h3>
                <p className="font-display font-black text-4xl text-primary mb-1">{pkg.price}</p>
                <p className="text-muted-foreground text-xs mb-6">{pkg.priceNote}</p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => startCheckout(pkg)}
                  variant={pkg.highlight ? "default" : "outline"}
                  className="w-full rounded-full tracking-widest uppercase text-xs h-11"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {pkg.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6 border-t border-border/20">
        <div className="max-w-4xl mx-auto">
          <p className="text-primary text-xs tracking-[0.4em] uppercase text-center mb-4">How It Works</p>
          <h2 className="font-display text-3xl md:text-5xl text-center mb-16 tracking-tight">Three steps, no surprises</h2>
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            {[
              { n: "1", title: "Free teardown video", desc: "Book 15 minutes. I record a walkthrough of what's costing your current site customers — yours to keep either way." },
              { n: "2", title: "Deposit & kickoff", desc: "50% deposit locks your slot. We gather your content and brand in one focused kickoff." },
              { n: "3", title: "Launch in 7 days", desc: "Your site goes live — mobile-ready, findable on Google, built to bring in customers." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-8">
                <p className="font-display font-black text-5xl text-primary/30 mb-4">{s.n}</p>
                <h3 className="font-display text-xl mb-3">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS — placeholders to fill with real client quotes */}
      <section className="py-24 px-6 border-t border-border/20">
        <div className="max-w-6xl mx-auto">
          <p className="text-primary text-xs tracking-[0.4em] uppercase text-center mb-4">What Clients Say</p>
          <h2 className="font-display text-3xl md:text-5xl text-center mb-16 tracking-tight">Real businesses, real results</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-dashed border-border/40 bg-card/30 p-8 flex flex-col items-center justify-center text-center min-h-[220px]">
                <Sparkles className="h-5 w-5 text-primary/40 mb-4" />
                <p className="text-muted-foreground text-sm italic">Testimonial placeholder {i} — swap in a real client quote, name & business.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LEAD FORM */}
      <section id="lead" className="py-24 px-6 border-t border-border/20">
        <div className="max-w-2xl mx-auto">
          <p className="text-primary text-xs tracking-[0.4em] uppercase text-center mb-4">Not Sure Which Fits?</p>
          <h2 className="font-display text-3xl md:text-5xl text-center mb-6 tracking-tight">Tell me what you need</h2>
          <p className="text-muted-foreground text-center max-w-xl mx-auto mb-12">
            Share a few details and I'll come back with a straight answer — which package fits, or whether you need something custom.
          </p>
          {leadSubmitted ? (
            <div className="rounded-2xl border border-primary/40 bg-primary/5 px-6 py-12 text-center">
              <p className="text-lg font-medium mb-2">Got it — thank you!</p>
              <p className="text-sm text-muted-foreground">
                I personally read every one of these. You'll hear back from me within one business day.
              </p>
            </div>
          ) : (
            <form onSubmit={submitLead} className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-8 md:p-10 space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <Label htmlFor="lead_name">Name *</Label>
                  <Input id="lead_name" value={lead.name} onChange={(e) => setLead((s) => ({ ...s, name: e.target.value }))} required />
                </div>
                <div>
                  <Label htmlFor="lead_email">Email *</Label>
                  <Input id="lead_email" type="email" value={lead.email} onChange={(e) => setLead((s) => ({ ...s, email: e.target.value }))} required />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <Label htmlFor="lead_phone">Phone</Label>
                  <Input id="lead_phone" type="tel" value={lead.phone} onChange={(e) => setLead((s) => ({ ...s, phone: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="lead_biz">Business name</Label>
                  <Input id="lead_biz" value={lead.business_name} onChange={(e) => setLead((s) => ({ ...s, business_name: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label htmlFor="lead_url">Current website (if any)</Label>
                <Input id="lead_url" placeholder="https://" value={lead.website_url} onChange={(e) => setLead((s) => ({ ...s, website_url: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="lead_need">What do you need?</Label>
                <Textarea id="lead_need" rows={4} placeholder="New site, a refresh, get found on Google…" value={lead.need} onChange={(e) => setLead((s) => ({ ...s, need: e.target.value }))} />
              </div>
              <Button type="submit" disabled={leadSubmitting} className="w-full rounded-full tracking-widest uppercase text-sm h-12">
                {leadSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                Send it over
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 px-6 border-t border-border/20 text-center">
        <h2 className="font-display text-3xl md:text-5xl mb-6 tracking-tight">Your customers are searching right now.</h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
          In 7 days they could be finding you. Start with the free teardown — worst case, you walk away with a punch list.
        </p>
        <Button onClick={bookTeardown} size="lg" className="rounded-full px-8 h-14 text-sm tracking-[0.2em] uppercase font-semibold">
          <Video className="h-4 w-4 mr-2" />
          Book a free 15-min website teardown
        </Button>
      </section>

      <Footer />

      {/* Email capture before Stripe redirect */}
      {checkoutFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setCheckoutFor(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border/40 bg-background p-8" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl mb-1">{checkoutFor.name} — {checkoutFor.price}</h3>
            <p className="text-muted-foreground text-sm mb-6">{checkoutFor.priceNote}. You'll finish payment securely on Stripe.</p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="co_name">Name</Label>
                <Input id="co_name" value={checkoutName} onChange={(e) => setCheckoutName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="co_email">Email *</Label>
                <Input id="co_email" type="email" value={checkoutEmail} onChange={(e) => setCheckoutEmail(e.target.value)} required />
              </div>
              <Button onClick={launchStripe} disabled={payingKey !== null} className="w-full rounded-full h-11 tracking-widest uppercase text-xs">
                {payingKey ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                Continue to secure checkout
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Launch;
