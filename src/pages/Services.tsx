import { Link } from "react-router-dom";
import { ArrowRight, Check, Star } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SERVICE_TIERS, QUICK_SERVICES, ADD_ONS, APP_DEVELOPMENT } from "@/lib/stripePrices";

const tiers: Array<{ priceId: string; name: string; price: string; features: string[]; featured?: boolean }> = [
  {
    ...SERVICE_TIERS.tier1,
    features: ["Single-page or multi-page site", "Mobile responsive", "Basic SEO setup", "Contact form", "1 round of revisions"],
  },
  {
    ...SERVICE_TIERS.tier2,
    features: ["Custom multi-page design", "Brand-aligned copywriting", "Advanced SEO", "Blog or CMS integration", "2 revision sessions after simmer period"],
    featured: true,
  },
  {
    ...SERVICE_TIERS.tier3,
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
          Every project is tailored. Pick your tier, add what you need, and let's build.
        </p>

        {/* Tiers */}
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
              <h3 className="font-display text-2xl mb-2">{tier.name}</h3>
              <p className="text-primary text-2xl font-bold mb-6">{tier.price}</p>
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
