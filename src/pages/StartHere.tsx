import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, Compass, Heart, ExternalLink } from "lucide-react";
import Header from "@/components/Header";
import ConsultationPayment from "@/components/ConsultationPayment";

const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLScleBGGZeacHU4B-gGHDPiZFzOwpPHu8n_80DkwiypsB2nlEw/viewform?usp=publish-editor";

const StartHere = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Section 1 — Opening */}
      <section className="relative z-10 overflow-hidden">
        
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
      <section className="relative z-10 overflow-hidden">
        
        <div className="relative z-10 px-6 py-24 md:px-12 lg:px-24 xl:px-32 md:py-32">
          <div className="max-w-2xl">
            <span className="inline-block text-sm font-medium text-sage tracking-wide uppercase mb-6">
              The process
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl text-foreground mb-8 leading-snug font-semibold">
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
                  className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-border/30 shadow-soft"
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

      {/* Section 3 — Two Paths: Free Form or Paid Consultation */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative z-10 px-6 py-28 md:px-12 lg:px-24 xl:px-32 md:py-36">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl lg:text-4xl text-foreground mb-4 font-semibold">
                Choose Your Path
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed font-light max-w-2xl mx-auto">
                Fill out the intake form to share your needs, or book a paid consultation for a comprehensive review and action plan.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Free Intake Form Option */}
              <div className="card-elevated rounded-3xl p-8 md:p-10 flex flex-col">
                <div className="mb-6">
                  <span className="inline-block text-sm font-medium text-ocean tracking-wide uppercase mb-2">
                    Free
                  </span>
                  <h3 className="text-xl md:text-2xl font-medium text-foreground mb-3">
                    Client Intake Form
                  </h3>
                  <p className="text-muted-foreground font-light leading-relaxed">
                    Share a bit about your business and what you're looking for. I'll review your responses and reach out with next steps.
                  </p>
                </div>
                
                <div className="mt-auto">
                  <a 
                    href={GOOGLE_FORM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button 
                      size="lg" 
                      className="w-full text-base px-8 py-7 rounded-full bg-sage hover:bg-sage/90 text-white shadow-warm transition-all duration-300 hover:shadow-warm-lg hover:-translate-y-0.5"
                    >
                      Fill Out Form
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                  <p className="text-center text-sm text-muted-foreground mt-3 font-light">
                    (don't worry, we're not charging you anything yet)
                  </p>
                </div>
              </div>

              {/* Paid Consultation Option */}
              <ConsultationPayment />
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 — Closing Line */}
      <section className="relative z-10 overflow-hidden">
        
        <div className="relative z-10 px-6 py-24 md:px-12 lg:px-24 xl:px-32 md:py-32">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xl md:text-2xl text-foreground leading-relaxed font-light mb-4">
              If your business has evolved, your website should reflect that.
            </p>
            <p className="text-2xl md:text-3xl text-foreground font-display font-medium">
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
            <Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StartHere;
