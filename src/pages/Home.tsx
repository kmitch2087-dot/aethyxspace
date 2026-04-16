import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Globe, Palette, Layers } from "lucide-react";
import StarfieldBackground from "@/components/StarfieldBackground";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import TrafficSourcePopup from "@/components/TrafficSourcePopup";
import { supabase } from "@/integrations/supabase/client";
import aethyxCalligraphy from "@/assets/aethyx-calligraphy-updated.png";
import elevateEvolve from "@/assets/elevate-evolve.png";
import reRetreatsThumb from "@/assets/portfolio/re-retreats-thumb.png";
import kokopelliThumb from "@/assets/portfolio/kokopelli-thumb.png";
import vibeshiftThumb from "@/assets/portfolio/vibeshift-thumb.png";

const services = [
  { icon: Globe, title: "Web Design", desc: "Custom websites that command attention and convert." },
  { icon: Palette, title: "Branding & Identity", desc: "Logos, assets, and identity systems built to last." },
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
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="relative z-10 text-center w-full px-2 pt-20">
          <div className="px-2 py-10 max-w-7xl mx-auto">
            {/* Logo with starfield backdrop blending into gold */}
            <div className="relative mx-auto mb-6">
              <div className="relative overflow-visible" style={{ padding: '4rem 4rem' }}>
                <div className="absolute inset-0 bg-[#0a0a14] z-0" style={{
                  maskImage: 'radial-gradient(ellipse 70% 60% at center, black 25%, rgba(0,0,0,0.3) 55%, transparent 85%)',
                  WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at center, black 25%, rgba(0,0,0,0.3) 55%, transparent 85%)',
                }}>
                  <StarfieldBackground />
                </div>
                <img src={aethyxCalligraphy} alt="Aethyx" className="relative z-10 w-full" />
              </div>
            </div>
            
            <p className="font-display text-lg md:text-xl lg:text-2xl tracking-widest uppercase text-[#3a2a10]/80 mb-6">
              Unapologetically
            </p>
            <p className="text-lg md:text-xl text-[#4a3a1a]/70 max-w-2xl mx-auto mb-10">
              Premium web design & digital experiences for ambitious brands.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#1a1a2e] text-white font-semibold tracking-wide uppercase text-sm hover:bg-[#1a1a2e]/90 transition-all hover:-translate-y-0.5"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-[#4a3a1a]/50 text-sm mt-6 tracking-widest uppercase">
              Woman Owned • RI-based • Serving The Entire USA
            </p>

            {/* Traffic source buttons */}
            <p className="text-[#4a3a1a]/40 text-xs mt-6 tracking-wider uppercase">How did you find us?</p>
            <div className="flex flex-wrap justify-center gap-3 mt-3">
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
                  className="px-5 py-2 rounded-full border border-[#4a3a1a]/30 text-[#4a3a1a]/60 text-xs tracking-widest uppercase hover:border-[#1a1a2e]/50 hover:text-[#1a1a2e] transition-all"
                >
                  {btn.label}
                </button>
              ))}
            </div>
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
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl text-center mb-16 text-[#2a1f0e]">What We Build</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((s) => (
              <Link
                key={s.title}
                to="/services"
                className="rounded-2xl border border-[#8a7a5a]/20 bg-white/30 backdrop-blur-sm p-8 text-center group hover:bg-white/50 hover:shadow-lg transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-[#1a1a2e]/10 flex items-center justify-center mx-auto mb-6">
                  <s.icon className="h-6 w-6 text-[#2a1f0e]" />
                </div>
                <h3 className="font-display text-2xl mb-3 text-[#2a1f0e]">{s.title}</h3>
                <p className="text-[#4a3a1a]/70 text-sm">{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Highlights */}
      <section className="py-24 px-6 border-t border-[#8a7a5a]/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl text-center mb-16 text-[#2a1f0e]">Selected Work</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {portfolioHighlights.map((p) => (
              <a
                key={p.title}
                href={p.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl overflow-hidden border border-[#8a7a5a]/20 bg-white/30 hover:bg-white/50 hover:shadow-lg transition-all"
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={p.img}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-display text-xl mb-1 text-[#2a1f0e]">{p.title}</h3>
                  <p className="text-[#4a3a1a]/70 text-sm">{p.subtitle}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-[#8a7a5a]/20 text-center">
        <h2 className="font-display text-3xl md:text-5xl mb-6 text-[#2a1f0e]">Ready to Shift?</h2>
        <p className="text-[#4a3a1a]/70 text-lg max-w-xl mx-auto mb-10">
          Book a consultation and let's build something that actually represents you.
        </p>
        <Link
          to="/contact"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#1a1a2e] text-white font-semibold tracking-wide uppercase text-sm hover:bg-[#1a1a2e]/90 transition-all hover:-translate-y-0.5"
        >
          Book a Consultation <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
