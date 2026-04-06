import { Link } from "react-router-dom";
import { ArrowRight, Check, Star, Globe, Diamond, Play, Shield, Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SERVICE_TIERS, QUICK_SERVICES, ADD_ONS, APP_DEVELOPMENT } from "@/lib/stripePrices";

const categories = [
  { icon: Globe, title: "Web Design", desc: "Custom-built websites that are fast, responsive, and designed to convert visitors into clients." },
  { icon: Diamond, title: "Branding & Identity", desc: "Complete brand systems — logos, color palettes, typography, and guidelines that define who you are." },
  { icon: Play, title: "Digital Experiences", desc: "Interactive dashboards, booking systems, e-commerce, and custom integrations that elevate your business." },
];

const tiers = [
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
  <div className="min-h-screen bg-background text-foreground">
    <Navbar />

    <div className="pt-28 pb-24 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-display text-4xl md:text-6xl text-center mb-4">Services</h1>
        <p className="text-center text-muted-foreground text-lg mb-20 max-w-2xl mx-auto">
          Elevate your digital presence with our bespoke solutions.
        </p>

        {/* Service Categories */}
        <div className="space-y-6 mb-24">
          {categories.map((cat) => (
            <div key={cat.title} className="glass-card p-8 flex flex-col md:flex-row items-start md:items-center gap-6 hover:border-primary/30 transition-all">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <cat.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-2xl mb-2">{cat.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{cat.desc}</p>
              </div>
              <Link
                to="/contact"
                className="text-primary text-sm uppercase tracking-widest hover:text-primary/80 transition-colors shrink-0"
              >
                Learn More →
              </Link>
            </div>
          ))}
        </div>

        {/* Built Into Every Project */}
        <div className="glass-card-teal p-8 md:p-10 mb-24">
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

        {/* Tiers */}
        <h2 className="font-display text-3xl text-center mb-4">Service Tiers</h2>
        <p className="text-center text-muted-foreground text-sm mb-10 max-w-2xl mx-auto">
          Every project is priced based on your unique needs. These tiers represent the range of experience levels — from a clean, functional web presence to a fully automated brand ecosystem. Your quote is always customized after consultation.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          {tiers.map((tier) => (
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

        {/* CTA */}
        <div className="text-center">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold tracking-wide uppercase text-sm hover:bg-primary/90 transition-all hover:-translate-y-0.5"
          >
            Book a Consultation <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>

    <Footer />
  </div>
);

export default Services;
