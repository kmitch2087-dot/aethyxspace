import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const About = () => (
  <div className="min-h-screen bg-background text-foreground">
    <Navbar />

    <div className="pt-28 pb-24 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-serif text-4xl md:text-6xl mb-12">About Aethyx</h1>

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

          <p className="text-foreground font-semibold text-xl">
            Our approach is bold on purpose.
          </p>

          <p>
            No fluff. No filler. No templates pretending to be custom. We handle the design, the copy, the details — so you can focus on running your business while your online presence actually works for you.
          </p>

          <p>
            Every project gets the same energy: deep attention to brand, obsessive detail on the user experience, and a final product that makes people stop and say,
            <br />
            <span className="text-primary italic">"Who built this?"</span>
          </p>

          <p className="text-foreground font-serif text-2xl mt-8">
            If your business has evolved, your website should prove it.
          </p>
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
