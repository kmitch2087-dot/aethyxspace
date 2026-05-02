import { Link } from "react-router-dom";
import { ArrowRight, Mail, Phone, MapPin, Facebook } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { breadcrumb } from "@/lib/seoSchemas";

const Contact = () => {
  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <Seo
        title="Contact Aethyx — Let's Connect"
        description="Start your project with a short form. Aethyx personally reviews every submission and follows up to discuss next steps — backed by real research."
        path="/contact"
        jsonLd={breadcrumb([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
      />
      <Navbar />

      <div className="pt-28 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-4xl md:text-6xl text-center mb-4">Let's Build It.</h1>
          <p className="text-center text-muted-foreground text-lg mb-16 max-w-xl mx-auto">
            Every project begins with a quick hello. I'll personally review your submission, research your market, and follow up within 2 business days to discuss next steps.
          </p>

          {/* Let's Connect CTA */}
          <div className="glass-card p-10 md:p-14 mb-16 text-center">
            <p className="text-primary text-xs tracking-[0.4em] uppercase mb-4">Begin with intent</p>
            <h2 className="font-display text-3xl md:text-4xl tracking-tight mb-4">
              Let's Connect
            </h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto mb-8">
              Free to submit, no payment required at this time.
            </p>
            <Link
              to="/intake"
              className="inline-flex items-center gap-2 px-10 py-5 rounded-full bg-primary text-primary-foreground font-semibold tracking-[0.2em] uppercase text-sm hover:bg-primary/90 transition-all hover:-translate-y-0.5"
            >
              Let's Connect <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Direct Contact */}
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4">
            <a href="mailto:customerservice@aethyx.space" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors">
              <Mail className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm break-all">customerservice@aethyx.space</span>
            </a>
            <a href="tel:+14015891023" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors">
              <Phone className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm">401.589.1023</span>
            </a>
            <a href="https://www.facebook.com/Aethyxspace/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors">
              <Facebook className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm">Facebook</span>
            </a>
            <div className="flex items-center gap-3 text-muted-foreground">
              <MapPin className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm">Rhode Island • Serving USA</span>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Contact;
