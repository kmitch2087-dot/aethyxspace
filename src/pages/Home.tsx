import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Globe, Palette, Layers } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { organizationSchema, websiteSchema } from "@/lib/seoSchemas";

import TrafficSourcePopup from "@/components/TrafficSourcePopup";
import { supabase } from "@/integrations/supabase/client";
import aethyxLogo from "@/assets/aethyx-calligraphy-updated.png";

const services = [
  { icon: Globe, title: "Web Design & Development", desc: "Custom websites and digital ecosystems engineered for SEO architecture, speed, and conversion." },
  { icon: Palette, title: "Brand Identity", desc: "Logos, visual systems, and brand guidelines built to position you as the premium choice in your market." },
  { icon: Layers, title: "Digital Experiences", desc: "E-commerce, client portals, booking systems, and AI-ready interfaces — built to scale with you." },
];




const trafficButtons = [
  { label: "TikTok", source: "tiktok" as const },
  { label: "Instagram", source: "instagram" as const },
  { label: "Facebook", source: "facebook" as const },
  { label: "Other", source: "other" as const },
];

const Home = () => {
  const navigate = useNavigate();
  const [otherOpen, setOtherOpen] = useState(false);

  const handleTrafficClick = async (source: "tiktok" | "instagram" | "facebook" | "other", otherDetails?: string) => {
    await supabase.from("traffic_clicks").insert({
      source,
      other_details: otherDetails || null,
    } as any);
    navigate("/contact");
  };

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <Seo
        title="Aethyx — Premium Web Design & Branding | Rhode Island"
        description="Premium web design, brand identity, and SEO architecture for ambitious businesses. Founder-led studio in Rhode Island, serving the USA. Book a consultation."
        path="/"
        jsonLd={[organizationSchema, websiteSchema]}
      />
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-32 pb-24 px-6">
        {/* Ghost wordmark */}
        <div
          aria-hidden
          className="pointer-events-none select-none absolute inset-0 flex items-center justify-center"
        >
          <span className="font-display font-black tracking-tight text-outline opacity-[0.07] text-[28vw] leading-none whitespace-nowrap">
            AETHYX
          </span>
        </div>

        <div className="relative z-10 text-center w-full max-w-5xl mx-auto">
          <p className="text-primary text-xs md:text-sm tracking-[0.4em] uppercase mb-8">
            Ready to Shift?
          </p>

          <h1 className="font-display font-black tracking-tight leading-[1.02] text-5xl md:text-7xl lg:text-[6.5rem] mb-8">
            <span className="block text-foreground">Premium web design</span>
            <span className="block text-outline">they can't ignore.</span>
          </h1>

          <p className="text-primary/90 font-display text-base md:text-lg tracking-[0.3em] uppercase mb-6">
            Web design, brand identity &amp; SEO architecture
          </p>

          <p className="text-foreground/70 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            Aethyx is a Rhode Island web design and branding studio building custom websites, brand systems, and digital ecosystems for ambitious businesses across the USA. Book a consultation and work directly with the founder, start to finish.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold tracking-[0.2em] uppercase text-sm hover:bg-primary/90 transition-all hover:-translate-y-0.5"
            >
              Book a Consultation <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-foreground/30 text-foreground font-semibold tracking-[0.2em] uppercase text-sm hover:border-foreground/60 transition-all"
            >
              View Services
            </Link>
          </div>

          <p className="text-foreground/40 text-xs tracking-[0.3em] uppercase">
            Woman Owned • RI-based • Serving The Entire USA
          </p>

          {/* Traffic source buttons */}
          <p className="text-foreground/40 text-xs mt-10 tracking-[0.25em] uppercase">How did you find us?</p>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {trafficButtons.map((btn) => (
              <button
                key={btn.source}
                onClick={() => {
                  if (btn.source === "other") {
                    setOtherOpen(true);
                  } else {
                    handleTrafficClick(btn.source);
                  }
                }}
                className="px-5 py-2 rounded-full border border-foreground/20 text-foreground/60 text-xs tracking-[0.25em] uppercase hover:border-primary/60 hover:text-primary transition-all"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <TrafficSourcePopup
        open={otherOpen}
        onClose={() => setOtherOpen(false)}
        onSubmit={(details) => {
          setOtherOpen(false);
          handleTrafficClick("other", details);
        }}
      />

      {/* Services Teaser */}
      <section className="py-24 px-6 border-t border-border/20">
        <div className="max-w-6xl mx-auto">
          <p className="text-primary text-xs tracking-[0.4em] uppercase text-center mb-4">What I Build</p>
          <h2 className="font-display text-3xl md:text-5xl text-center mb-6 tracking-tight">Web design, branding &amp; digital ecosystems</h2>
          <p className="text-muted-foreground text-base md:text-lg text-center max-w-2xl mx-auto mb-16 leading-relaxed">
            Three core practices, one strategic engagement. Every Aethyx project pairs premium visual design with the SEO architecture and AI optimization that modern search demands.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {services.map((s) => (
              <Link
                key={s.title}
                to="/services"
                className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-8 text-center group hover:border-primary/50 hover:bg-card/60 transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-2xl mb-3">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Who / What / Why — indexable, founder-led positioning */}
      <section className="py-24 px-6 border-t border-border/20">
        <div className="max-w-4xl mx-auto">
          <p className="text-primary text-xs tracking-[0.4em] uppercase text-center mb-4">The Studio</p>
          <h2 className="font-display text-3xl md:text-5xl text-center mb-10 tracking-tight">A founder-led studio for businesses ready to scale</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 text-foreground/80">
            <div>
              <h3 className="font-display text-xl mb-3 text-foreground">Who Aethyx helps</h3>
              <p className="leading-relaxed text-base">
                Founders, small businesses, and established brands who have outgrown a templated website and need a serious digital presence. Clients come to Aethyx for a Rhode Island web design partner who treats branding, SEO, and conversion as one system — not three disconnected projects.
              </p>
            </div>
            <div>
              <h3 className="font-display text-xl mb-3 text-foreground">What I offer</h3>
              <p className="leading-relaxed text-base">
                Custom web design and development, complete brand identity systems, SEO architecture, AI search optimization, and full digital ecosystems including e-commerce, booking, and client portals. Every deliverable is engineered to perform on Google, in AI search, and in the real world.
              </p>
            </div>
            <div>
              <h3 className="font-display text-xl mb-3 text-foreground">What makes the approach different</h3>
              <p className="leading-relaxed text-base">
                You work directly with the founder from first call to final launch. No account managers, no handoffs, no junior designers learning on your brand. Pricing is custom because real strategy is custom — and every project starts with a focused $50 consultation, not a templated quote.
              </p>
            </div>
            <div>
              <h3 className="font-display text-xl mb-3 text-foreground">Why book a consultation</h3>
              <p className="leading-relaxed text-base">
                The consultation is where strategy starts. In one session you'll get a clear read on your brand positioning, the gaps in your current site, and the highest-leverage moves to grow online. Whether you're rebranding, redesigning, or building from scratch, this is the fastest way to know what your business actually needs.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold tracking-[0.2em] uppercase text-sm hover:bg-primary/90 transition-all hover:-translate-y-0.5"
            >
              Book a Consultation <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Portfolio CTA */}
      <section className="py-24 px-6 border-t border-border/20">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-primary text-xs tracking-[0.4em] uppercase mb-8">Selected Work</p>
          <Link
            to="/portfolio"
            className="group inline-block transition-transform duration-500 hover:scale-[1.03]"
            aria-label="View the Aethyx portfolio"
          >
            <img
              src={aethyxLogo}
              alt="Aethyx"
              className="mx-auto w-full max-w-md md:max-w-lg drop-shadow-[0_0_40px_hsl(var(--primary)/0.25)] group-hover:drop-shadow-[0_0_60px_hsl(var(--primary)/0.45)] transition-all duration-500"
            />
          </Link>
          <p className="text-muted-foreground text-base md:text-lg mt-10 mb-8 max-w-xl mx-auto">
            Real projects. Real results. Every site built with intention — by me.
          </p>
          <Link
            to="/portfolio"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-primary/40 text-primary font-semibold tracking-[0.2em] uppercase text-sm hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all hover:-translate-y-0.5"
          >
            View the Portfolio →
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-border/20 text-center">
        <p className="text-primary text-xs tracking-[0.4em] uppercase mb-4">Ready to Shift?</p>
        <h2 className="font-display text-3xl md:text-5xl mb-6 tracking-tight">Let's build something they can't ignore.</h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
          Book a consultation & let's build a digital presence that actually represents you.
        </p>
        <Link
          to="/contact"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold tracking-[0.2em] uppercase text-sm hover:bg-primary/90 transition-all hover:-translate-y-0.5"
        >
          Book a Consultation <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
