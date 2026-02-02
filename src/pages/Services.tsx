import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Search, TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import watercolorBg from "@/assets/watercolor-bg.jpg";

const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLScleBGGZeacHU4B-gGHDPiZFzOwpPHu8n_80DkwiypsB2nlEw/viewform?usp=publish-editor";

const services = [
  {
    name: "Online Presence Starter",
    price: "$750",
    whoFor: "Small businesses who need a clean, professional website without overcomplicating things.",
    features: [
      "One-page scrolling website",
      "Mobile optimization",
      "Clear call-to-action",
      "Domain connection",
      "Light SEO setup",
      "One revision included"
    ],
    accent: "sage"
  },
  {
    name: "Professional Brand Website",
    price: "$1,500–$2,000",
    whoFor: "Businesses ready to level up their online presence with clearer messaging and more structure.",
    features: [
      "Multi-section or multi-page website",
      "Done-for-you copywriting",
      "Contact forms",
      "SEO foundations",
      "Launch-ready build",
      "One revision included"
    ],
    accent: "ocean"
  },
  {
    name: "Signature Brand Presence",
    price: "Starting at $2,500",
    whoFor: "Brands that want a cohesive, aligned presence across their website and messaging.",
    features: [
      "Full website build",
      "Brand kit (colors, fonts, direction)",
      "Refined messaging",
      "Social bio copy",
      "Post-launch support",
      "One revision included"
    ],
    accent: "sand"
  }
];

const quickServices = [
  {
    name: "Logo Creation",
    price: "$100",
    description: "A custom logo designed to represent your brand. Perfect for new businesses or those ready for a fresh look.",
    priceId: "price_1SwQOyCEyzqaryb8zKLQHt8r"
  },
  {
    name: "Brand Assets From Current Logo",
    price: "$150",
    description: "Transform your existing logo into a complete set of brand assets — social graphics, favicons, and more.",
    priceId: "price_1SwQPkCEyzqaryb8SJkRanuX"
  },
  {
    name: "Logo & Brand Assets Package",
    price: "$200",
    description: "The full package: a brand new logo plus all the assets you need to show up consistently everywhere.",
    priceId: "price_1SwQPxCEyzqaryb8ducbgf3I"
  },
  {
    name: "Site Maintenance Membership",
    price: "$100/mo",
    description: "Ongoing website updates, edits, and support. Cancel anytime — no long-term commitment required.",
    priceId: "price_1SwQQECEyzqaryb8F6NdVpEd",
    isSubscription: true
  }
];

