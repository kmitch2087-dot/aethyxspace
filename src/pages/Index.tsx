import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Sparkles, Layout, Palette } from "lucide-react";
import vibeShiftLogo from "@/assets/vibe-shift-logo.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-soft-gradient texture-paper">
      {/* Hero Section */}
      <header className="bg-watercolor-cream px-6 py-10 md:px-12 lg:px-24 xl:px-32">
        <nav className="mb-20 md:mb-28">
          <img 
            src={vibeShiftLogo} 
            alt="Vibe Shift Studio" 
            className="h-16 md:h-20 w-auto rounded-lg"
          />
        </nav>
        
        <div className="max-w-3xl pb-16 md:pb-24">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium leading-tight text-foreground mb-8">
            A better online presence — without the chaos.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-12 max-w-2xl font-light">
            Clean, modern websites for small businesses who want to look professional, 
            feel aligned, and stop overthinking their online presence.
          </p>
          <Button 
            size="lg" 
            className="text-base px-8 py-6 rounded-full bg-sage hover:bg-sage/90 text-white shadow-soft transition-all duration-300 hover:shadow-warm"
          >
            Start Here
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Relief & Recognition Section */}
      <section className="px-6 py-24 md:px-12 lg:px-24 xl:px-32 md:py-32 bg-warm-white">
        <div className="max-w-2xl">
          <h2 className="text-3xl md:text-4xl text-foreground mb-8 leading-snug">
            You're not alone if your website feels harder than it should be.
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed font-light">
            Between picking templates, writing the "right" words, and second-guessing every choice — 
            it's easy to feel stuck. We get it. That's exactly why we focus on clarity over complexity. 
            You don't need more options. You need the right ones, handled with care.
          </p>
        </div>
      </section>

      {/* Soft divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Why This Matters Section */}
      <section className="px-6 py-24 md:px-12 lg:px-24 xl:px-32 md:py-32 bg-watercolor-sage">
        <div className="max-w-3xl">
          <h2 className="text-3xl md:text-4xl text-foreground mb-12">
            Why your online presence matters
          </h2>
          <div className="space-y-8">
            <div className="flex items-start gap-5 p-5 rounded-2xl bg-white/50 backdrop-blur-sm">
              <CheckCircle2 className="h-6 w-6 text-sage mt-0.5 flex-shrink-0" />
              <p className="text-foreground text-lg font-light">
                Most people research a business online before reaching out or making a purchase.
              </p>
            </div>
            <div className="flex items-start gap-5 p-5 rounded-2xl bg-white/50 backdrop-blur-sm">
              <CheckCircle2 className="h-6 w-6 text-sage mt-0.5 flex-shrink-0" />
              <p className="text-foreground text-lg font-light">
                First impressions happen fast — visitors decide in seconds whether to stay or leave.
              </p>
            </div>
            <div className="flex items-start gap-5 p-5 rounded-2xl bg-white/50 backdrop-blur-sm">
              <CheckCircle2 className="h-6 w-6 text-sage mt-0.5 flex-shrink-0" />
              <p className="text-foreground text-lg font-light">
                A cluttered or outdated site can send the wrong message — even if your work is excellent.
              </p>
            </div>
            <div className="flex items-start gap-5 p-5 rounded-2xl bg-white/50 backdrop-blur-sm">
              <CheckCircle2 className="h-6 w-6 text-sage mt-0.5 flex-shrink-0" />
              <p className="text-foreground text-lg font-light">
                A clear, professional website builds trust before a single conversation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do Section */}
      <section className="px-6 py-24 md:px-12 lg:px-24 xl:px-32 md:py-32 bg-warm-white">
        <div className="max-w-2xl">
          <div className="section-divider mb-12" />
          <h2 className="text-3xl md:text-4xl text-foreground mb-8">
            What we do
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-5 font-light">
            We design and build websites that remove the friction — so you can stop worrying 
            about fonts, layouts, or "what to say" and start showing up with confidence.
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed font-light">
            We handle the structure, the copy guidance, and all the little details 
            that make a website feel polished and professional. You stay focused on what you do best.
          </p>
        </div>
      </section>

      {/* Services Preview Section */}
      <section className="px-6 py-24 md:px-12 lg:px-24 xl:px-32 md:py-32 bg-watercolor-sand">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl text-foreground mb-14 text-center">
            Services
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-soft bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden hover:shadow-warm transition-shadow duration-300">
              <CardContent className="p-8 md:p-10">
                <div className="w-14 h-14 rounded-2xl bg-sage-light flex items-center justify-center mb-8">
                  <Sparkles className="h-6 w-6 text-sage" />
                </div>
                <h3 className="text-xl md:text-2xl text-foreground mb-4 font-serif">
                  Online Presence Starter
                </h3>
                <p className="text-muted-foreground leading-relaxed font-light">
                  A simple, single-page website to establish your online presence. 
                  Perfect for those just starting out or refreshing an outdated site.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden hover:shadow-warm transition-shadow duration-300">
              <CardContent className="p-8 md:p-10">
                <div className="w-14 h-14 rounded-2xl bg-ocean-light flex items-center justify-center mb-8">
                  <Layout className="h-6 w-6 text-ocean" />
                </div>
                <h3 className="text-xl md:text-2xl text-foreground mb-4 font-serif">
                  Professional Brand Website
                </h3>
                <p className="text-muted-foreground leading-relaxed font-light">
                  A multi-page website with clear structure, thoughtful copy, and a design 
                  that reflects your unique brand identity.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden hover:shadow-warm transition-shadow duration-300">
              <CardContent className="p-8 md:p-10">
                <div className="w-14 h-14 rounded-2xl bg-sand flex items-center justify-center mb-8">
                  <Palette className="h-6 w-6 text-foreground/70" />
                </div>
                <h3 className="text-xl md:text-2xl text-foreground mb-4 font-serif">
                  Signature Brand Presence
                </h3>
                <p className="text-muted-foreground leading-relaxed font-light">
                  A comprehensive website experience with premium design, 
                  strategic content, and everything you need to stand out.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="px-6 py-24 md:px-12 lg:px-24 xl:px-32 md:py-32 bg-warm-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl text-foreground mb-16 text-center">
            How it works
          </h2>
          <div className="grid md:grid-cols-4 gap-10 md:gap-8">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-sage-light text-sage flex items-center justify-center mx-auto mb-6 text-xl font-serif shadow-soft">
                1
              </div>
              <h3 className="font-serif text-xl text-foreground mb-3">Intake</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Fill out a simple form so we can understand your needs and vision.
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-ocean-light text-ocean flex items-center justify-center mx-auto mb-6 text-xl font-serif shadow-soft">
                2
              </div>
              <h3 className="font-serif text-xl text-foreground mb-3">Design & Build</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                We craft your website with care, handling all the details.
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-sand text-foreground/70 flex items-center justify-center mx-auto mb-6 text-xl font-serif shadow-soft">
                3
              </div>
              <h3 className="font-serif text-xl text-foreground mb-3">Review</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                You review and we refine until everything feels just right.
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-cream-deep text-sage flex items-center justify-center mx-auto mb-6 text-xl font-serif shadow-soft">
                4
              </div>
              <h3 className="font-serif text-xl text-foreground mb-3">Launch</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Your polished website goes live, ready to welcome visitors.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-6 py-28 md:px-12 lg:px-24 xl:px-32 md:py-36 bg-watercolor-ocean">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl text-foreground mb-8">
            Your business is evolving. Your website should too.
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-12 font-light">
            When you're ready for an online presence that feels aligned, clear, and 
            professional — we're here to help make it happen.
          </p>
          <Button 
            size="lg" 
            className="text-base px-10 py-7 rounded-full bg-sage hover:bg-sage/90 text-white shadow-soft transition-all duration-300 hover:shadow-warm"
          >
            Start Here
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-14 md:px-12 lg:px-24 xl:px-32 bg-cream border-t border-border/50">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <img 
            src={vibeShiftLogo} 
            alt="Vibe Shift Studio" 
            className="h-14 w-auto opacity-85 rounded-lg"
          />
          <p className="text-sm text-muted-foreground font-light">
            © {new Date().getFullYear()} Vibe Shift Studio. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
