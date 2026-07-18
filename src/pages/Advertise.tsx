import { useEffect, useRef, useState } from "react";
import { ArrowRight, BarChart3, Eye, Handshake, Loader2, Sparkles, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TrafficStats {
  views_today: number;
  views_7d: number;
  views_30d: number;
  unique_visitors_30d: number;
  total_views: number;
  top_pages: { path: string; views: number }[];
  sources: { source: string; clicks: number }[];
}

interface CloudflareStats {
  available: boolean;
  page_views_30d: number;
  unique_visitors_30d: number;
  requests_30d: number;
  since: string;
  until: string;
}

const inputClass =
  "rounded-xl bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40";

/** Animated count-up that eases toward the latest value whenever it changes. */
const CountUp = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    const start = performance.now();
    const duration = 900;
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{display.toLocaleString()}</>;
};

const placements = [
  {
    icon: Eye,
    title: "Homepage Feature",
    desc: "Your brand placed on the most-visited page of the site — a dedicated partner placement seen by every visitor who lands on Aethyx.",
  },
  {
    icon: Sparkles,
    title: "Sponsored Blog Post",
    desc: "A full article featuring your product or service, written in the Aethyx voice, permanently indexed and shared with our audience.",
  },
  {
    icon: Users,
    title: "Partner Spotlight",
    desc: "An ongoing partnership placement across the site — logo, link, and a short pitch in front of founders actively investing in their brand.",
  },
];

const whyCards = [
  {
    title: "An audience that builds",
    desc: "Aethyx visitors are founders and business owners actively investing in websites, branding, and growth — not passive scrollers.",
  },
  {
    title: "Premium context",
    desc: "Your brand appears inside a high-end design environment, next to real client work — not buried in an ad grid.",
  },
  {
    title: "Transparent numbers",
    desc: "The stats on this page are live first-party data from this site, updating in real time. What you see is exactly what you get.",
  },
];

const emptyForm = {
  company_name: "",
  contact_name: "",
  email: "",
  phone: "",
  website_url: "",
  message: "",
};

