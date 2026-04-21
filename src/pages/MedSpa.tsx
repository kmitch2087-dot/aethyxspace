import { Link } from "react-router-dom";
import {
  ArrowRight,
  Smartphone,
  CalendarCheck,
  MapPin,
  FileText,
  ChevronDown,
  Star,
  Sparkles,
  Zap,
  Bot,
  Video,
  Shield,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { breadcrumb, serviceSchema } from "@/lib/seoSchemas";
import { useState, useRef } from "react";
import { Slider } from "@/components/ui/slider";

import lobbyImg from "@/assets/medspa/lobby.png";
import webMockupImg from "@/assets/medspa/web-mockup.png";
import practitionerImg from "@/assets/medspa/hero-landing.png";
import detailShotImg from "@/assets/medspa/detail-shot.png";
import beforeWebsiteImg from "@/assets/medspa/before-website.jpg";
import afterWebsiteImg from "@/assets/medspa/after-website.jpg";

const serif = "font-['Playfair_Display',serif]";

const painPoints = [
  {
    icon: Sparkles,
    title: 'The "clinical" look',
    desc: "Sites that feel cold & dated rather than modern & luxurious.",
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
    desc: 'Your patients are on their phones. We ensure your site looks stunning & loads in under 2 seconds, providing the "luxury feel" from the first tap.',
    image: webMockupImg,
  },
  {
    icon: CalendarCheck,
    title: "Seamless Booking Integration",
    desc: "We integrate directly with your existing software (Mindbody, Boulevard, Zenoti, etc.) to ensure a zero-friction path from \"Interested\" to \"Booked.\"",
    image: null,
  },
  {
    icon: MapPin,
    title: "Local SEO Domination",
    desc: "We don't just want you to have a site; we want you to be found. We optimize your local presence so you show up in the Google Map Pack exactly when patients are ready to book.",
    image: null,
  },
  {
    icon: FileText,
    title: "High-Conversion Landing Pages",
    desc: "Specific, branded pages for Botox, Fillers, Lasers, & Skincare designed to turn search traffic into scheduled consultations.",
    image: detailShotImg,
  },
];

const faqs = [
  {
    q: "How long does a redesign take?",
    a: "Most Med Spa projects are launched in 4-6 weeks from initial kickoff.",
  },
  {
    q: "Will I lose my current Google rankings?",
    a: "Absolutely not. We use advanced SEO migration protocols to ensure your current rankings are protected & then built upon.",
  },
  {
    q: "Can you work with my current booking software?",
    a: "Yes. We specialize in styling & integrating platforms like Mindbody, Boulevard, & Zenoti so they look like a native part of your luxury brand.",
  },
];

/* ─── Before/After Slider Component ─── */
const BeforeAfterSlider = () => {
  const [position, setPosition] = useState([50]);

  return (
    <div className="max-w-4xl mx-auto">
      <h3 className={`${serif} text-2xl md:text-3xl text-center mb-3 text-[hsl(40,20%,90%)]`}>
        See the Transformation
      </h3>
      <p className="text-center text-[hsl(40,10%,55%)] mb-8 text-sm">
        Drag the slider to reveal the redesign.
      </p>
      <div className="relative overflow-hidden rounded-2xl border border-[hsl(40,15%,25%)] aspect-[16/9]">
        {/* "Before" — full width */}
        <div className="absolute inset-0">
          <img
            src={beforeWebsiteImg}
            alt="Before: outdated clinical website"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        {/* "After" — clipped by slider */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${position[0]}%` }}
        >
          <div className="w-full h-full" style={{ width: `${10000 / position[0]}%` }}>
            <img
              src={afterWebsiteImg}
              alt="After: luxury modern redesign"
              className="w-full h-full object-cover"
              style={{ maxWidth: "none", width: `100%` }}
              loading="lazy"
            />
          </div>
        </div>
        {/* Divider line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-[hsl(40,30%,70%)] z-10"
          style={{ left: `${position[0]}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-[hsl(40,30%,70%)] flex items-center justify-center shadow-lg">
            <span className="text-[hsl(40,5%,15%)] text-xs font-bold">↔</span>
          </div>
        </div>
      </div>
      <div className="mt-4 px-4">
        <Slider
          value={position}
          onValueChange={setPosition}
          min={5}
          max={95}
          step={1}
          className="[&_[data-radix-slider-track]]:bg-[hsl(40,10%,20%)] [&_[data-radix-slider-range]]:bg-[hsl(40,30%,55%)] [&_[data-radix-slider-thumb]]:border-[hsl(40,30%,55%)] [&_[data-radix-slider-thumb]]:bg-[hsl(40,15%,12%)]"
        />
      </div>
    </div>
  );
};

const MedSpa = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[hsl(40,5%,8%)] text-[hsl(40,20%,90%)]">
      <Navbar />

      {/* ─── Hero ─── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Background image with overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={lobbyImg}
            alt="Luxury med spa interior"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(40,5%,8%)/0.7] via-[hsl(40,5%,8%)/0.6] to-[hsl(40,5%,8%)]" />
        </div>

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <div className="relative bg-[hsl(40,5%,8%)/0.6] backdrop-blur-md rounded-3xl px-8 py-12 md:px-14 md:py-16 opacity-65 bg-current">
            <p className="text-[hsl(40,30%,55%)] font-medium tracking-[0.3em] uppercase text-sm mb-6 font-['Inter',sans-serif]">
              Med Spa & Aesthetics
            </p>
            <h1 className="mb-6">
              <span className="block text-5xl md:text-7xl lg:text-8xl tracking-wide font-serif text-primary-foreground opacity-100">
                Your Work is Art.
              </span>
              <span className={`block ${serif} text-3xl md:text-5xl lg:text-6xl font-bold tracking-wide text-[hsl(40,30%,55%)] mt-2`}>
                Your Website Should Be, Too.
              </span>
            </h1>
            <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-['Inter',sans-serif] text-primary-foreground">
              We build high-performance digital experiences for Med Spas &
              Aesthetic Clinics. Turn your website into your highest-converting
              patient coordinator with seamless booking, luxury branding, &
              local SEO that dominates.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[hsl(40,30%,50%)] text-[hsl(40,5%,8%)] font-semibold tracking-wide uppercase text-sm hover:bg-[hsl(40,30%,60%)] transition-all hover:-translate-y-0.5 font-['Inter',sans-serif]"
              >
                Get My Free Digital Audit <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/portfolio"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full border-2 border-[hsl(40,20%,50%)] hover:border-[hsl(40,30%,60%)] font-semibold tracking-wide uppercase text-sm transition-all hover:-translate-y-0.5 font-['Inter',sans-serif] text-primary-foreground"
              >
                View Our Aesthetic Portfolio
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pain Points ─── */}
      <section className="py-24 px-6 border-t border-[hsl(40,10%,15%)]">
        <div className="max-w-5xl mx-auto">
          <h2 className={`${serif} text-3xl md:text-5xl text-center mb-4 text-[hsl(40,20%,95%)]`}>
            Is Your Website{" "}
            <span className="text-[hsl(40,30%,55%)]">Costing You Patients?</span>
          </h2>
          <p className="text-[hsl(40,10%,55%)] text-center max-w-2xl mx-auto mb-16 text-lg leading-relaxed font-['Inter',sans-serif]">
            You've spent years perfecting your technique & building a luxury
            clinic experience. But if your digital "front door" is slow, clunky,
            or hard to navigate on mobile, you're losing high-value leads before
            they ever see your results.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {painPoints.map((p) => (
              <div
                key={p.title}
                className="bg-[hsl(40,5%,12%)] border border-[hsl(40,10%,18%)] rounded-2xl p-8 flex gap-5 items-start hover:border-[hsl(40,30%,35%)] transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-[hsl(0,50%,40%)/0.12] flex items-center justify-center shrink-0">
                  <p.icon className="h-5 w-5 text-[hsl(0,50%,55%)]" />
                </div>
                <div>
                  <h3 className={`${serif} text-lg mb-2 text-[hsl(40,20%,90%)]`}>{p.title}</h3>
                  <p className="text-[hsl(40,10%,55%)] text-sm leading-relaxed font-['Inter',sans-serif]">
                    {p.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Solution ─── */}
      <section className="py-24 px-6 border-t border-[hsl(40,10%,15%)]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className={`${serif} text-3xl md:text-5xl mb-6 text-[hsl(40,20%,95%)]`}>
              Digital Luxury Meets{" "}
              <span className="text-[hsl(40,30%,55%)]">Patient Acquisition.</span>
            </h2>
            <p className="text-[hsl(40,10%,55%)] text-lg leading-relaxed font-['Inter',sans-serif]">
              At aethyx.space, we don't just "design websites." We build patient
              acquisition engines specifically for the aesthetics industry. We
              bridge the gap between clinical excellence & digital performance.
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden border border-[hsl(40,10%,18%)]">
            <img
              src={webMockupImg}
              alt="Professional aesthetic practitioner"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-24 px-6 border-t border-[hsl(40,10%,15%)]">
        <div className="max-w-6xl mx-auto">
          <h2 className={`${serif} text-3xl md:text-5xl text-center mb-16 text-[hsl(40,20%,95%)]`}>
            What We Deliver
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-[hsl(40,5%,12%)] border border-[hsl(40,10%,18%)] rounded-2xl overflow-hidden group hover:border-[hsl(40,30%,35%)] transition-all"
              >
                {f.image && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={f.image}
                      alt={f.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-8">
                  <div className="w-14 h-14 rounded-2xl bg-[hsl(40,30%,45%)/0.12] flex items-center justify-center mb-6">
                    <f.icon className="h-6 w-6 text-[hsl(40,30%,55%)]" />
                  </div>
                  <h3 className={`${serif} text-xl mb-3 text-[hsl(40,20%,90%)]`}>{f.title}</h3>
                  <p className="text-[hsl(40,10%,55%)] text-sm leading-relaxed font-['Inter',sans-serif]">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Before/After Portfolio Slider ─── */}
      <section className="py-24 px-6 border-t border-[hsl(40,10%,15%)]">
        <BeforeAfterSlider />
      </section>

      {/* ─── Cutting Edge: Stay Ahead ─── */}
      <section className="py-24 px-6 border-t border-[hsl(40,10%,15%)]">
        <div className="max-w-5xl mx-auto">
          <p className="text-[hsl(40,30%,55%)] font-medium tracking-[0.3em] uppercase text-xs text-center mb-4 font-['Inter',sans-serif]">
            Stay on the Cutting Edge
          </p>
          <h2 className={`${serif} text-3xl md:text-5xl text-center mb-4 text-[hsl(40,20%,95%)]`}>
            The Future of <span className="text-[hsl(40,30%,55%)]">Med Spa Marketing</span> Is Here.
          </h2>
          <p className="text-[hsl(40,10%,55%)] text-center max-w-2xl mx-auto mb-16 text-lg leading-relaxed font-['Inter',sans-serif]">
            While your competitors are still optimizing for yesterday's Google, we're building your visibility across the platforms patients are actually using in 2026.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[hsl(40,5%,12%)] border border-[hsl(40,10%,18%)] rounded-2xl p-8 hover:border-[hsl(40,30%,35%)] transition-all">
              <div className="w-12 h-12 rounded-xl bg-[hsl(40,30%,45%)/0.12] flex items-center justify-center mb-6">
                <Bot className="h-5 w-5 text-[hsl(40,30%,55%)]" />
              </div>
              <h3 className={`${serif} text-lg mb-3 text-[hsl(40,20%,90%)]`}>AI Search Visibility</h3>
              <p className="text-[hsl(40,10%,55%)] text-sm leading-relaxed font-['Inter',sans-serif] mb-4">
                Patients are asking ChatGPT & Perplexity "best Botox clinic near me" instead of Googling it. We structure your content so AI search engines recommend <em className="text-[hsl(40,20%,75%)]">your practice</em> by name — not your competitor down the street.
              </p>
              <p className="text-[hsl(40,30%,50%)] text-xs uppercase tracking-widest font-semibold font-['Inter',sans-serif]">Generative Engine Optimization</p>
            </div>

            <div className="bg-[hsl(40,5%,12%)] border border-[hsl(40,10%,18%)] rounded-2xl p-8 hover:border-[hsl(40,30%,35%)] transition-all">
              <div className="w-12 h-12 rounded-xl bg-[hsl(40,30%,45%)/0.12] flex items-center justify-center mb-6">
                <Video className="h-5 w-5 text-[hsl(40,30%,55%)]" />
              </div>
              <h3 className={`${serif} text-lg mb-3 text-[hsl(40,20%,90%)]`}>Cinematic Practice Previews</h3>
              <p className="text-[hsl(40,10%,55%)] text-sm leading-relaxed font-['Inter',sans-serif] mb-4">
                Static hero images are dead. We create immersive, video-driven brand experiences that let patients <em className="text-[hsl(40,20%,75%)]">feel</em> the luxury of your clinic before they walk through the door — building trust & desire from the first frame.
              </p>
              <p className="text-[hsl(40,30%,50%)] text-xs uppercase tracking-widest font-semibold font-['Inter',sans-serif]">Video-First Design</p>
            </div>

            <div className="bg-[hsl(40,5%,12%)] border border-[hsl(40,10%,18%)] rounded-2xl p-8 hover:border-[hsl(40,30%,35%)] transition-all">
              <div className="w-12 h-12 rounded-xl bg-[hsl(40,30%,45%)/0.12] flex items-center justify-center mb-6">
                <Shield className="h-5 w-5 text-[hsl(40,30%,55%)]" />
              </div>
              <h3 className={`${serif} text-lg mb-3 text-[hsl(40,20%,90%)]`}>Beyond Cookie-Cutter Software</h3>
              <p className="text-[hsl(40,10%,55%)] text-sm leading-relaxed font-['Inter',sans-serif] mb-4">
                EHR platforms like Pabau & AestheticsPro are bundling generic marketing templates into their software. We build a bespoke digital identity that no SaaS tool can replicate — so your brand is <em className="text-[hsl(40,20%,75%)]">unmistakably yours</em>.
              </p>
              <p className="text-[hsl(40,30%,50%)] text-xs uppercase tracking-widest font-semibold font-['Inter',sans-serif]">Luxury Brand Moat</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Social Proof ─── */}
      <section className="py-24 px-6 border-t border-[hsl(40,10%,15%)]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-1 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="h-5 w-5 text-[hsl(40,30%,55%)] fill-[hsl(40,30%,55%)]"
              />
            ))}
          </div>
          <h2 className={`${serif} text-3xl md:text-4xl mb-8 text-[hsl(40,20%,95%)]`}>
            Real Results for Aesthetic Pros.
          </h2>
          <blockquote className="bg-[hsl(40,5%,12%)] border border-[hsl(40,10%,18%)] rounded-2xl p-10">
            <p className="text-lg text-[hsl(40,15%,70%)] leading-relaxed italic mb-6 font-['Inter',sans-serif]">
              "After working with aethyx.space, our laser bookings increased by
              42% in just 60 days. Our patients finally have a digital
              experience that matches our clinic's luxury."
            </p>
            <cite className="text-[hsl(40,10%,45%)] text-sm not-italic tracking-wide uppercase font-['Inter',sans-serif]">
              — Featured Med Spa Client
            </cite>
          </blockquote>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-24 px-6 border-t border-[hsl(40,10%,15%)]">
        <div className="max-w-3xl mx-auto">
          <h2 className={`${serif} text-3xl md:text-5xl text-center mb-16 text-[hsl(40,20%,95%)]`}>
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <button
                key={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full bg-[hsl(40,5%,12%)] border border-[hsl(40,10%,18%)] rounded-2xl p-6 text-left hover:border-[hsl(40,30%,35%)] transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className={`${serif} text-lg text-[hsl(40,20%,90%)]`}>{faq.q}</h3>
                  <ChevronDown
                    className={`h-5 w-5 text-[hsl(40,10%,45%)] shrink-0 transition-transform ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </div>
                {openFaq === i && (
                  <p className="text-[hsl(40,10%,55%)] text-sm mt-4 leading-relaxed font-['Inter',sans-serif]">
                    {faq.a}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-24 px-6 border-t border-[hsl(40,10%,15%)] text-center">
        <div className="max-w-3xl mx-auto">
          <Zap className="h-10 w-10 text-[hsl(40,30%,55%)] mx-auto mb-6" />
          <h2 className={`${serif} text-3xl md:text-5xl mb-6 text-[hsl(40,20%,95%)]`}>
            Ready to Elevate Your Clinic's Digital Presence?
          </h2>
          <p className="text-[hsl(40,10%,55%)] text-lg max-w-xl mx-auto mb-10 leading-relaxed font-['Inter',sans-serif]">
            Don't let another high-value lead go to a competitor with a better
            website. Let's build the digital authority your clinic deserves.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[hsl(40,30%,45%)] text-[hsl(40,5%,8%)] font-semibold tracking-wide uppercase text-sm hover:bg-[hsl(40,30%,55%)] transition-all hover:-translate-y-0.5 font-['Inter',sans-serif]"
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
