import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import watercolorBg from "@/assets/watercolor-bg.jpg";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Watercolor background layer */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url(${watercolorBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.18,
        }}
      />
      
      <main className="relative z-10 pt-28 pb-24 px-6 md:px-12 lg:px-24 xl:px-32">
        <div className="max-w-2xl mx-auto">
          
          {/* Headline */}
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-12 heading-accent">
            About Vibe Shift Studio
          </h1>
          
          {/* Body Copy */}
          <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
            <p>
              I started Vibe Shift Studio because I kept seeing great businesses with websites that didn't reflect how capable, thoughtful, or professional they actually were.
            </p>
            
            <p>
              Too cluttered. Too confusing. Too overwhelming to deal with — so they stayed unfinished or ignored.
            </p>
            
            <p>
              I believe your website should feel like an extension of your business at its best: clear, intentional, easy to navigate, and easy to trust.
            </p>
            
            <p>
              At Vibe Shift Studio, I design and build websites that remove friction — for you and for your customers. I handle the structure, the copy, and the details so you don't have to get lost in tech or second-guess every decision.
            </p>
            
            <p className="text-foreground font-medium">
              My approach is calm on purpose.
            </p>
            
            <p>
              No chaos. No pressure. No unnecessary complexity.
            </p>
            
            <p>
              Just thoughtful design, clear messaging, and a process that makes people say,
              <br />
              <span className="italic text-foreground">"Okay… this feels doable."</span>
            </p>
          </div>
          
          {/* Closing Line + CTA */}
          <div className="mt-16 pt-12 border-t border-border/30">
            <p className="text-xl text-foreground font-serif mb-8">
              If your business has evolved, your website should reflect that.
            </p>
            
            <Button 
              asChild 
              size="lg"
              className="bg-sage hover:bg-sage/90 text-primary-foreground rounded-full px-8 py-6 text-base shadow-warm"
            >
              <Link to="/start-here">Start Here</Link>
            </Button>
          </div>
          
        </div>
      </main>
      
      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 md:px-12 lg:px-24 xl:px-32 border-t border-border/20">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Vibe Shift Studio. Designed with intention.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default About;
