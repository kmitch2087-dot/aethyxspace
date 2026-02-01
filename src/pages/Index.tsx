import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Sparkles, Layout, Palette } from "lucide-react";
import vibeShiftLogo from "@/assets/vibe-shift-logo.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="px-6 py-8 md:px-12 lg:px-24">
        <nav className="mb-16 md:mb-24">
          <img 
            src={vibeShiftLogo} 
            alt="Vibe Shift Studio" 
            className="h-16 md:h-20 w-auto"
          />
        </nav>
        
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light leading-tight text-foreground mb-6">
            A better online presence — without the chaos.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl">
            Clean, modern websites for small businesses who want to look professional, 
            feel aligned, and stop overthinking their online presence.
          </p>
          <Button size="lg" className="text-base px-8 py-6 rounded-full">
            Start Here
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Relief & Recognition Section */}
      <section className="px-6 py-20 md:px-12 lg:px-24 md:py-28">
        <div className="max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-light text-foreground mb-6 leading-snug">
            You're not alone if your website feels harder than it should be.
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Between picking templates, writing the "right" words, and second-guessing every choice — 
            it's easy to feel stuck. We get it. That's exactly why we focus on clarity over complexity. 
            You don't need more options. You need the right ones, handled with care.
          </p>
        </div>
      </section>

      {/* Why This Matters Section */}
      <section className="px-6 py-20 md:px-12 lg:px-24 bg-muted/50">
        <div className="max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-light text-foreground mb-10">
            Why your online presence matters
          </h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-5 w-5 text-sage mt-1 flex-shrink-0" />
              <p className="text-foreground text-lg">
                Most people research a business online before reaching out or making a purchase.
              </p>
            </div>
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-5 w-5 text-sage mt-1 flex-shrink-0" />
              <p className="text-foreground text-lg">
                First impressions happen fast — visitors decide in seconds whether to stay or leave.
              </p>
            </div>
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-5 w-5 text-sage mt-1 flex-shrink-0" />
              <p className="text-foreground text-lg">
                A cluttered or outdated site can send the wrong message — even if your work is excellent.
              </p>
            </div>
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-5 w-5 text-sage mt-1 flex-shrink-0" />
              <p className="text-foreground text-lg">
                A clear, professional website builds trust before a single conversation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do Section */}
      <section className="px-6 py-20 md:px-12 lg:px-24 md:py-28">
        <div className="max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-light text-foreground mb-6">
            What we do
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-4">
            We design and build websites that remove the friction — so you can stop worrying 
            about fonts, layouts, or "what to say" and start showing up with confidence.
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed">
            We handle the structure, the copy guidance, and all the little details 
            that make a website feel polished and professional. You stay focused on what you do best.
          </p>
        </div>
      </section>

      {/* Services Preview Section */}
      <section className="px-6 py-20 md:px-12 lg:px-24 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-light text-foreground mb-12 text-center">
            Services
          </h2>
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            <Card className="border-0 shadow-sm bg-card">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-6">
                  <Sparkles className="h-5 w-5 text-secondary-foreground" />
                </div>
                <h3 className="text-xl font-medium text-foreground mb-3">
                  Online Presence Starter
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  A simple, single-page website to establish your online presence. 
                  Perfect for those just starting out or refreshing an outdated site.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-card">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mb-6">
                  <Layout className="h-5 w-5 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-medium text-foreground mb-3">
                  Professional Brand Website
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  A multi-page website with clear structure, thoughtful copy, and a design 
                  that reflects your unique brand identity.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-card">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-full bg-sand flex items-center justify-center mb-6">
                  <Palette className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-xl font-medium text-foreground mb-3">
                  Signature Brand Presence
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  A comprehensive website experience with premium design, 
                  strategic content, and everything you need to stand out.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="px-6 py-20 md:px-12 lg:px-24 md:py-28">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-light text-foreground mb-12 text-center">
            How it works
          </h2>
          <div className="grid md:grid-cols-4 gap-8 md:gap-6">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center mx-auto mb-4 text-lg font-medium">
                1
              </div>
              <h3 className="font-medium text-foreground mb-2">Intake</h3>
              <p className="text-sm text-muted-foreground">
                Fill out a simple form so we can understand your needs and vision.
              </p>
            </div>

            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center mx-auto mb-4 text-lg font-medium">
                2
              </div>
              <h3 className="font-medium text-foreground mb-2">Design & Build</h3>
              <p className="text-sm text-muted-foreground">
                We craft your website with care, handling all the details.
              </p>
            </div>

            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-sand text-foreground flex items-center justify-center mx-auto mb-4 text-lg font-medium">
                3
              </div>
              <h3 className="font-medium text-foreground mb-2">Review</h3>
              <p className="text-sm text-muted-foreground">
                You review and we refine until everything feels just right.
              </p>
            </div>

            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-sage-light text-sage flex items-center justify-center mx-auto mb-4 text-lg font-medium">
                4
              </div>
              <h3 className="font-medium text-foreground mb-2">Launch</h3>
              <p className="text-sm text-muted-foreground">
                Your polished website goes live, ready to welcome visitors.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-6 py-20 md:px-12 lg:px-24 md:py-28 bg-muted/50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-light text-foreground mb-6">
            Your business is evolving. Your website should too.
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-10">
            When you're ready for an online presence that feels aligned, clear, and 
            professional — we're here to help make it happen.
          </p>
          <Button size="lg" className="text-base px-8 py-6 rounded-full">
            Start Here
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 md:px-12 lg:px-24 border-t border-border">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <img 
            src={vibeShiftLogo} 
            alt="Vibe Shift Studio" 
            className="h-12 w-auto opacity-80"
          />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Vibe Shift Studio. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
