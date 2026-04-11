import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Globe, Palette, Layers } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AethyxLogo from "@/components/AethyxLogo";
import reRetreats1 from "@/assets/portfolio/re-retreats-1.jpg";
import kokopelli1 from "@/assets/portfolio/kokopelli-1.jpg";
import vibeshift1 from "@/assets/portfolio/vibeshift-1.jpg";

const services = [
  { icon: Globe, title: "Web Design", desc: "Custom websites that command attention and convert." },
  { icon: Palette, title: "Branding & Identity", desc: "Logos, assets, and identity systems built to last." },
  { icon: Layers, title: "Digital Experiences", desc: "E-commerce, dashboards, booking — everything you need." },
];

const portfolioHighlights = [
  { img: reRetreats1, title: "Rē Retreats", subtitle: "Women's Wellness Retreats", link: "/portfolio" },
  { img: kokopelli1, title: "Kokopelli Kabin", subtitle: "Modern Mountain Retreat", link: "/portfolio" },
  { img: vibeshift1, title: "Vibe Shift → Aethyx", subtitle: "Brand Evolution", link: "/portfolio" },
];

const Home = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center bg-white">
        <div className="relative z-10 text-center px-6 pt-20">
          <div className="rounded-2xl px-8 py-10 max-w-3xl mx-auto">
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-wide text-primary mb-6">
            Elevate & Evolve Unapologetically
          </h1>
          <p className="text-lg md:text-xl text-foreground/70 max-w-2xl mx-auto mb-10">
            Premium web design & digital experiences for ambitious brands.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold tracking-wide uppercase text-sm hover:bg-primary/90 transition-all hover:-translate-y-0.5"
          >
            Get Started <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-foreground/50 text-sm mt-6 tracking-widest uppercase">
            RI-based • Serving USA
          </p>
          </div>
        </div>
      </section>

      {/* Services Teaser */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl text-center mb-16">What We Build</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((s) => (
              <Link
                key={s.title}
                to="/services"
                className="glass-card p-8 text-center group hover:border-primary/30 transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-2xl mb-3">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Highlights */}
      <section className="py-24 px-6 border-t border-border/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl text-center mb-16">Selected Work</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {portfolioHighlights.map((p) => (
              <Link
                key={p.title}
                to={p.link}
                className="group rounded-2xl overflow-hidden border border-border/30 hover:border-primary/30 transition-all"
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
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-border/20 text-center">
        <h2 className="font-display text-3xl md:text-5xl mb-6">Ready to Shift?</h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
          Book a consultation and let's build something that actually represents you.
        </p>
        <Link
          to="/contact"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold tracking-wide uppercase text-sm hover:bg-primary/90 transition-all hover:-translate-y-0.5"
        >
          Book a Consultation <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
