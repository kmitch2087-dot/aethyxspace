import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Sparkles, Layout, Palette } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import vibeShiftLogo from "@/assets/vibe-shift-logo.jpg";
import watercolorBg from "@/assets/watercolor-bg.jpg";

const Index = () => {
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
      
      {/* Hero Section */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 pt-28 pb-12 md:px-12 lg:px-24 xl:px-32 md:pt-36 md:pb-16">
          
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.15] text-foreground mb-6 tracking-tight">
              A better online presence — without the chaos.
            </h1>
            <p className="text-lg md:text-xl text-foreground leading-relaxed max-w-2xl mx-auto font-light">
              Clean, modern websites for small businesses who want to look professional, 
              feel aligned, and stop overthinking their online presence.
            </p>
          </div>
        </div>
      </section>

      {/* Relief & Recognition Section */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-16 md:px-12 lg:px-24 xl:px-32 md:py-20">
          <div className="max-w-2xl">
            <span className="block text-sm font-medium text-sage tracking-wide uppercase mb-4">
              We understand
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl text-foreground mb-6 leading-snug font-semibold">
              You're not alone if your website feels harder than it should be.
            </h2>
            <p className="text-foreground text-lg md:text-xl leading-relaxed font-light">
              Between picking templates, writing the "right" words, and second-guessing every choice — 
              it's easy to feel stuck. We get it. That's exactly why we focus on clarity over complexity. 
              You don't need more options. You need the right ones, handled with care.
            </p>
          </div>
        </div>
      </section>

      {/* Why This Matters Section */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-16 md:px-12 lg:px-24 xl:px-32 md:py-20">
          <div className="max-w-3xl">
            <span className="block text-sm font-medium text-sage tracking-wide uppercase mb-4">
              The reality
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl text-foreground mb-10 font-semibold heading-accent">
              Why your online presence matters
            </h2>
            <div className="space-y-4">
              {[
                "Most people research a business online before reaching out or making a purchase.",
                "First impressions happen fast — visitors decide in seconds whether to stay or leave.",
                "A cluttered or outdated site can send the wrong message — even if your work is excellent.",
                "A clear, professional website builds trust before a single conversation."
              ].map((text, i) => (
                <div 
                  key={i}
                  className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-border/30 shadow-soft transition-all duration-300 hover:shadow-soft-md"
                >
                  <div className="w-8 h-8 rounded-full bg-sage-light flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-sage" />
                  </div>
                  <p className="text-foreground text-lg font-light leading-relaxed pt-0.5">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What We Do Section */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-16 md:px-12 lg:px-24 xl:px-32 md:py-20">
          <div className="max-w-2xl">
            <span className="block text-sm font-medium text-ocean tracking-wide uppercase mb-4">
              Our approach
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl text-foreground mb-6 font-semibold heading-accent">
              What we do
            </h2>
            <div className="space-y-4">
              <p className="text-foreground text-lg md:text-xl leading-relaxed font-light">
                We design and build websites that remove the friction — so you can stop worrying 
                about fonts, layouts, or "what to say" and start showing up with confidence.
              </p>
              <p className="text-foreground text-lg md:text-xl leading-relaxed font-light">
                We handle the structure, the copy guidance, and all the little details 
                that make a website feel polished and professional. You stay focused on what you do best.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview Section */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-16 md:px-12 lg:px-24 xl:px-32 md:py-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <span className="block text-sm font-medium text-sage tracking-wide uppercase mb-4">
                How we help
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl text-foreground font-semibold">
                Services
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* Service Card 1 */}
              <div className="card-elevated rounded-3xl p-6 md:p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-warm-lg">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sage-light to-sage-muted flex items-center justify-center mb-6 shadow-soft">
                  <Sparkles className="h-6 w-6 text-sage" />
                </div>
                <h3 className="text-xl md:text-2xl text-foreground mb-3 font-serif font-medium">
                  Online Presence Starter
                </h3>
                <p className="text-foreground leading-relaxed font-light">
                  A simple, single-page website to establish your online presence. 
                  Perfect for those just starting out or refreshing an outdated site.
                </p>
              </div>

              {/* Service Card 2 */}
              <div className="card-elevated rounded-3xl p-6 md:p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-warm-lg">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-ocean-light to-ocean-muted flex items-center justify-center mb-6 shadow-soft">
                  <Layout className="h-6 w-6 text-ocean" />
                </div>
                <h3 className="text-xl md:text-2xl text-foreground mb-3 font-serif font-medium">
                  Professional Brand Website
                </h3>
                <p className="text-foreground leading-relaxed font-light">
                  A multi-page website with clear structure, thoughtful copy, and a design 
                  that reflects your unique brand identity.
                </p>
              </div>

              {/* Service Card 3 */}
              <div className="card-elevated rounded-3xl p-6 md:p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-warm-lg">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sand to-sand-deep flex items-center justify-center mb-6 shadow-soft">
                  <Palette className="h-6 w-6 text-foreground" />
                </div>
                <h3 className="text-xl md:text-2xl text-foreground mb-3 font-serif font-medium">
                  Signature Brand Presence
                </h3>
                <p className="text-foreground leading-relaxed font-light">
                  A comprehensive website experience with premium design, 
                  strategic content, and everything you need to stand out.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-16 md:px-12 lg:px-24 xl:px-32 md:py-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <span className="block text-sm font-medium text-ocean tracking-wide uppercase mb-4">
                Simple & clear
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl text-foreground font-semibold">
                How it works
              </h2>
            </div>
            
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { num: "1", title: "Intake", desc: "Fill out a simple form so we can understand your needs and vision.", color: "sage" },
                { num: "2", title: "Design & Build", desc: "We craft your website with care, handling all the details.", color: "ocean" },
                { num: "3", title: "Review", desc: "You review and we refine until everything feels just right.", color: "sand" },
                { num: "4", title: "Launch", desc: "Your polished website goes live, ready to welcome visitors.", color: "sage" }
              ].map((step, i) => (
                <div 
                  key={i} 
                  className="card-elevated rounded-3xl p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-warm-lg"
                >
                  <div className={`
                    w-12 h-12 rounded-full mx-auto mb-4 text-lg font-serif font-medium
                    flex items-center justify-center shadow-soft
                    ${step.color === 'sage' ? 'bg-gradient-to-br from-sage-light to-sage-muted text-sage' : ''}
                    ${step.color === 'ocean' ? 'bg-gradient-to-br from-ocean-light to-ocean-muted text-ocean' : ''}
                    ${step.color === 'sand' ? 'bg-gradient-to-br from-sand to-sand-deep text-foreground' : ''}
                  `}>
                    {step.num}
                  </div>
                  <h3 className="font-serif text-xl text-foreground mb-2 font-medium">
                    {step.title}
                  </h3>
                  <p className="text-sm text-foreground font-light leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative px-6 py-20 md:px-12 lg:px-24 xl:px-32 md:py-24">
          <div className="max-w-2xl mx-auto text-center">
            <span className="block text-sm font-medium text-ocean tracking-wide uppercase mb-4">
              Ready to begin?
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl text-foreground mb-6 font-semibold leading-snug">
              Your business is evolving. Your website should too.
            </h2>
            <p className="text-foreground text-lg md:text-xl leading-relaxed mb-10 font-light">
              When you're ready for an online presence that feels aligned, clear, and 
              professional — we're here to help make it happen.
            </p>
            <Link to="/start-here">
              <Button 
                size="lg" 
                className="text-base px-12 py-8 rounded-full bg-sage hover:bg-sage/90 text-white shadow-warm transition-all duration-300 hover:shadow-warm-lg hover:-translate-y-0.5"
              >
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
            <img 
              src={vibeShiftLogo} 
              alt="Vibe Shift Studio" 
              className="h-20 md:h-24 w-auto opacity-90 rounded-xl shadow-soft"
            />
            <p className="text-sm text-foreground font-light">
              © {new Date().getFullYear()} Vibe Shift Studio. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
