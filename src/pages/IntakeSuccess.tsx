import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";

const IntakeSuccess = () => {
  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <Seo
        title="Intake Received — Aethyx"
        description="Your intake has been received. Aethyx will personally review and follow up shortly."
        path="/intake-success"
        noindex
      />
      <Navbar />

      <div className="pt-32 pb-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-8">
            <Check className="h-7 w-7 text-primary" />
          </div>

          <p className="text-primary text-xs tracking-[0.4em] uppercase mb-4">Received</p>
          <h1 className="font-display text-4xl md:text-6xl tracking-tight mb-8">
            Thank you.
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-6">
            Your intake is in. I'll personally review your submission, do real research on your
            brand, market, and competitors, and reach out within{" "}
            <span className="text-foreground">2 business days</span> to discuss next steps and a
            focused strategy session.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-12">
            When we meet, I'll come with real data — not generic advice.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/portfolio"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold tracking-[0.2em] uppercase text-sm hover:bg-primary/90 transition-all hover:-translate-y-0.5"
            >
              View Portfolio <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-foreground/30 text-foreground font-semibold tracking-[0.2em] uppercase text-sm hover:border-foreground/60 transition-all"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default IntakeSuccess;