const Advertise = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<TrafficStats | null>(null);
  const [values, setValues] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      const { data } = await supabase.rpc("get_traffic_stats" as any);
      if (!cancelled && data) setStats(data as unknown as TrafficStats);
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Independently-measured stats from Cloudflare's edge (10-min server cache) —
  // section renders only when the data source is configured and healthy.
  const [cfStats, setCfStats] = useState<CloudflareStats | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.functions.invoke("cloudflare-stats").then(({ data }) => {
      if (!cancelled && data?.available) setCfStats(data as CloudflareStats);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const setVal = (key: keyof typeof emptyForm, v: string) => setValues((s) => ({ ...s, [key]: v }));

  // "Barter" CTA: pre-fill the message so barter proposals are identifiable in
  // the admin Inquiries list, then bring the visitor to the same inquiry form.
  const startBarterInquiry = () => {
    setValues((s) => ({
      ...s,
      message: s.message.trim()
        ? s.message
        : "[Barter proposal] I'd like to trade ad space / services instead of paying cash. Here's what my brand does and what I can offer in exchange: ",
    }));
    document.getElementById("inquire")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.company_name.trim() || !values.contact_name.trim() || !values.email.trim()) {
      toast({
        title: "A few fields are missing",
        description: "Please fill in your company, name, and email.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("advertiser_inquiries" as any).insert({
      company_name: values.company_name.trim().slice(0, 200),
      contact_name: values.contact_name.trim().slice(0, 200),
      email: values.email.trim().toLowerCase().slice(0, 320),
      phone: values.phone.trim() ? values.phone.trim().slice(0, 50) : null,
      website_url: values.website_url.trim() ? values.website_url.trim().slice(0, 500) : null,
      message: values.message.trim() ? values.message.trim().slice(0, 3000) : null,
    } as any);
    setSubmitting(false);

    if (error) {
      console.error("Advertiser inquiry error:", error);
      toast({ title: "Submission failed", description: "Something went wrong. Please try again.", variant: "destructive" });
      return;
    }
    setSubmitted(true);
  };

  const maxPageViews = Math.max(1, ...(stats?.top_pages ?? []).map((p) => p.views));

  const statTiles = stats
    ? [
        { label: "Views today", value: stats.views_today },
        { label: "Views · last 30 days", value: stats.views_30d },
        { label: "Unique visitors · 30 days", value: stats.unique_visitors_30d },
        { label: "All-time views", value: stats.total_views },
      ]
    : [];

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <Seo
        title="Advertise with Aethyx — Partner Ad Space"
        description="Put your brand in front of founders and business owners. Live, transparent first-party traffic stats and premium ad placements on aethyx.space."
        path="/advertise"
      />
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden pt-32 pb-20 px-6">
        <div aria-hidden className="pointer-events-none select-none absolute inset-0 flex items-center justify-center">
          <span className="font-display font-black tracking-tight text-outline opacity-[0.07] text-[22vw] leading-none whitespace-nowrap">
            PARTNER
          </span>
        </div>

        <div className="relative z-10 text-center w-full max-w-5xl mx-auto">
          <p className="text-primary text-xs md:text-sm tracking-[0.4em] uppercase mb-8">Partner with Aethyx</p>
          <h1 className="font-display font-black tracking-tight leading-[1.02] text-5xl md:text-7xl lg:text-[6rem] mb-8">
            <span className="block text-foreground">Put your brand in front of</span>
            <span className="block text-outline">an audience that builds.</span>
          </h1>
          <p className="text-foreground/70 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            Aethyx reaches founders and business owners actively investing in their digital presence.
            Ad placements are limited, hand-placed, and backed by live traffic numbers — shown right here, in real time.
          </p>
          <a
            href="#inquire"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold tracking-[0.2em] uppercase text-sm hover:bg-primary/90 transition-all hover:-translate-y-0.5"
          >
            Request Ad Space <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Live stats band */}
      <section className="py-24 px-6 border-t border-border/20">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
            </span>
            <p className="text-primary text-xs tracking-[0.4em] uppercase">Live Site Traffic</p>
          </div>
          <h2 className="font-display text-3xl md:text-5xl text-center mb-6 tracking-tight">Real numbers, updating in real time</h2>
          <p className="text-muted-foreground text-base md:text-lg text-center max-w-2xl mx-auto mb-4 leading-relaxed">
            Every figure below is first-party data measured directly on this site — no estimates, no
            third-party scripts. It refreshes automatically while you're reading this.
          </p>
          <p className="text-muted-foreground/70 text-sm text-center max-w-2xl mx-auto mb-16">
            Counting began when this tracking launched on <span className="text-foreground/80">July 12, 2026</span> —
            these totals reflect traffic since that date only, so they'll only go up from here.
          </p>

          {stats ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {statTiles.map((tile) => (
                  <div
                    key={tile.label}
                    className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-8 text-center hover:border-primary/50 transition-all"
                  >
                    <p className="font-display font-black text-4xl md:text-5xl text-primary mb-3">
                      <CountUp value={tile.value} />
                    </p>
                    <p className="text-muted-foreground text-xs tracking-[0.2em] uppercase">{tile.label}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-8 max-w-3xl mx-auto">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <h3 className="font-display text-xl">Most-visited pages · 30 days</h3>
                </div>
                {stats.top_pages.length ? (
                  <div className="space-y-4">
                    {stats.top_pages.map((p) => (
                      <div key={p.path}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-foreground/80 truncate mr-4">{p.path === "/" ? "Home" : p.path}</span>
                          <span className="text-muted-foreground shrink-0">{p.views.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/70 transition-all duration-700"
                            style={{ width: `${(p.views / maxPageViews) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Collecting data — check back soon.</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      </section>

      {/* Independently verified stats (Cloudflare edge measurement) */}
      {cfStats && (
        <section className="py-24 px-6 border-t border-border/20">
          <div className="max-w-6xl mx-auto">
            <p className="text-primary text-xs tracking-[0.4em] uppercase text-center mb-4">Independently Measured</p>
            <h2 className="font-display text-3xl md:text-5xl text-center mb-6 tracking-tight">
              Don't take our word for it
            </h2>
            <p className="text-muted-foreground text-base md:text-lg text-center max-w-2xl mx-auto mb-16 leading-relaxed">
              The numbers above are our own measurement. These are Cloudflare's — recorded at their
              global network edge before traffic ever reaches this site, so nothing in our code can
              inflate them. Last 30 days.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: "Page views · 30 days", value: cfStats.page_views_30d },
                { label: "Unique visitors · 30 days", value: cfStats.unique_visitors_30d },
                { label: "Total requests · 30 days", value: cfStats.requests_30d },
              ].map((tile) => (
                <div
                  key={tile.label}
                  className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-8 text-center hover:border-primary/50 transition-all"
                >
                  <p className="font-display font-black text-4xl md:text-5xl text-primary mb-3">
                    <CountUp value={tile.value} />
                  </p>
                  <p className="text-muted-foreground text-xs tracking-[0.2em] uppercase">{tile.label}</p>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground/70 text-xs text-center mt-6">
              Source: Cloudflare network analytics for aethyx.space · updated every 10 minutes
            </p>
          </div>
        </section>
      )}

      {/* Why advertise */}
      <section className="py-24 px-6 border-t border-border/20">
        <div className="max-w-6xl mx-auto">
          <p className="text-primary text-xs tracking-[0.4em] uppercase text-center mb-4">Why Aethyx</p>
          <h2 className="font-display text-3xl md:text-5xl text-center mb-16 tracking-tight">Fewer ads. Better company.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {whyCards.map((c) => (
              <div key={c.title} className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-8 text-center">
                <h3 className="font-display text-2xl mb-3">{c.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Placements */}
      <section className="py-24 px-6 border-t border-border/20">
        <div className="max-w-6xl mx-auto">
          <p className="text-primary text-xs tracking-[0.4em] uppercase text-center mb-4">Placements</p>
          <h2 className="font-display text-3xl md:text-5xl text-center mb-6 tracking-tight">Three ways to show up</h2>
          <p className="text-muted-foreground text-base md:text-lg text-center max-w-2xl mx-auto mb-16 leading-relaxed">
            Placements are limited and reviewed for fit — your brand has to make sense next to ours.
            Pricing is custom to placement and duration; tell us what you're after below.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {placements.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-8 text-center group hover:border-primary/50 hover:bg-card/60 transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                  <p.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-2xl mb-3">{p.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Barter */}
      <section className="py-24 px-6 border-t border-border/20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Handshake className="h-6 w-6 text-primary" />
          </div>
          <p className="text-primary text-xs tracking-[0.4em] uppercase mb-4">Trade With Us</p>
          <h2 className="font-display text-3xl md:text-5xl mb-6 tracking-tight">
            Interested in bartering for ad space?
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Cash isn't the only way in. If you're in a related field with no direct conflicts — and
            our audiences would genuinely benefit from each other — I'm open to trading placements:
            your ad space for mine, or space in exchange for products and services. Pitch me.
          </p>
          <Button
            onClick={startBarterInquiry}
            size="lg"
            className="rounded-full px-8 tracking-widest uppercase text-sm"
          >
            Submit a barter inquiry
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-muted-foreground/70 text-xs mt-4">
            Tell me about your brand and what you'd offer in trade — every proposal gets a real look.
          </p>
        </div>
      </section>

      {/* Inquiry form */}
      <section id="inquire" className="py-24 px-6 border-t border-border/20">
        <div className="max-w-2xl mx-auto">
          <p className="text-primary text-xs tracking-[0.4em] uppercase text-center mb-4">Get In Front</p>
          <h2 className="font-display text-3xl md:text-5xl text-center mb-6 tracking-tight">Request ad space</h2>
          <p className="text-muted-foreground text-base text-center max-w-xl mx-auto mb-12 leading-relaxed">
            Tell us about your brand and what you'd like to promote. We'll follow up with
            availability, placement options, and pricing.
          </p>

          {submitted ? (
            <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm px-6 py-12 text-center">
              <p className="text-lg font-medium mb-2">Inquiry received</p>
              <p className="text-sm text-muted-foreground">
                Thanks — we'll review your brand and follow up by email with placement options and pricing.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-8 md:p-10 space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <Label htmlFor="company_name">Company</Label>
                  <Input id="company_name" value={values.company_name} onChange={(e) => setVal("company_name", e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <Label htmlFor="contact_name">Your name</Label>
                  <Input id="contact_name" value={values.contact_name} onChange={(e) => setVal("contact_name", e.target.value)} className={inputClass} required />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={values.email} onChange={(e) => setVal("email", e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <Label htmlFor="phone">Phone <span className="text-muted-foreground/50 text-xs">(optional)</span></Label>
                  <Input id="phone" type="tel" value={values.phone} onChange={(e) => setVal("phone", e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <Label htmlFor="website_url">Website <span className="text-muted-foreground/50 text-xs">(optional)</span></Label>
                <Input id="website_url" type="url" placeholder="https://" value={values.website_url} onChange={(e) => setVal("website_url", e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="message">What would you like to promote?</Label>
                <Textarea
                  id="message"
                  rows={4}
                  value={values.message}
                  onChange={(e) => setVal("message", e.target.value)}
                  className={inputClass}
                  placeholder="Your product or service, the placement you're interested in, and any timing…"
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full rounded-full tracking-[0.2em] uppercase">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Send Inquiry
              </Button>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Advertise;
