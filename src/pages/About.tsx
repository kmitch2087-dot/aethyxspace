import { Link } from "react-router-dom";
import { ArrowRight, Users, Target } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { breadcrumb } from "@/lib/seoSchemas";
import kristinPhoto from "@/assets/kristin-founder.jpg";

const DotDivider = () => (
  <div className="flex items-center justify-center gap-2 py-8">
    <span className="w-2 h-2 rounded-full bg-primary" />
    <span className="w-2 h-2 rounded-full bg-primary/50" />
    <span className="w-2 h-2 rounded-full bg-primary/25" />
  </div>
);

const About = () => (
  <div className="min-h-screen bg-transparent text-foreground">
    <Seo
      title="About Aethyx — Founder-Led Premium Web Design by Kristin Mitchell"
      description="Aethyx is a one-woman studio led by Kristin Mitchell. Direct, founder-led web design and digital systems for businesses ready to evolve."
      path="/about"
      jsonLd={breadcrumb([
        { name: "Home", path: "/" },
        { name: "About", path: "/about" },
      ])}
    />
    <Navbar />

    <div className="pt-28 pb-24 px-6">
      {/* Intro row — wider container so photo + copy can sit side-by-side */}
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
          {/* Photo */}
          <div className="order-1 md:order-1">
            <div className="rounded-2xl overflow-hidden border border-primary/20 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.3)] max-h-[520px]">
              <img
                src={kristinPhoto}
                alt="Kristin Mitchell, Founder of Aethyx"
                loading="eager"
                className="w-full h-full object-cover object-center"
              />
            </div>
            <p className="mt-4 text-center text-sm text-muted-foreground tracking-[0.2em] uppercase">
              Kristin Mitchell — Founder
            </p>
          </div>

          {/* Heading + opening copy */}
          <div className="order-2 md:order-2">
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl mb-8 leading-tight">
              Hi, I'm Kristin —<br />
              <span className="text-primary">Aethyx is my becoming.</span>
            </h1>
            <div className="space-y-5 text-base md:text-lg text-muted-foreground leading-relaxed">
              <p className="text-foreground/90">
                One founder. One studio. Every pixel.
              </p>
              <p>
                I built Aethyx because I kept watching brilliant, hard-working people hide behind websites that didn't come close to matching who they actually are. Too cluttered. Too generic. Too easy to scroll past.
              </p>
              <p>
                This studio is the thing I built brick by brick, late night by late night, until it became something I'm genuinely proud of — & now I get to do the same for other people. Help them see what's actually possible.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rest of page — narrower container */}
      <div className="max-w-3xl mx-auto">
        <DotDivider />

        <div className="text-center mb-4">
          <h2 className="font-display text-3xl md:text-4xl text-primary glow-teal mb-4">
            Elevate & Evolve Unapologetically
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            No team to hide behind. No account managers, no handoffs, no "someone will get back to you." You work directly with me — the person designing it, writing it, building it, and obsessing over it until it's right.
          </p>
        </div>

        <DotDivider />

        <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
          <p>
            My favorite part of this whole job is the reveal. The moment a client sees their site for the first time and realizes what's actually possible now — the automations, the workflows, the things running quietly in the background — and the fear flips into awe.
          </p>
          <p>
            Most people think a more advanced website means more work for them. It's the opposite. Done right, it means <em className="text-primary not-italic">less</em> — fewer manual tasks, fewer things to remember, more time to actually do the work you're here to do.
          </p>
          <p className="text-foreground font-display text-2xl mt-8 italic">
            That's the whole point. Your business has evolved. Your website should prove it — and then get out of your way.
          </p>
        </div>

        <DotDivider />

        {/* The Studio & What I Stand For Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="glass-card-teal p-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-5">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display text-2xl mb-3">The Studio</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Aethyx is a one-woman studio led by Kristin Mitchell. That means every decision, every line of copy, every detail is mine — and I take that personally. No subcontractors. No silent partners. Just direct, founder-led work from start to launch.
            </p>
          </div>

          <div className="glass-card-teal p-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-5">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display text-2xl mb-3">What I Stand For</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Bold over safe. Clarity over complexity. Craft over shortcuts. Every business deserves a digital presence that commands respect — and I don't stop until yours does.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/20">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold tracking-wide uppercase text-sm hover:bg-primary/90 transition-all hover:-translate-y-0.5"
          >
            Start a Project <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>

    <Footer />
  </div>
);

export default About;
