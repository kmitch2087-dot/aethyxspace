import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";

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
      "Light SEO setup"
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
      "Launch-ready build"
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
      "Post-launch support"
    ],
    accent: "sand"
  }
];

const Services = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Page Intro */}
      <section className="relative bg-hero texture-paper overflow-hidden">
        <div className="organic-shape w-[500px] h-[500px] bg-sage-muted -top-32 -right-32" />
        <div className="organic-shape w-[400px] h-[400px] bg-ocean-muted bottom-10 -left-20" />
        
        <div className="relative z-10 px-6 pt-32 pb-20 md:px-12 lg:px-24 xl:px-32 md:pt-40 md:pb-28">
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

      {/* Services Grid */}
      <section className="relative bg-section-warm texture-paper overflow-hidden">
        <div className="organic-shape w-[600px] h-[600px] bg-sage-light -top-40 left-1/4" />
        <div className="organic-shape w-[400px] h-[400px] bg-ocean-muted bottom-20 right-10" />
        
        <div className="relative z-10 px-6 py-20 md:px-12 lg:px-24 xl:px-32 md:py-28">
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
                      'text-foreground/80'
                    }`}>
                      {service.price}
                    </p>
                  </div>

                  {/* Who it's for */}
                  <div className="mb-8">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Who it's for
                    </p>
                    <p className="text-foreground/80 font-light leading-relaxed">
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
                              'text-foreground/70'
                            }`} />
                          </div>
                          <span className="text-foreground/80 font-light text-sm leading-relaxed">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA */}
                  <Link to="/start-here" className="mt-auto">
                    <Button 
                      className={`w-full rounded-full py-6 transition-all duration-300 hover:-translate-y-0.5 ${
                        service.accent === 'sage' 
                          ? 'bg-sage hover:bg-sage/90 text-white shadow-warm hover:shadow-warm-lg' 
                          : service.accent === 'ocean'
                          ? 'bg-ocean hover:bg-ocean/90 text-white shadow-soft hover:shadow-soft-md'
                          : 'bg-foreground/80 hover:bg-foreground/70 text-white shadow-soft hover:shadow-soft-md'
                      }`}
                    >
                      Start Here
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Reassurance Section */}
      <section className="relative bg-section-cream texture-paper overflow-hidden">
        <div className="organic-shape w-[350px] h-[350px] bg-sage-muted top-10 -right-20" />
        
        <div className="relative z-10 px-6 py-20 md:px-12 lg:px-24 xl:px-32 md:py-28">
          <div className="max-w-xl mx-auto text-center">
            <h3 className="text-2xl md:text-3xl text-foreground font-medium mb-4">
              Not sure which option fits?
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed font-light mb-8">
              Start with the intake form and I'll help guide you to the right choice.
            </p>
            <Link to="/start-here">
              <Button 
                variant="outline"
                size="lg"
                className="rounded-full px-10 py-6 border-sage text-sage hover:bg-sage hover:text-white transition-all duration-300"
              >
                Start Here
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-cream-deep border-t border-border/30">
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
