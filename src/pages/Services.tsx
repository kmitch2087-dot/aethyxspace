import { Link } from "react-router-dom";
import { ArrowRight, Check, Star, Globe, Diamond, Play, Shield, Search, Layers, Zap, TrendingUp, Lock, ChevronRight, Bot, Video, Eye } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { QUICK_SERVICES, ADD_ONS, APP_DEVELOPMENT } from "@/lib/stripePrices";

const coreServices = [
  {
    icon: Diamond,
    title: "Digital Brand Foundation",
    items: [
      "Brand strategy & positioning",
      "Messaging & voice development",
      "Visual identity systems",
      "Brand direction for digital environments",
    ],
  },
  {
    icon: Globe,
    title: "Website & Platform Development",
    items: [
      "Custom website design & development",
      "Booking and scheduling systems",
      "E-commerce and digital product systems",
      "Membership and user portal builds",
      "Multi-role platforms (admin, client, provider dashboards)",
      "App planning and platform architecture",
    ],
  },
  {
    icon: Zap,
    title: "Systems & Automation",
    items: [
      "Workflow automation",
      "Client onboarding systems",
      "Internal business systems",
      "Data flow structuring",
      "Integration of tools and platforms",
      "Operational efficiency design",
    ],
  },
  {
    icon: TrendingUp,
    title: "Growth & Visibility",
    items: [
      "SEO architecture",
      "AI search optimization (GEO)",
      "Content structuring",
      "Marketing strategy alignment",
      "Platform scalability planning",
    ],
  },
];

const processSteps = [
  { step: "01", title: "Discovery & Strategy", desc: "We learn your business, your audience, and your goals to define the right digital infrastructure." },
  { step: "02", title: "System Architecture & Planning", desc: "We map out the full ecosystem — features, integrations, user flows, and long-term scalability." },
  { step: "03", title: "Design & Development", desc: "Every element is custom-built with precision, from brand visuals to backend functionality." },
  { step: "04", title: "Launch & Ongoing Support", desc: "We launch your platform and provide continued protection, optimization, and strategic guidance." },
];

const quickServices = Object.values(QUICK_SERVICES);

const addOns = Object.entries(ADD_ONS).map(([, v]) => ({
  name: v.name,
  addonPrice: v.addon.price,
  standalonePrice: v.standalone.price,
}));

const appDev = Object.entries(APP_DEVELOPMENT).map(([, v]) => ({
  name: v.name,
  addonPrice: v.addon.price,
  standalonePrice: v.standalone.price,
}));

