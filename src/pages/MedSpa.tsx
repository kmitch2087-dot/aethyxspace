import { Link } from "react-router-dom";
import {
  ArrowRight,
  Smartphone,
  CalendarCheck,
  MapPin,
  FileText,
  X,
  ChevronDown,
  Star,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState } from "react";

const painPoints = [
  {
    icon: Sparkles,
    title: 'The "clinical" look',
    desc: "Sites that feel cold and dated rather than modern and luxurious.",
  },
  {
    icon: CalendarCheck,
    title: "Booking Drop-off",
    desc: "Potential patients leaving your site because your scheduling system is too complex.",
  },
  {
    icon: Smartphone,
    title: "Mobile Failure",
    desc: "85% of aesthetic searches happen on phones. If your site isn't mobile-first, it's invisible.",
  },
  {
    icon: MapPin,
    title: "SEO Ghosting",
    desc: 'You\'re an expert in your field, but you\'re nowhere to be found when patients search "Botox near me."',
  },
];

const features = [
  {
    icon: Smartphone,
    title: "Mobile-First Luxury Design",
    desc: 'Your patients are on their phones. We ensure your site looks stunning and loads in under 2 seconds, providing the "luxury feel" from the first tap.',
  },
  {
    icon: CalendarCheck,
    title: "Seamless Booking Integration",
    desc: "We integrate directly with your existing software (Mindbody, Boulevard, Zenoti, etc.) to ensure a zero-friction path from \"Interested\" to \"Booked.\"",
  },
  {
    icon: MapPin,
    title: "Local SEO Domination",
    desc: "We don't just want you to have a site; we want you to be found. We optimize your local presence so you show up in the Google Map Pack exactly when patients are ready to book.",
  },
  {
    icon: FileText,
    title: "High-Conversion Landing Pages",
    desc: "Specific, branded pages for Botox, Fillers, Lasers, and Skincare designed to turn search traffic into scheduled consultations.",
  },
];