const Services = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Fixed watercolor background */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url(${watercolorBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.27,
        }}
      />

      {/* Page Intro */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 pt-32 pb-20 md:px-12 lg:px-24 xl:px-32 md:pt-40 md:pb-28">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.15] text-foreground mb-8 tracking-tight">
              Services
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-light">
              Whether you need something simple or a more complete brand presence, each option is designed to be clear, intentional, and easy to move forward with.
            </p>
          </div>
        </div>
      </section>

      {/* Consultation Fee Intro */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-12 md:px-12 lg:px-24 xl:px-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="card-elevated rounded-3xl p-8 md:p-12">
              <h2 className="text-2xl md:text-3xl lg:text-4xl text-foreground font-semibold mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-light mb-4">
                Begin your journey by completing our client intake form. For a one-time consultation fee of <span className="font-semibold text-sage">$50</span>, you'll receive a comprehensive review and personalized action plan delivered to your inbox within 48 hours.
              </p>
              <p className="text-base text-muted-foreground leading-relaxed font-light">
                The best part? This fee is fully credited toward your final project total when you decide to work together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-20 md:px-12 lg:px-24 xl:px-32 md:py-28">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {services.map((service, index) => (
                <div 
                  key={index}
                  className="card-elevated rounded-3xl p-8 md:p-10 flex flex-col"
                >
                  {/* Header */}
                  <div className="mb-8">
                    <h2 className="text-xl md:text-2xl text-foreground font-serif font-medium mb-3">
                      {service.name}
                    </h2>
                    <p className={`text-2xl md:text-3xl font-medium ${
                      service.accent === 'sage' ? 'text-sage' : 
                      service.accent === 'ocean' ? 'text-ocean' : 
                      'text-foreground'
                    }`}>
                      {service.price}
                    </p>
                  </div>

                  {/* Who it's for */}
                  <div className="mb-8">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Who it's for
                    </p>
                    <p className="text-foreground font-light leading-relaxed">
                      {service.whoFor}
                    </p>
                  </div>

                  {/* Features */}
                  <div className="mb-10 flex-grow">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
                      What's included
                    </p>
                    <ul className="space-y-3">
                      {service.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            service.accent === 'sage' ? 'bg-sage-light' : 
                            service.accent === 'ocean' ? 'bg-ocean-light' : 
                            'bg-sand'
                          }`}>
                            <Check className={`h-3 w-3 ${
                              service.accent === 'sage' ? 'text-sage' : 
                              service.accent === 'ocean' ? 'text-ocean' : 
                              'text-foreground'
                            }`} />
                          </div>
                          <span className="text-foreground font-light text-sm leading-relaxed">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA */}
                  <div className="mt-auto">
                    <a 
                      href={GOOGLE_FORM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button 
                        className="w-full rounded-full py-6 bg-sage hover:bg-sage/90 text-white shadow-warm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-warm-lg"
                      >
                        Start Here
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </a>
                    <p className="text-center text-sm text-muted-foreground mt-3 font-light">
                      (don't worry, we're not charging you anything yet)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SEO Explanation Section */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-20 md:px-12 lg:px-24 xl:px-32 md:py-28">
          <div className="max-w-4xl mx-auto">
            <div className="card-elevated rounded-3xl p-8 md:p-12">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-ocean-light flex items-center justify-center">
                  <Search className="h-6 w-6 text-ocean" />
                </div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl text-foreground font-semibold">
                  What is SEO & Why Does It Matter?
                </h2>
              </div>
              
              <p className="text-lg text-muted-foreground leading-relaxed font-light mb-8">
                SEO stands for <span className="font-medium text-foreground">Search Engine Optimization</span> — it's how your website gets found when people search online. Think of it as the difference between having a beautiful storefront on a busy street versus a hidden alley.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-sage-light flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-5 w-5 text-sage" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground mb-2">Organic Visibility</h3>
                    <p className="text-sm text-muted-foreground font-light">
                      Good SEO means your ideal customers can find you naturally through Google, without paying for ads.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-sage-light flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-sage" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground mb-2">Trust & Credibility</h3>
                    <p className="text-sm text-muted-foreground font-light">
                      Websites that appear in search results are often perceived as more trustworthy and established.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-base text-muted-foreground leading-relaxed font-light mt-8 pt-6 border-t border-border/30">
                For small businesses, SEO is one of the most cost-effective ways to attract new customers. Every package includes foundational SEO setup to help you get started on the right foot.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Services Section */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-20 md:px-12 lg:px-24 xl:px-32 md:py-28">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl lg:text-5xl text-foreground font-semibold mb-4">
                Quick Services
              </h2>
              <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
                Need something specific? These services come with a <span className="font-medium text-foreground">48-hour turnaround</span> for your first draft. If you need to refine your vision, I'm here with you until we achieve that.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickServices.map((service, index) => (
                <div 
                  key={index}
                  className="bg-white rounded-3xl p-6 shadow-warm flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-warm-lg"
                >
                  <h3 className="text-lg font-serif font-medium text-foreground mb-2">
                    {service.name}
                  </h3>
                  <p className={`text-2xl font-medium mb-4 ${service.isSubscription ? 'text-ocean' : 'text-sage'}`}>
                    {service.price}
                  </p>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed flex-grow mb-4">
                    {service.description}
                  </p>
                  {service.isSubscription && (
                    <p className="text-xs text-ocean font-medium mb-4">
                      Cancel anytime
                    </p>
                  )}
                  <a 
                    href={GOOGLE_FORM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button 
                      className="w-full rounded-full py-5 bg-sage hover:bg-sage/90 text-white shadow-warm transition-all duration-300 hover:-translate-y-0.5"
                      size="sm"
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8 font-light">
              Payment in full at time of ordering. Google forms for each service coming soon.
            </p>
          </div>
        </div>
      </section>

      {/* Reassurance Section */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-20 md:px-12 lg:px-24 xl:px-32 md:py-28">
          <div className="max-w-xl mx-auto text-center">
            <h3 className="text-2xl md:text-3xl lg:text-4xl text-foreground font-semibold mb-4">
              Not sure which option fits?
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed font-light mb-8">
              Start with the intake form and I'll help guide you to the right choice.
            </p>
            <a 
              href={GOOGLE_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button 
                size="lg"
                className="rounded-full px-10 py-6 bg-sage hover:bg-sage/90 text-white shadow-warm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-warm-lg"
              >
                Start Here
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <p className="text-sm text-muted-foreground mt-4 font-light">
              (don't worry, we're not charging you anything yet)
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-cream-deep border-t border-border/30">
        <div className="px-6 py-12 md:px-12 lg:px-24 xl:px-32">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-muted-foreground font-light">
              © {new Date().getFullYear()} Vibe Shift Studio. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Services;