const Services = () => (
  <div className="min-h-screen bg-transparent text-foreground">
    <Navbar />

    {/* 1. HERO */}
    <section className="pt-32 pb-20 px-6 text-center">
      <div className="max-w-3xl mx-auto">
        <p className="text-primary text-xs uppercase tracking-[0.3em] mb-6">Digital Brand Architecture Studio</p>
        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl mb-6 leading-tight">
          We Don't Just Build Websites — We Build Digital Ecosystems
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          We design, develop, and maintain fully integrated digital platforms that support your business growth, operations, and customer experience.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold tracking-wide uppercase text-sm hover:bg-primary/90 transition-all hover:-translate-y-0.5"
          >
            Start a Project <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-primary/40 text-primary font-semibold tracking-wide uppercase text-sm hover:bg-primary/10 transition-all"
          >
            Request a Consultation
          </Link>
        </div>
      </div>
    </section>

    {/* 2. POSITIONING */}
    <section className="py-20 px-6 border-t border-border/20">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-display text-3xl md:text-4xl mb-8">
          Most businesses don't need just a website — they need a <span className="text-primary">system</span>.
        </h2>
        <p className="text-muted-foreground text-lg leading-relaxed mb-6">
          We build connected digital infrastructures that combine brand strategy, website development, user experience, automation, marketing systems, and long-term scalability — all under one roof.
        </p>
        <p className="text-muted-foreground text-lg leading-relaxed mb-6">
          This is not template-based work. Every system is custom-built around how your business operates and grows.
        </p>
        <p className="text-foreground/60 text-sm italic">
          Our work often replaces the need for multiple agencies by combining strategy, design, development, and systems into one cohesive build.
        </p>
      </div>
    </section>

    {/* 3. CORE SERVICES */}
    <section className="py-20 px-6 border-t border-border/20">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-display text-3xl md:text-5xl text-center mb-4">Core Services</h2>
        <p className="text-center text-muted-foreground text-lg mb-16 max-w-2xl mx-auto">
          Four pillars of a complete digital ecosystem.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {coreServices.map((service) => (
            <div key={service.title} className="glass-card p-8 hover:border-primary/30 transition-all">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <service.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-2xl mb-5">{service.title}</h3>
              <ul className="space-y-3">
                {service.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Built Into Every Project */}
    <section className="py-20 px-6 border-t border-border/20">
      <div className="max-w-6xl mx-auto">
        <div className="glass-card-teal p-8 md:p-10">
          <h2 className="font-display text-2xl md:text-3xl mb-6 text-center">Built Into Every Project</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-display text-lg mb-2">SEO & Search Optimization</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Every site is built with search visibility in mind — from metadata and structured content to performance optimization — so your business gets found by the right people.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-display text-lg mb-2">Industry & Compliance Research</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We research the laws, regulations, and best practices specific to your industry and location — ensuring your site isn't just beautiful, but fully compliant and trustworthy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* 4. ONGOING PLATFORM PROTECTION */}
    <section className="py-20 px-6 border-t border-border/20">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-primary" />
          </div>
        </div>
        <h2 className="font-display text-3xl md:text-5xl text-center mb-6">Ongoing Platform Protection</h2>
        <p className="text-center text-muted-foreground text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
          Your digital platform is not a one-time build — it requires ongoing protection, maintenance, and optimization to perform at its best.
        </p>

        <div className="glass-card p-8 md:p-10 mb-8">
          <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
            We offer continued support to ensure your system remains secure, functional, optimized, and scalable. This includes:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              "Security monitoring",
              "Performance optimization",
              "Backup and recovery systems",
              "Uptime monitoring",
              "System updates and maintenance",
              "Integration monitoring",
              "Priority support when issues arise",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-muted-foreground text-sm italic">
          An optional but highly recommended service for clients operating complex platforms, booking systems, or user-based environments.
        </p>
      </div>
    </section>

    {/* 6. PROCESS */}
    <section className="py-20 px-6 border-t border-border/20">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-display text-3xl md:text-5xl text-center mb-16">Our Process</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {processSteps.map((s, i) => (
            <div key={s.step} className="relative">
              <p className="font-display text-5xl text-primary/20 mb-4">{s.step}</p>
              <h3 className="font-display text-lg mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              {i < processSteps.length - 1 && (
                <ChevronRight className="hidden md:block absolute top-8 -right-4 h-5 w-5 text-primary/30" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* 5. PRICING PHILOSOPHY */}
    <section className="py-20 px-6 border-t border-border/20">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="font-display text-3xl md:text-4xl mb-8">Pricing</h2>
        <p className="text-muted-foreground text-lg leading-relaxed mb-6">
          Every project is custom scoped based on system complexity, number of features, integrations required, and long-term business goals.
        </p>
        <p className="text-foreground font-display text-xl mb-8">
          Every build is tailored to your goals — reach out and we'll scope a solution that fits.
        </p>
        <Link
          to="/contact"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold tracking-wide uppercase text-sm hover:bg-primary/90 transition-all hover:-translate-y-0.5"
        >
          Request a Custom Quote <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>

    {/* Service Tiers (existing) */}
    <section className="py-20 px-6 border-t border-border/20">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-display text-3xl text-center mb-4">Service Tiers</h2>
        <p className="text-center text-muted-foreground text-sm mb-10 max-w-2xl mx-auto">
          Every project is priced based on your unique needs. These tiers represent the range of experience levels — from a clean, functional web presence to a fully automated brand ecosystem. Your quote is always customized after consultation.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {[
            {
              name: "Online Presence Starter",
              tier: "Tier 1",
              features: ["Single-page or multi-page site", "Mobile responsive", "Basic SEO setup", "Contact form", "1 round of revisions"],
            },
            {
              name: "Professional Brand Website",
              tier: "Tier 2",
              features: ["Custom multi-page design", "Brand-aligned copywriting", "Advanced SEO", "Blog or CMS integration", "2 revision sessions after simmer period"],
              featured: true,
            },
            {
              name: "Signature Brand Presence",
              tier: "Tier 3",
              features: ["Full brand website experience", "Client & Admin Dashboards", "Advanced integrations", "Priority support", "3 revision sessions after simmer period"],
            },
          ].map((tier) => (
            <div
              key={tier.name}
              className={`glass-card p-8 flex flex-col ${tier.featured ? "border-primary/40 ring-1 ring-primary/20" : ""}`}
            >
              {tier.featured && (
                <div className="flex items-center gap-1 text-primary text-xs uppercase tracking-widest mb-4">
                  <Star className="h-3 w-3" /> Most Popular
                </div>
              )}
              <p className="text-primary text-xs uppercase tracking-widest mb-2">{tier.tier}</p>
              <h3 className="font-display text-2xl mb-6">{tier.name}</h3>
              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/contact"
                className="text-center py-3 rounded-full border border-primary/40 text-primary text-sm uppercase tracking-widest hover:bg-primary/10 transition-colors"
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>

        {/* Quick Services */}
        <h2 className="font-display text-3xl text-center mb-10">Quick Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-24">
          {quickServices.map((s) => (
            <div key={s.name} className="glass-card p-6 text-center">
              <h4 className="font-semibold mb-2">{s.name}</h4>
              <p className="text-primary font-bold">{s.price}</p>
            </div>
          ))}
        </div>

        {/* Add-Ons */}
        <h2 className="font-display text-3xl text-center mb-4">Add-Ons</h2>
        <p className="text-center text-muted-foreground text-sm mb-10">
          Bundle with a tier for discounted pricing, or purchase standalone.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-24">
          {addOns.map((a) => (
            <div key={a.name} className="glass-card p-6">
              <h4 className="font-semibold mb-3">{a.name}</h4>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">With tier: <span className="text-primary">{a.addonPrice}</span></span>
                <span className="text-muted-foreground">Standalone: <span className="text-foreground">{a.standalonePrice}</span></span>
              </div>
            </div>
          ))}
        </div>

        {/* App Development */}
        <h2 className="font-display text-3xl text-center mb-10">App Development</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-24">
          {appDev.map((a) => (
            <div key={a.name} className="glass-card p-8">
              <h4 className="font-display text-xl mb-4">{a.name}</h4>
              <div className="flex gap-8 text-sm">
                <span className="text-muted-foreground">With tier: <span className="text-primary font-bold">{a.addonPrice}</span></span>
                <span className="text-muted-foreground">Standalone: <span className="text-foreground font-bold">{a.standalonePrice}</span></span>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center max-w-2xl mx-auto mb-16">
          Some integrated services (e.g., cloud storage, scheduling, e-commerce platforms) may require separate third-party subscriptions not included in Aethyx service fees.
        </p>
      </div>
    </section>

    {/* CUTTING EDGE */}
    <section className="py-20 px-6 border-t border-border/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-primary text-xs uppercase tracking-[0.3em] mb-4">Stay Ahead of the Curve</p>
          <h2 className="font-display text-3xl md:text-5xl mb-4">Cutting-Edge Capabilities</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            The digital landscape is shifting fast. We build with tomorrow's technology so you're never playing catch-up.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card p-8 hover:border-primary/30 transition-all">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display text-xl mb-3">AI Search Optimization</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Google isn't the only search engine anymore. ChatGPT, Perplexity, and Gemini are now how people discover businesses. We structure your digital presence so AI engines cite <em>you</em> as the answer — not your competitor.
            </p>
            <p className="text-primary/70 text-xs uppercase tracking-widest font-semibold">Generative Engine Optimization (GEO)</p>
          </div>

          <div className="glass-card p-8 hover:border-primary/30 transition-all">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Video className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display text-xl mb-3">Cinematic Brand Media</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Static websites are becoming background noise. We create video-first brand experiences — cinematic practice previews, motion-driven storytelling, and dynamic content that stops the scroll and builds trust before a single word is read.
            </p>
            <p className="text-primary/70 text-xs uppercase tracking-widest font-semibold">Video-First Digital Presence</p>
          </div>

          <div className="glass-card p-8 hover:border-primary/30 transition-all">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display text-xl mb-3">Competitive Intelligence</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Software platforms are bundling cookie-cutter marketing into their tools. We ensure your brand stands so far above template-driven competitors that no SaaS dashboard can replicate what you have — a bespoke digital identity built for <em>your</em> business.
            </p>
            <p className="text-primary/70 text-xs uppercase tracking-widest font-semibold">Beyond Template Marketing</p>
          </div>
        </div>
      </div>
    </section>

    {/* 7. CLOSING */}
    <section className="py-24 px-6 border-t border-border/20 text-center">
      <div className="max-w-2xl mx-auto">
        <h2 className="font-display text-3xl md:text-5xl mb-6">
          We don't build one-off websites.
        </h2>
        <p className="text-muted-foreground text-lg mb-10">
          We build digital systems designed to support your business long-term.
        </p>
        <Link
          to="/contact"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold tracking-wide uppercase text-sm hover:bg-primary/90 transition-all hover:-translate-y-0.5"
        >
          Book a Consultation <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>

    <Footer />
  </div>
);

export default Services;
