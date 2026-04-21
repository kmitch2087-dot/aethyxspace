import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RefreshCw, Shield, Zap } from "lucide-react";
import Header from "@/components/Header";
import WaitingListPopup from "@/components/WaitingListPopup";

const Membership = () => {
  const [waitingListOpen, setWaitingListOpen] = useState(false);
  return (
    <div className="min-h-screen bg-transparent">
      <Header />
      
      {/* Hero Section */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 pt-[200px] pb-6 md:px-12 lg:px-24 xl:px-32 md:pt-[240px] md:pb-8">
          <div className="max-w-3xl mx-auto text-center">
            <span className="block text-sm font-medium text-sage tracking-wide uppercase mb-3">
              Ongoing support
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.15] text-foreground mb-6 tracking-tight">
              Site Maintenance Membership
            </h1>
            <p className="text-lg text-foreground leading-relaxed max-w-2xl mx-auto font-sans font-medium md:text-2xl">
              Keep your website running smoothly with ongoing care, updates, & priority support.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-8 md:px-12 lg:px-24 xl:px-32 md:py-12">
          <div className="max-w-lg mx-auto">
            <div className="card-elevated rounded-3xl p-8 md:p-10 text-center">
              <div className="mb-6">
                <span className="text-5xl md:text-6xl font-display font-medium text-foreground">$100</span>
                <span className="text-xl text-muted-foreground font-light">/month</span>
              </div>
              
              <p className="text-foreground text-lg md:text-xl leading-relaxed font-medium mb-8">
                Everything you need to keep your site secure, updated, & performing at its best.
              </p>
              
              <Button size="lg" onClick={() => setWaitingListOpen(true)} className="w-full text-base px-8 py-6 rounded-full bg-sage hover:bg-sage/90 text-white shadow-warm transition-all duration-300 hover:shadow-warm-lg hover:-translate-y-0.5">
                Get on the Waiting List
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* What's Included Section */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-8 md:px-12 lg:px-24 xl:px-32 md:py-12">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <span className="block text-sm font-medium text-ocean tracking-wide uppercase mb-3">
                What's included
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl text-foreground font-semibold">
                Membership Benefits
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {[{
              icon: RefreshCw,
              title: "Regular Updates",
              desc: "Software updates, security patches, & plugin maintenance to keep everything current.",
              color: "sage"
            }, {
              icon: Shield,
              title: "Security Monitoring",
              desc: "Ongoing security checks & backups to protect your site & your visitors.",
              color: "ocean"
            }, {
              icon: Zap,
              title: "Priority Support",
              desc: "Fast response times when you need changes or have questions about your site.",
              color: "sage"
            }, {
              icon: CheckCircle2,
              title: "Content Updates",
              desc: "Small text & image updates included each month to keep your site fresh.",
              color: "ocean"
            }].map((item, i) => <div key={i} className="card-elevated rounded-3xl p-5 md:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-warm-lg">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-soft ${item.color === 'sage' ? 'bg-gradient-to-br from-sage-light to-sage-muted' : 'bg-gradient-to-br from-ocean-light to-ocean-muted'}`}>
                    <item.icon className={`h-5 w-5 ${item.color === 'sage' ? 'text-sage' : 'text-ocean'}`} />
                  </div>
                  <h3 className="text-xl text-foreground mb-2 font-display font-medium">
                    {item.title}
                  </h3>
                  <p className="text-foreground leading-relaxed font-light text-sm">
                    {item.desc}
                  </p>
                </div>)}
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-8 md:px-12 lg:px-24 xl:px-32 md:py-12">
          <div className="max-w-2xl">
            <span className="block text-sm font-medium text-sage tracking-wide uppercase mb-3 text-left">
          </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl text-foreground mb-4 font-semibold text-left">This is the ideal option for;</h2>
            <div className="space-y-3">
              {["Business owners who want their website taken care of without the tech headaches.", "Anyone who values having a professional handle the behind-the-scenes work.", "Sites that need regular content updates but don't require constant redesigns."].map((text, i) => <div key={i} className="gap-4 p-4 rounded-2xl border border-border/30 shadow-soft items-center justify-start flex flex-row bg-destructive-foreground">
                  <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-sage" />
                  </div>
                  <p className="text-foreground text-lg font-light leading-relaxed pt-0.5">
                    {text}
                  </p>
                </div>)}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-12 md:px-12 lg:px-24 xl:px-32 md:py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl text-foreground mb-4 font-semibold leading-snug">
              Ready for peace of mind?
            </h2>
            <p className="text-foreground text-lg md:text-2xl leading-relaxed mb-8 font-medium">
              Let me handle the maintenance so you can focus on what you do best.
            </p>
            <Button size="lg" onClick={() => setWaitingListOpen(true)} className="text-base px-10 py-6 rounded-full bg-sage hover:bg-sage/90 text-white shadow-warm transition-all duration-300 hover:shadow-warm-lg hover:-translate-y-0.5">
              Get on the Waiting List
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-cream-deep border-t border-border/30">
        <div className="px-6 py-12 md:px-12 lg:px-24 xl:px-32">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-foreground font-light">
              © {new Date().getFullYear()} Vibe Shift Studio. All rights reserved.
            </p>
            <Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>

      {/* Waiting List Popup */}
      <WaitingListPopup open={waitingListOpen} onOpenChange={setWaitingListOpen} />
    </div>
  );
};

export default Membership;