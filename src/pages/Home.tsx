import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Globe, Palette, Layers } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { organizationSchema, websiteSchema } from "@/lib/seoSchemas";

import TrafficSourcePopup from "@/components/TrafficSourcePopup";
import { supabase } from "@/integrations/supabase/client";
import reRetreatsThumb from "@/assets/portfolio/re-retreats-thumb.png";
import kokopelliThumb from "@/assets/portfolio/kokopelli-thumb.png";
import vibeshiftThumb from "@/assets/portfolio/vibeshift-thumb.png";

const services = [
  { icon: Globe, title: "Web Design", desc: "Custom websites that command attention & convert." },
  { icon: Palette, title: "Branding & Identity", desc: "Logos, assets, & identity systems built to last." },
  { icon: Layers, title: "Digital Experiences", desc: "E-commerce, dashboards, booking — everything you need." },
];

const portfolioHighlights = [
  { img: reRetreatsThumb, title: "Rē Retreats", subtitle: "Women's Wellness Retreats", link: "https://re-retreats.com" },
  { img: kokopelliThumb, title: "Kokopelli Kabin", subtitle: "Modern Mountain Retreat", link: "https://kokopellikabin.com" },
  { img: vibeshiftThumb, title: "Vibe Shift → Aethyx", subtitle: "Brand Evolution", link: "https://vibe-shift.com" },
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
        title="Aethyx — Premium Web Design & Brand Studio | Rhode Island, USA"
        description="Aethyx designs and builds premium websites, brands, and digital experiences for ambitious businesses. Based in Rhode Island, serving the entire USA."
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
            <span className="block text-foreground">Build something</span>
            <span className="block text-outline">they can't ignore.</span>
          </h1>

          <p className="text-primary/90 font-display text-base md:text-lg tracking-[0.3em] uppercase mb-6">
            Built to stand out, designed to perform.
          </p>

          <p className="text-foreground/70 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            Book a consultation & let's build a digital presence that actually represents you.
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
          <p className="text-primary text-xs tracking-[0.4em] uppercase text-center mb-4">What We Build</p>
          <h2 className="font-display text-3xl md:text-5xl text-center mb-16 tracking-tight">Core Services</h2>
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

      {/* Portfolio Highlights */}
      <section className="py-24 px-6 border-t border-border/20">
        <div className="max-w-6xl mx-auto">
          <p className="text-primary text-xs tracking-[0.4em] uppercase text-center mb-4">Selected Work</p>
          <h2 className="font-display text-3xl md:text-5xl text-center mb-16 tracking-tight">Recent Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {portfolioHighlights.map((p) => (
              <a
                key={p.title}
                href={p.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl overflow-hidden border border-border/40 bg-card/40 hover:border-primary/50 hover:bg-card/60 transition-all"
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={p.img}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-display text-xl mb-1">{p.title}</h3>
                  <p className="text-muted-foreground text-sm">{p.subtitle}</p>
                </div>
              </a>
            ))}
          </div>
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