const packages = [
  {
    name: "The Local Kickstart",
    price: "$1,497",
    sub: "one-time",
    desc: "Perfect for new or solo practitioners.",
    items: [
      "Google Business Profile Optimization",
      "3 High-converting Landing Pages",
      "Local SEO Foundation",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "The Aesthetic Authority",
    price: "$3,500 – $5,500",
    sub: "one-time",
    desc: "Our most popular full-service redesign.",
    items: [
      "Custom Luxury Web Design (up to 10 pages)",
      "Seamless Booking Integration",
      "Mobile-First Performance Optimization",
    ],
    cta: "Transform My Site",
    popular: true,
  },
  {
    name: "The Growth Engine",
    price: "$1,500",
    sub: "/mo retainer",
    desc: "Ongoing growth for established clinics.",
    items: [
      "Continuous Local SEO & Keyword Targeting",
      "Monthly Performance Reporting & Audits",
      "Reputation Management & Review Automation",
    ],
    cta: "Scale My Clinic",
    popular: false,
  },
];

const faqs = [
  {
    q: "How long does a redesign take?",
    a: "Most Med Spa projects are launched in 4-6 weeks from initial kickoff.",
  },
  {
    q: "Will I lose my current Google rankings?",
    a: "Absolutely not. We use advanced SEO migration protocols to ensure your current rankings are protected and then built upon.",
  },
  {
    q: "Can you work with my current booking software?",
    a: "Yes. We specialize in styling and integrating platforms like Mindbody, Boulevard, and Zenoti so they look like a native part of your luxury brand.",
  },
];

const MedSpa = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* ─── Hero ─── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Gradient background */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 30%, hsl(174 100% 45% / 0.08) 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <p className="text-primary font-medium tracking-[0.3em] uppercase text-sm mb-6">
            Med Spa & Aesthetics
          </p>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-wide mb-6">
            Your Work is Art.{" "}
            <span className="text-primary">Your Website Should Be, Too.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            We build high-performance digital experiences for Med Spas and
            Aesthetic Clinics. Turn your website into your highest-converting
            patient coordinator with seamless booking, luxury branding, and
            local SEO that dominates.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold tracking-wide uppercase text-sm hover:bg-primary/90 transition-all hover:-translate-y-0.5"
            >
              Get My Free Digital Audit <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/portfolio"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-border hover:border-primary/40 text-foreground font-semibold tracking-wide uppercase text-sm transition-all hover:-translate-y-0.5"
            >
              View Our Aesthetic Portfolio
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Pain Points ─── */}
      <section className="py-24 px-6 border-t border-border/20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl text-center mb-4">
            Is Your Website{" "}
            <span className="text-primary">Costing You Patients?</span>
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-16 text-lg leading-relaxed">
            You've spent years perfecting your technique and building a luxury
            clinic experience. But if your digital "front door" is slow, clunky,
            or hard to navigate on mobile, you're losing high-value leads before
            they ever see your results.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {painPoints.map((p) => (
              <div
                key={p.title}
                className="glass-card p-8 flex gap-5 items-start hover:border-primary/20 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                  <p.icon className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-display text-lg mb-2">{p.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Solution ─── */}
      <section className="py-24 px-6 border-t border-border/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-5xl mb-6">
            Digital Luxury Meets{" "}
            <span className="text-primary">Patient Acquisition.</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            At aethyx.space, we don't just "design websites." We build patient
            acquisition engines specifically for the aesthetics industry. We
            bridge the gap between clinical excellence and digital performance.
          </p>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-24 px-6 border-t border-border/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl text-center mb-16">
            What We Deliver
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((f) => (
              <div
                key={f.title}
                className="glass-card p-8 group hover:border-primary/30 transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-xl mb-3">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section className="py-24 px-6 border-t border-border/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl text-center mb-4">
            Scalable Solutions for{" "}
            <span className="text-primary">Growing Clinics.</span>
          </h2>
          <p className="text-muted-foreground text-center mb-16">
            Transparent pricing. No hidden fees. Real results.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {packages.map((pkg) => (
              <div
                key={pkg.name}
                className={`glass-card p-8 flex flex-col relative ${
                  pkg.popular
                    ? "border-primary/40 ring-1 ring-primary/20"
                    : ""
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold tracking-widest uppercase px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <h3 className="font-display text-xl mb-2">{pkg.name}</h3>
                <div className="mb-4">
                  <span className="font-display text-3xl font-bold text-primary">
                    {pkg.price}
                  </span>
                  <span className="text-muted-foreground text-sm ml-1">
                    {pkg.sub}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm mb-6">{pkg.desc}</p>
                <ul className="space-y-3 mb-8 flex-1">
                  {pkg.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm text-foreground/80"
                    >
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/contact"
                  className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold tracking-wide uppercase text-sm transition-all hover:-translate-y-0.5 ${
                    pkg.popular
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-border hover:border-primary/40 text-foreground"
                  }`}
                >
                  {pkg.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Social Proof ─── */}
      <section className="py-24 px-6 border-t border-border/20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-1 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="h-5 w-5 text-primary fill-primary"
              />
            ))}
          </div>
          <h2 className="font-display text-3xl md:text-4xl mb-8">
            Real Results for Aesthetic Pros.
          </h2>
          <blockquote className="glass-card p-10">
            <p className="text-lg text-foreground/80 leading-relaxed italic mb-6">
              "After working with aethyx.space, our laser bookings increased by
              42% in just 60 days. Our patients finally have a digital
              experience that matches our clinic's luxury."
            </p>
            <cite className="text-muted-foreground text-sm not-italic tracking-wide uppercase">
              — Featured Med Spa Client
            </cite>
          </blockquote>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-24 px-6 border-t border-border/20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl text-center mb-16">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <button
                key={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full glass-card p-6 text-left hover:border-primary/20 transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-display text-lg">{faq.q}</h3>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </div>
                {openFaq === i && (
                  <p className="text-muted-foreground text-sm mt-4 leading-relaxed">
                    {faq.a}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-24 px-6 border-t border-border/20 text-center">
        <div className="max-w-3xl mx-auto">
          <Zap className="h-10 w-10 text-primary mx-auto mb-6" />
          <h2 className="font-display text-3xl md:text-5xl mb-6">
            Ready to Elevate Your Clinic's Digital Presence?
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Don't let another high-value lead go to a competitor with a better
            website. Let's build the digital authority your clinic deserves.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold tracking-wide uppercase text-sm hover:bg-primary/90 transition-all hover:-translate-y-0.5"
          >
            Book Your Free 15-Point Digital Audit{" "}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default MedSpa;
