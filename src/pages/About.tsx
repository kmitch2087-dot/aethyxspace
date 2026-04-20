import { Link } from "react-router-dom";
import { ArrowRight, Users, Target } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const DotDivider = () => (
  <div className="flex items-center justify-center gap-2 py-8">
    <span className="w-2 h-2 rounded-full bg-primary" />
    <span className="w-2 h-2 rounded-full bg-primary/50" />
    <span className="w-2 h-2 rounded-full bg-primary/25" />
  </div>
);

const About = () => (
  <div className="min-h-screen bg-transparent text-foreground">
    <Navbar />

    <div className="pt-28 pb-24 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-4xl md:text-6xl mb-12">About Aethyx</h1>

        <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
          <p>
            Most businesses deserve better than the website they have. We started Aethyx because we kept seeing capable, thoughtful businesses hiding behind cluttered, confusing, or straight-up unfinished websites.
          </p>
          <p>
            Too overwhelming. Too generic. Too easy to ignore.
          </p>
          <p>
            We build websites that hit different — clear, intentional, impossible to scroll past. Your site should feel like the best version of your business, not an afterthought.
          </p>
        </div>

        <DotDivider />

        <div className="text-center mb-4">
          <h2 className="font-display text-3xl md:text-4xl text-primary glow-teal mb-4">
            Elevate & Evolve Unapologetically
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            No fluff. No filler. No templates pretending to be custom. We handle the design, the copy, the details — so you can focus on running your business while your online presence actually works for you.
          </p>
        </div>

        <DotDivider />

        <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
          <p>
            Every project gets the same energy: deep attention to brand, obsessive detail on the user experience, & a final product that makes people stop & say,
            <br />
            <span className="text-primary italic">"Who built this?"</span>
          </p>
          <p className="text-foreground font-display text-2xl mt-8">
            If your business has evolved, your website should prove it.
          </p>
        </div>

        <DotDivider />

        {/* Our Team & Our Values Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="glass-card-teal p-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-5">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display text-2xl mb-3">Our Team</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              A lean, focused creative studio led by Kristin Mitchell. We bring deep expertise in web design, branding, & digital strategy — partnering closely with every client to deliver work that's unmistakably theirs.
            </p>
          </div>

          <div className="glass-card-teal p-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-5">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display text-2xl mb-3">Our Values</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Bold over safe. Clarity over complexity. Craft over shortcuts. We believe every business deserves a digital presence that commands respect — & we don't stop until it does.
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
