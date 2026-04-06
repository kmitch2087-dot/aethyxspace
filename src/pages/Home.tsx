import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Palette, Globe, Layers } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import aethyxLogo from "@/assets/aethyx-logo.png";
import reRetreats1 from "@/assets/portfolio/re-retreats-1.jpg";
import kokopelli1 from "@/assets/portfolio/kokopelli-1.jpg";
import vibeshift1 from "@/assets/portfolio/vibeshift-1.jpg";

const services = [
  { icon: Globe, title: "Web Design", desc: "Custom websites that command attention and convert." },
  { icon: Palette, title: "Branding", desc: "Logos, assets, and identity systems built to last." },
  { icon: Layers, title: "Add-Ons", desc: "E-commerce, dashboards, booking — everything you need." },
];

const portfolioHighlights = [
  { img: reRetreats1, title: "Rē Retreats", subtitle: "Women's Wellness Retreats", link: "/portfolio" },
  { img: kokopelli1, title: "Kokopelli Kabin", subtitle: "Modern Mountain Retreat", link: "/portfolio" },
  { img: vibeshift1, title: "Vibe Shift → Aethyx", subtitle: "Brand Evolution", link: "/portfolio" },
];

const Home = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoLoaded = () => {
    if (videoRef.current) videoRef.current.playbackRate = 0.6;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            src="/aethyx-intro.mov"
            autoPlay
            muted
            playsInline
            onLoadedData={handleVideoLoaded}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 20%, hsl(222 47% 4%) 85%)" }} />
        </div>

        <div className="relative z-10 text-center px-6 pt-20">
          <img src={aethyxLogo} alt="Aethyx" className="h-20 md:h-28 mx-auto mb-8" />
          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold tracking-wide text-primary mb-6 glow-teal">
            Elevate & Evolve Unapologetically
          </h1>
          <p className="text-lg md:text-xl text-foreground/70 max-w-2xl mx-auto mb-10">
            High-end web design for businesses that refuse to blend in.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold tracking-wide uppercase text-sm hover:bg-primary/90 transition-all hover:-translate-y-0.5"
          >
            Start a Project <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Services Teaser */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-3xl md:text-5xl text-center mb-16">What We Build</h2>
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
                <h3 className="font-serif text-2xl mb-3">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Highlights */}
      <section className="py-24 px-6 border-t border-border/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-3xl md:text-5xl text-center mb-16">Selected Work</h2>
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
                  <h3 className="font-serif text-xl mb-1">{p.title}</h3>
                  <p className="text-muted-foreground text-sm">{p.subtitle}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-border/20 text-center">
        <h2 className="font-serif text-3xl md:text-5xl mb-6">Ready to Shift?</h2>
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
