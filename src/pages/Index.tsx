import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import PaintSplat from "@/components/PaintSplat";
import vibeShiftLogo from "@/assets/vibe-shift-logo.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-cream">
      <Header />
      
      {/* Hero Section */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 pt-[calc(var(--fixed-banner-height)+12px)] pb-6 md:px-12 lg:px-24 xl:px-32 md:pt-[calc(var(--fixed-banner-height)+16px)] md:pb-8">
          
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.15] text-foreground mb-6 tracking-tight">
              A better online presence — without the chaos.
            </h1>
            <p className="text-lg text-foreground leading-relaxed max-w-2xl mx-auto font-sans font-medium md:text-2xl">
              Clean, modern websites for small businesses who want to look professional, 
              feel aligned, and stop overthinking their online presence.
            </p>
          </div>
        </div>
      </section>

      {/* Relief & Recognition + Why This Matters - Side by Side */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-8 md:px-12 lg:px-24 xl:px-32 md:py-12">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* The Reality - NOW FIRST */}
            <div>
              <span className="block text-sm font-medium text-sage tracking-wide uppercase mb-3">
                The reality
              </span>
              <h2 className="text-2xl md:text-3xl lg:text-4xl text-foreground mb-4 font-semibold">
                Why your online presence matters
              </h2>
              <ul className="space-y-2 text-left">
                {["Most people research a business online before reaching out or making a purchase.", "First impressions happen fast — visitors decide in seconds whether to stay or leave.", "A cluttered or outdated site can send the wrong message — even if your work is excellent.", "A clear, professional website builds trust before a single conversation."].map((text, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-sage flex-shrink-0 mt-0.5" />
                    <span className="text-foreground text-base md:text-lg font-medium leading-relaxed">
                      {text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* We Understand - NOW SECOND */}
            <div>
              <span className="block text-sm font-medium text-sage tracking-wide uppercase mb-3">
                We understand
              </span>
              <h2 className="text-2xl md:text-3xl lg:text-4xl text-foreground mb-4 leading-snug font-semibold">
                You're not alone if your website feels harder than it should be.
              </h2>
              <p className="text-foreground text-base md:text-lg leading-relaxed font-medium">
                Between picking templates, writing the "right" words, and second-guessing every choice — 
                it's easy to feel stuck. We get it. That's exactly why we focus on clarity over complexity. 
                You don't need more options. You need the right ones, handled with care.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do Section - Centered */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-6 md:px-12 lg:px-24 xl:px-32 md:py-8">
          <div className="max-w-3xl mx-auto text-center">
            <span className="block text-sm font-medium text-ocean tracking-wide uppercase mb-3">
              Our approach
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl text-foreground mb-4 font-semibold">
              What we do
            </h2>
            <div className="space-y-3">
              <p className="text-foreground text-lg md:text-xl leading-relaxed font-medium">
                We design and build websites that remove the friction — so you can stop worrying 
                about fonts, layouts, or "what to say" and start showing up with confidence.
              </p>
              <p className="text-foreground text-lg md:text-xl leading-relaxed font-medium">
                We handle the structure, the copy guidance, and all the little details 
                that make a website feel polished and professional. You stay focused on what you do best.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview Section */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-8 md:px-12 lg:px-24 xl:px-32 md:py-12">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-6">
              <span className="block text-sm font-medium text-sage tracking-wide uppercase mb-3">
                How we help
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl text-foreground font-semibold">
                Services
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              {/* Service Card 1 */}
              <div className="card-service p-5 md:p-6 transition-all duration-300 hover:-translate-y-0.5">
                <PaintSplat number="1" color="sage" />
                <h3 className="text-xl md:text-2xl text-foreground mb-2 font-display font-medium">
                  Online Presence Starter
                </h3>
                <p className="text-foreground leading-relaxed font-light text-sm">
                  A simple, single-page website to establish your online presence. 
                  Perfect for those just starting out or refreshing an outdated site.
                </p>
              </div>

              {/* Service Card 2 */}
              <div className="card-service p-5 md:p-6 transition-all duration-300 hover:-translate-y-0.5">
                <PaintSplat number="2" color="ocean" />
                <h3 className="text-xl md:text-2xl text-foreground mb-2 font-display font-medium">
                  Professional Brand Website
                </h3>
                <p className="text-foreground leading-relaxed font-light text-sm">
                  A multi-page website with clear structure, thoughtful copy, and a design 
                  that reflects your unique brand identity.
                </p>
              </div>

              {/* Service Card 3 */}
              <div className="card-service p-5 md:p-6 transition-all duration-300 hover:-translate-y-0.5">
                <PaintSplat number="3" color="sage" />
                <h3 className="text-xl md:text-2xl text-foreground mb-2 font-display font-medium">
                  Signature Brand Presence
                </h3>
                <p className="text-foreground leading-relaxed font-light text-sm">
                  A comprehensive website experience with premium design, 
                  strategic content, and everything you need to stand out.
                </p>
              </div>
            </div>

            {/* Deliverables Row */}
            <div className="mt-6">
              <div className="text-center mb-4">
                <span className="block text-sm font-medium text-ocean tracking-wide uppercase mb-2">
                  Quick add-ons
                </span>
                <h3 className="text-2xl md:text-3xl text-foreground font-semibold">
                  Deliverables
                </h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { num: "1", label: "Logo Creation", color: "sage" as const },
                  { num: "2", label: "Brand Assets", color: "ocean" as const },
                  { num: "3", label: "Full Package", color: "sage" as const },
                  { num: "4", label: "Maintenance", color: "ocean" as const },
                ].map((item, i) => (
                  <div key={i} className="card-service p-4 text-center transition-all duration-300 hover:-translate-y-0.5">
                    <PaintSplat number={item.num} color={item.color} />
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-8 md:px-12 lg:px-24 xl:px-32 md:py-12">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <span className="block text-sm font-medium text-ocean tracking-wide uppercase mb-3">
                Simple & clear
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl text-foreground font-semibold">
                How it works
              </h2>
            </div>
            
            <div className="grid md:grid-cols-4 gap-4">
              {[{
                num: "1",
                title: "Intake",
                desc: "Fill out a simple form so we can understand your needs and vision.",
                color: "sage" as const
              }, {
                num: "2",
                title: "Design & Build",
                desc: "We craft your website with care, handling all the details.",
                color: "ocean" as const
              }, {
                num: "3",
                title: "Review",
                desc: "You review and we refine until everything feels just right.",
                color: "sage" as const
              }, {
                num: "4",
                title: "Launch",
                desc: "Your polished website goes live, ready to welcome visitors.",
                color: "ocean" as const
              }].map((step, i) => (
                <div key={i} className="card-service p-5 text-center transition-all duration-300 hover:-translate-y-0.5">
                  <PaintSplat number={step.num} color={step.color} />
                  <h3 className="font-display text-xl md:text-2xl text-foreground mb-2 font-medium">
                    {step.title}
                  </h3>
                  <p className="text-base md:text-lg text-foreground font-medium leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Choose Your Path */}
            <div className="mt-10 text-center">
              <h3 className="text-2xl md:text-3xl lg:text-4xl text-foreground font-semibold mb-4">
                Choose Your Path
              </h3>
              <p className="text-lg md:text-xl text-foreground font-medium max-w-2xl mx-auto">
                Whether you're starting from scratch or ready to level up, we have a service that fits your needs and budget.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-12 md:px-12 lg:px-24 xl:px-32 md:py-16">
          <div className="max-w-2xl mx-auto text-center">
            <span className="block text-sm font-medium text-ocean tracking-wide uppercase mb-3">
              Ready to begin?
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl text-foreground mb-4 font-semibold leading-snug">
              Your business is evolving. Your website should too.
            </h2>
            <p className="text-foreground text-lg md:text-2xl leading-relaxed mb-8 font-medium">
              When you're ready for an online presence that feels aligned, clear, and 
              professional — we're here to help make it happen.
            </p>
            <Link to="/start-here">
              <Button size="lg" className="text-base px-10 py-6 rounded-full bg-sage hover:bg-sage/90 text-white shadow-warm transition-all duration-300 hover:shadow-warm-lg hover:-translate-y-0.5">
                Start Here
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-cream-deep border-t border-border/30">
        <div className="px-6 py-12 md:px-12 lg:px-24 xl:px-32">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <img src={vibeShiftLogo} alt="Vibe Shift Studio" className="h-20 md:h-24 w-auto opacity-90 rounded-xl shadow-soft" />
            <div className="flex flex-col items-center md:items-end gap-2">
              <p className="text-sm text-foreground font-light">
                © {new Date().getFullYear()} Vibe Shift Studio. All rights reserved.
              </p>
              <Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
