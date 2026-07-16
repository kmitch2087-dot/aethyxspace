import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";

// Private hub for industry-specific landing pages used in ad campaigns.
// Deliberately unlisted: no nav/footer links anywhere, noindex, excluded from
// the sitemap — reachable only by direct URL (ads, DMs, pitches). Add new
// industries here as their pages are built.
const industries = [
  {
    to: "/industries/medspa",
    name: "Med Spas & Aesthetic Clinics",
    desc: "Luxury web design with booking integrations (Mindbody, Boulevard, Zenoti), brand-aligned visuals, and SEO built for the aesthetics industry.",
    live: true,
  },
  // Future: barbershops, wellness retreats, restaurants, real estate…
];

const Industries = () => (
  <div className="min-h-screen bg-transparent text-foreground">
    <Seo
      title="Industries — Aethyx Web Design"
      description="Industry-specific web design from Aethyx."
      path="/industries"
      noindex
    />
    <Navbar />

    <section className="pt-40 pb-16 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-primary text-xs tracking-[0.4em] uppercase mb-4">Built For Your Industry</p>
        <h1 className="font-display text-4xl md:text-6xl mb-6 tracking-tight">Industries we design for</h1>
        <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Every industry has its own buying psychology, booking flows, and trust signals. These pages
          show exactly how Aethyx builds for yours.
        </p>
      </div>
    </section>

    <section className="pb-28 px-6">
      <div className="max-w-4xl mx-auto grid gap-6 sm:grid-cols-2">
        {industries.map((ind) => (
          <Link
            key={ind.to}
            to={ind.to}
            className="group rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-8 hover:border-primary/50 hover:bg-card/60 transition-all"
          >
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-display text-2xl mb-3 group-hover:text-primary transition-colors">{ind.name}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-5">{ind.desc}</p>
            <span className="inline-flex items-center gap-1.5 text-primary text-xs tracking-widest uppercase">
              See how we build it <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        ))}
        <div className="rounded-2xl border border-dashed border-border/40 p-8 flex flex-col items-center justify-center text-center text-muted-foreground">
          <p className="font-display text-xl mb-2 text-foreground/70">Your industry next</p>
          <p className="text-sm mb-5 max-w-[260px]">
            Don't see your field? We design for it anyway — tell us what you do.
          </p>
          <Link
            to="/intake"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 px-5 py-2 text-xs tracking-widest uppercase text-primary hover:bg-primary/10 transition-colors"
          >
            Start a project <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

export default Industries;
