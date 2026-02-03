import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, HelpCircle, Info } from "lucide-react";
import Header from "@/components/Header";
import watercolorBg from "@/assets/watercolor-bg.jpg";
import SeoPopup from "@/components/SeoPopup";
import WaitingListPopup from "@/components/WaitingListPopup";
import PaintSplat from "@/components/PaintSplat";
import ServiceInfoPopup from "@/components/ServiceInfoPopup";
import ServiceSelectionPopup from "@/components/ServiceSelectionPopup";

const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLScleBGGZeacHU4B-gGHDPiZFzOwpPHu8n_80DkwiypsB2nlEw/viewform";

const services = [
  {
    name: "Online Presence Starter",
    price: "$750",
    tier: 1 as const,
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
    tier: 2 as const,
    whoFor: "Businesses ready to level up their online presence with clearer messaging and more structure.",
    features: [
      "Everything in Tier 1, plus:",
      "Multi-section or multi-page website",
      "Done-for-you copywriting",
      "Contact forms",
      "SEO foundations",
      "Launch-ready build",
      "Two revisions included"
    ],
    accent: "ocean"
  },
  {
    name: "Signature Brand Presence",
    price: "Starting at $2,500",
    tier: 3 as const,
    whoFor: "Brands that want a cohesive, aligned presence across their website and messaging.",
    features: [
      "Everything in Tier 1 & 2, plus:",
      "Full website build",
      "Brand kit (colors, fonts, direction)",
      "Refined messaging",
      "Social bio copy",
      "Post-launch support",
      "Three revisions included"
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
    price: "Starting at $100/mo",
    description: "3.5 hours of updates per month (~3 updates). Additional hours billed at $30/hr. Cancel anytime.",
    priceId: "price_1SwQQECEyzqaryb8F6NdVpEd",
    isSubscription: true
  }
];

const Services = () => {
  const [seoPopupOpen, setSeoPopupOpen] = useState(false);
  const [waitingListOpen, setWaitingListOpen] = useState(false);
  const [serviceInfoOpen, setServiceInfoOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<1 | 2 | 3>(1);
  const [serviceSelectionOpen, setServiceSelectionOpen] = useState(false);
  const [selectedServiceName, setSelectedServiceName] = useState<string>("");

  const handleOpenServiceInfo = (tier: 1 | 2 | 3) => {
    setSelectedTier(tier);
    setServiceInfoOpen(true);
  };

  const handleStartService = (serviceName: string) => {
    setSelectedServiceName(serviceName);
    setServiceSelectionOpen(true);
  };
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
        <div className="relative px-6 pt-32 pb-12 md:px-12 lg:px-24 xl:px-32 md:pt-40 md:pb-16">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.15] text-foreground mb-8 tracking-tight">
              Services
            </h1>
            <p className="text-xl md:text-2xl text-foreground leading-relaxed font-semibold">
              Whether you need something simple or a more complete brand presence, each option is designed to be clear, intentional, and easy to move forward with.
            </p>
          </div>
        </div>
      </section>

      {/* Consultation Fee Intro */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-8 md:px-12 lg:px-24 xl:px-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="card-elevated rounded-3xl p-8 md:p-12">
              <h2 className="text-2xl md:text-3xl lg:text-4xl text-foreground font-semibold mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-lg md:text-xl text-foreground leading-relaxed font-medium mb-4">
                Begin your journey by completing our client intake form. For a one-time consultation fee of <span className="font-bold text-sage">$50</span>, you'll receive a comprehensive review and personalized action plan delivered to your inbox within 48 hours.
              </p>
              <p className="text-base text-foreground leading-relaxed font-medium">
                The best part? This fee is fully credited toward your final project total when you decide to work together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-12 md:px-12 lg:px-24 xl:px-32 md:py-16">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {services.map((service, index) => (
                <div 
                  key={index}
                  className="card-elevated rounded-3xl p-8 md:p-10 flex flex-col"
                >
                  {/* Header */}
                  <div className="mb-8 text-center">
                    <p className="text-sm font-semibold text-sage uppercase tracking-wide mb-2">
                      Tier {service.tier}
                    </p>
                    <button
                      onClick={() => handleOpenServiceInfo(service.tier)}
                      className="inline-flex items-center gap-2 group cursor-pointer"
                    >
                      <h2 className="text-xl md:text-2xl text-foreground font-serif font-semibold group-hover:text-sage transition-colors">
                        {service.name}
                      </h2>
                      <div className="w-5 h-5 rounded-full border-2 border-sage flex items-center justify-center group-hover:bg-sage transition-colors">
                        <Info className="h-3 w-3 text-sage group-hover:text-white transition-colors" />
                      </div>
                    </button>
                    <p className="text-2xl md:text-3xl font-bold text-sage mt-3">
                      {service.price}
                    </p>
                  </div>

                  {/* Who it's for */}
                  <div className="mb-8">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Who it's for
                    </p>
                    <p className="text-foreground font-medium leading-relaxed">
                      {service.whoFor}
                    </p>
                  </div>

                  {/* Features */}
                  <div className="mb-10 flex-grow">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                      What's included
                    </p>
                    <ul className="space-y-3">
                      {service.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-sage-light">
                            <Check className="h-3 w-3 text-sage" />
                          </div>
                          <span className="text-foreground font-medium text-sm leading-relaxed">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA */}
                  <div className="mt-auto">
                    <Button 
                      onClick={() => handleStartService(service.name)}
                      className="w-full rounded-full py-6 bg-sage hover:bg-sage/90 text-white shadow-warm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-warm-lg"
                    >
                      Start Here
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <p className="text-center text-sm text-muted-foreground mt-3 font-medium">
                      (don't worry, we're not charging you anything yet)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Services Section - Moved up */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-12 md:px-12 lg:px-24 xl:px-32 md:py-16">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl lg:text-5xl text-foreground font-bold mb-4">
                Quick Deliverables
              </h2>
              <p className="text-xl md:text-2xl text-foreground font-semibold max-w-2xl mx-auto">
                Need something specific? These services come with a <span className="text-sage">48-hour turnaround</span> for your first draft. If you need to refine your vision, I'm here with you until we achieve that.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickServices.map((service, index) => (
                <div 
                  key={index}
                  className="bg-white rounded-3xl p-6 shadow-warm flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-warm-lg"
                >
                  <div className="mb-3">
                    <PaintSplat number={String(index + 1)} color={index % 2 === 0 ? "sage" : "ocean"} />
                  </div>
                  <h3 className="text-lg font-serif font-semibold text-foreground mb-2 text-center">
                    {service.name}
                  </h3>
                  <p className="text-2xl font-bold text-sage mb-4 text-center">
                    {service.price}
                  </p>
                  <p className="text-sm text-foreground font-medium leading-relaxed flex-grow mb-4">
                    {service.description}
                  </p>
                  {service.isSubscription ? (
                    <Button 
                      onClick={() => setWaitingListOpen(true)}
                      className="w-full rounded-full py-5 bg-ocean hover:bg-ocean/90 text-white shadow-warm transition-all duration-300 hover:-translate-y-0.5"
                      size="sm"
                    >
                      Get on the Waiting List
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
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
                  )}
                </div>
              ))}
            </div>

            {/* SEO Link */}
            <div className="mt-8 text-center">
              <button
                onClick={() => setSeoPopupOpen(true)}
                className="inline-flex items-center gap-2 text-ocean hover:text-ocean/80 font-semibold text-lg transition-colors underline underline-offset-4"
              >
                <HelpCircle className="h-5 w-5" />
                What is SEO and why is it so important for small businesses?
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Reassurance Section */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-16 md:px-12 lg:px-24 xl:px-32 md:py-20">
          <div className="max-w-xl mx-auto text-center">
            <h3 className="text-2xl md:text-3xl lg:text-4xl text-foreground font-bold mb-4">
              Not sure which option fits?
            </h3>
            <p className="text-foreground text-xl md:text-2xl leading-relaxed font-semibold mb-8">
              Start with the intake form and I'll help guide you to the right choice.
            </p>
            <Button 
              onClick={() => handleStartService("")}
              size="lg"
              className="rounded-full px-10 py-6 bg-sage hover:bg-sage/90 text-white shadow-warm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-warm-lg"
            >
              Start Here
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-sm text-muted-foreground mt-4 font-medium">
              (don't worry, we're not charging you anything yet)
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-cream-deep border-t border-border/30">
        <div className="px-6 py-12 md:px-12 lg:px-24 xl:px-32">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-muted-foreground font-medium">
              © {new Date().getFullYear()} Vibe Shift Studio. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Popups */}
      <SeoPopup open={seoPopupOpen} onOpenChange={setSeoPopupOpen} />
      <WaitingListPopup open={waitingListOpen} onOpenChange={setWaitingListOpen} />
      <ServiceInfoPopup 
        open={serviceInfoOpen} 
        onOpenChange={setServiceInfoOpen} 
        tier={selectedTier} 
      />
      <ServiceSelectionPopup 
        open={serviceSelectionOpen} 
        onOpenChange={setServiceSelectionOpen} 
        serviceName={selectedServiceName}
      />
    </div>
  );
};

export default Services;
