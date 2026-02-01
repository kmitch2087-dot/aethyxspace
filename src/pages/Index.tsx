import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Sparkles, Layout, Palette } from "lucide-react";
import vibeShiftLogo from "@/assets/vibe-shift-logo.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative bg-hero texture-paper overflow-hidden">
        {/* Organic shapes */}
        <div className="organic-shape w-[600px] h-[600px] bg-sage-muted -top-40 -right-40" />
        <div className="organic-shape w-[500px] h-[500px] bg-ocean-muted bottom-20 -left-32" />
        <div className="organic-shape w-[300px] h-[300px] bg-sand-deep top-1/2 right-1/4" />
        
        <div className="relative z-10 px-6 py-12 md:px-12 lg:px-24 xl:px-32">
          <nav className="mb-20 md:mb-28">
            <img 
              src={vibeShiftLogo} 
              alt="Vibe Shift Studio" 
              className="h-16 md:h-20 w-auto rounded-xl shadow-soft"
            />
          </nav>
          
          <div className="max-w-3xl pb-20 md:pb-28">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.15] text-foreground mb-8 tracking-tight">
              A better online presence — without the chaos.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-12 max-w-2xl font-light">
              Clean, modern websites for small businesses who want to look professional, 
              feel aligned, and stop overthinking their online presence.
            </p>
            <Button 
              size="lg" 
              className="text-base px-10 py-7 rounded-full bg-sage hover:bg-sage/90 text-white shadow-warm transition-all duration-300 hover:shadow-warm-lg hover:-translate-y-0.5"
            >
              Start Here
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Relief & Recognition Section */}
      <section className="relative bg-section-warm texture-paper overflow-hidden">
        <div className="organic-shape w-[400px] h-[400px] bg-sage-light top-10 right-20" />
        
        <div className="relative z-10 px-6 py-28 md:px-12 lg:px-24 xl:px-32 md:py-36">
          <div className="max-w-2xl">
            <span className="inline-block text-sm font-medium text-sage tracking-wide uppercase mb-6">
              We understand
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] text-foreground mb-8 leading-snug font-medium">
              You're not alone if your website feels harder than it should be.
            </h2>
            <p className="text-muted-foreground text-lg md:text-xl leading-relaxed font-light">
              Between picking templates, writing the "right" words, and second-guessing every choice — 
              it's easy to feel stuck. We get it. That's exactly why we focus on clarity over complexity. 
              You don't need more options. You need the right ones, handled with care.
            </p>
          </div>
        </div>
      </section>

      {/* Why This Matters Section */}
      <section className="relative bg-section-sage texture-paper overflow-hidden">
        <div className="organic-shape w-[500px] h-[500px] bg-ocean-light -bottom-20 -right-20" />
        <div className="organic-shape w-[350px] h-[350px] bg-sand top-40 left-10" />
        
        <div className="relative z-10 px-6 py-28 md:px-12 lg:px-24 xl:px-32 md:py-36">
          <div className="max-w-3xl">
            <span className="inline-block text-sm font-medium text-sage tracking-wide uppercase mb-6">
              The reality
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] text-foreground mb-14 font-medium heading-accent">
              Why your online presence matters
            </h2>
            <div className="space-y-5">
              {[
                "Most people research a business online before reaching out or making a purchase.",
                "First impressions happen fast — visitors decide in seconds whether to stay or leave.",
                "A cluttered or outdated site can send the wrong message — even if your work is excellent.",
                "A clear, professional website builds trust before a single conversation."
              ].map((text, i) => (
                <div 
                  key={i}
                  className="flex items-start gap-5 p-6 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/50 shadow-soft transition-all duration-300 hover:shadow-soft-md hover:bg-white/70"
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
      <section className="relative bg-section-cream texture-paper overflow-hidden">
        <div className="organic-shape w-[450px] h-[450px] bg-sage-muted top-20 -right-32" />
        
        <div className="relative z-10 px-6 py-28 md:px-12 lg:px-24 xl:px-32 md:py-36">
          <div className="max-w-2xl">
            <span className="inline-block text-sm font-medium text-ocean tracking-wide uppercase mb-6">
              Our approach
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] text-foreground mb-10 font-medium heading-accent">
              What we do
            </h2>
            <div className="space-y-6">
              <p className="text-muted-foreground text-lg md:text-xl leading-relaxed font-light">
                We design and build websites that remove the friction — so you can stop worrying 
                about fonts, layouts, or "what to say" and start showing up with confidence.
              </p>
              <p className="text-muted-foreground text-lg md:text-xl leading-relaxed font-light">
                We handle the structure, the copy guidance, and all the little details 
                that make a website feel polished and professional. You stay focused on what you do best.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview Section */}
      <section className="relative bg-section-sand texture-paper overflow-hidden">
        <div className="organic-shape w-[600px] h-[600px] bg-sage-light -top-40 left-1/4" />
        <div className="organic-shape w-[400px] h-[400px] bg-ocean-muted bottom-20 right-10" />
        
        <div className="relative z-10 px-6 py-28 md:px-12 lg:px-24 xl:px-32 md:py-36">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <span className="inline-block text-sm font-medium text-sage tracking-wide uppercase mb-6">
                How we help
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] text-foreground font-medium">
                Services
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {/* Service Card 1 */}
              <div className="card-elevated rounded-3xl p-8 md:p-10 transition-all duration-300 hover:-translate-y-1 hover:shadow-warm-lg">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sage-light to-sage-muted flex items-center justify-center mb-8 shadow-soft">
                  <Sparkles className="h-7 w-7 text-sage" />
                </div>
                <h3 className="text-xl md:text-2xl text-foreground mb-4 font-serif font-medium">
                  Online Presence Starter
                </h3>
                <p className="text-muted-foreground leading-relaxed font-light">
                  A simple, single-page website to establish your online presence. 
                  Perfect for those just starting out or refreshing an outdated site.
                </p>
              </div>

              {/* Service Card 2 */}
              <div className="card-elevated rounded-3xl p-8 md:p-10 transition-all duration-300 hover:-translate-y-1 hover:shadow-warm-lg">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ocean-light to-ocean-muted flex items-center justify-center mb-8 shadow-soft">
                  <Layout className="h-7 w-7 text-ocean" />
                </div>
                <h3 className="text-xl md:text-2xl text-foreground mb-4 font-serif font-medium">
                  Professional Brand Website
                </h3>
                <p className="text-muted-foreground leading-relaxed font-light">
                  A multi-page website with clear structure, thoughtful copy, and a design 
                  that reflects your unique brand identity.
                </p>
              </div>

              {/* Service Card 3 */}
              <div className="card-elevated rounded-3xl p-8 md:p-10 transition-all duration-300 hover:-translate-y-1 hover:shadow-warm-lg">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sand to-sand-deep flex items-center justify-center mb-8 shadow-soft">
                  <Palette className="h-7 w-7 text-foreground/70" />
                </div>
                <h3 className="text-xl md:text-2xl text-foreground mb-4 font-serif font-medium">
                  Signature Brand Presence
                </h3>
                <p className="text-muted-foreground leading-relaxed font-light">
                  A comprehensive website experience with premium design, 
                  strategic content, and everything you need to stand out.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="relative bg-section-warm texture-paper overflow-hidden">
        <div className="organic-shape w-[500px] h-[500px] bg-ocean-light top-0 -left-40" />
        <div className="organic-shape w-[350px] h-[350px] bg-sage-muted bottom-20 right-20" />
        
        <div className="relative z-10 px-6 py-28 md:px-12 lg:px-24 xl:px-32 md:py-36">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-20">
              <span className="inline-block text-sm font-medium text-ocean tracking-wide uppercase mb-6">
                Simple & clear
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] text-foreground font-medium">
                How it works
              </h2>
            </div>
            
            {/* Process container with connector */}
            <div className="relative">
              <div className="process-connector" style={{ top: '2rem' }} />
              
              <div className="grid md:grid-cols-4 gap-12 md:gap-8">
                {[
                  { num: "1", title: "Intake", desc: "Fill out a simple form so we can understand your needs and vision.", color: "sage" },
                  { num: "2", title: "Design & Build", desc: "We craft your website with care, handling all the details.", color: "ocean" },
                  { num: "3", title: "Review", desc: "You review and we refine until everything feels just right.", color: "sand" },
                  { num: "4", title: "Launch", desc: "Your polished website goes live, ready to welcome visitors.", color: "sage" }
                ].map((step, i) => (
                  <div key={i} className="text-center relative">
                    <div className={`
                      w-16 h-16 rounded-full mx-auto mb-8 text-xl font-serif font-medium
                      flex items-center justify-center shadow-elevated
                      ${step.color === 'sage' ? 'bg-gradient-to-br from-sage-light to-sage-muted text-sage' : ''}
                      ${step.color === 'ocean' ? 'bg-gradient-to-br from-ocean-light to-ocean-muted text-ocean' : ''}
                      ${step.color === 'sand' ? 'bg-gradient-to-br from-sand to-sand-deep text-foreground/70' : ''}
                    `}>
                      {step.num}
                    </div>
                    <h3 className="font-serif text-xl md:text-2xl text-foreground mb-4 font-medium">
                      {step.title}
                    </h3>
                    <p className="text-sm md:text-base text-muted-foreground font-light leading-relaxed max-w-[200px] mx-auto">
                      {step.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative bg-section-ocean texture-paper overflow-hidden">
        <div className="organic-shape w-[600px] h-[600px] bg-sage-light -top-32 right-1/4" />
        <div className="organic-shape w-[450px] h-[450px] bg-sand bottom-10 -left-20" />
        
        <div className="relative z-10 px-6 py-32 md:px-12 lg:px-24 xl:px-32 md:py-40">
          <div className="max-w-2xl mx-auto text-center">
            <span className="inline-block text-sm font-medium text-ocean tracking-wide uppercase mb-6">
              Ready to begin?
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] text-foreground mb-8 font-medium leading-snug">
              Your business is evolving. Your website should too.
            </h2>
            <p className="text-muted-foreground text-lg md:text-xl leading-relaxed mb-14 font-light">
              When you're ready for an online presence that feels aligned, clear, and 
              professional — we're here to help make it happen.
            </p>
            <Button 
              size="lg" 
              className="text-base px-12 py-8 rounded-full bg-sage hover:bg-sage/90 text-white shadow-warm transition-all duration-300 hover:shadow-warm-lg hover:-translate-y-0.5"
            >
              Start Here
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-cream-deep border-t border-border/30">
        <div className="px-6 py-16 md:px-12 lg:px-24 xl:px-32">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <img 
              src={vibeShiftLogo} 
              alt="Vibe Shift Studio" 
              className="h-14 w-auto opacity-90 rounded-xl shadow-soft"
            />
            <p className="text-sm text-muted-foreground font-light">
              © {new Date().getFullYear()} Vibe Shift Studio. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
