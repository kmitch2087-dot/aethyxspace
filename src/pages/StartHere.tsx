import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, Compass, Heart } from "lucide-react";
import Header from "@/components/Header";

const StartHere = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Section 1 — Opening */}
      <section className="relative bg-hero texture-paper overflow-hidden">
        <div className="organic-shape w-[500px] h-[500px] bg-sage-muted -top-32 -right-32" />
        <div className="organic-shape w-[400px] h-[400px] bg-ocean-muted bottom-10 -left-20" />
        
        <div className="relative z-10 px-6 pt-32 pb-24 md:px-12 lg:px-24 xl:px-32 md:pt-40 md:pb-32">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.15] text-foreground mb-8 tracking-tight">
              Start here.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-light">
              You don't need to have everything figured out before reaching out.
            </p>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-light mt-4">
              This process is designed to be simple, clear, and low-pressure. Answer a few questions, and I'll take it from there.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2 — What Happens Next */}
      <section className="relative bg-section-warm texture-paper overflow-hidden">
        <div className="organic-shape w-[450px] h-[450px] bg-sage-light top-20 right-10" />
        
        <div className="relative z-10 px-6 py-24 md:px-12 lg:px-24 xl:px-32 md:py-32">
          <div className="max-w-2xl">
            <span className="inline-block text-sm font-medium text-sage tracking-wide uppercase mb-6">
              The process
            </span>
            <h2 className="text-3xl md:text-4xl text-foreground mb-8 leading-snug font-medium">
              What happens next
            </h2>
            <p className="text-muted-foreground text-lg md:text-xl leading-relaxed font-light mb-10">
              Once you submit the form, I'll review your responses and follow up with next steps.
              You'll never be pushed into something you don't need — this is about building the right thing, at the right pace.
            </p>
            
            <div className="space-y-4">
              {[
                { icon: MessageCircle, text: "Short intake form" },
                { icon: Compass, text: "Clear recommendations" },
                { icon: Heart, text: "Calm, guided process" }
              ].map((item, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-4 p-5 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/50 shadow-soft"
                >
                  <div className="w-10 h-10 rounded-full bg-sage-light flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-5 w-5 text-sage" />
                  </div>
                  <p className="text-foreground text-lg font-light">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 — Intake Form Placeholder */}
      <section className="relative bg-section-sage texture-paper overflow-hidden">
        <div className="organic-shape w-[500px] h-[500px] bg-ocean-light -bottom-32 -right-32" />
        <div className="organic-shape w-[350px] h-[350px] bg-sand top-20 left-10" />
        
        <div className="relative z-10 px-6 py-28 md:px-12 lg:px-24 xl:px-32 md:py-36">
          <div className="max-w-xl mx-auto text-center">
            <div className="card-elevated rounded-3xl p-10 md:p-14">
              <h2 className="text-2xl md:text-3xl text-foreground mb-6 font-medium">
                Ready to take the first step?
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed font-light mb-10">
                Fill out a short form and I'll get back to you with clear next steps.
              </p>
              
              <Button 
                size="lg" 
                className="text-base px-12 py-8 rounded-full bg-sage hover:bg-sage/90 text-white shadow-warm transition-all duration-300 hover:shadow-warm-lg hover:-translate-y-0.5"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <p className="text-sm text-muted-foreground mt-6 font-light">
                No pressure. Just a clear next step.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 — Closing Line */}
      <section className="relative bg-section-cream texture-paper overflow-hidden">
        <div className="organic-shape w-[400px] h-[400px] bg-sage-muted top-10 -left-20" />
        
        <div className="relative z-10 px-6 py-24 md:px-12 lg:px-24 xl:px-32 md:py-32">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xl md:text-2xl text-foreground leading-relaxed font-light mb-4">
              If your business has evolved, your website should reflect that.
            </p>
            <p className="text-2xl md:text-3xl text-foreground font-serif font-medium">
              This is where the shift begins.
            </p>
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

export default StartHere;
