import { Link } from "react-router-dom";
import { Facebook, Instagram, Linkedin, Mail, Phone } from "lucide-react";

const Footer = () => (
  <footer className="relative z-10 border-t border-border/20 py-10 px-6">
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-muted-foreground">
        <a href="mailto:customerservice@aethyx.space" className="inline-flex items-center gap-1.5 hover:text-primary transition-colors">
          <Mail className="h-4 w-4 text-primary" />
          <span>customerservice@aethyx.space</span>
        </a>
        <span className="hidden sm:inline">•</span>
        <a href="tel:+14015891023" className="inline-flex items-center gap-1.5 hover:text-primary transition-colors">
          <Phone className="h-4 w-4 text-primary" />
          <span>401.589.1023</span>
        </a>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <a href="https://www.facebook.com/Aethyxspace/" target="_blank" rel="noopener noreferrer" aria-label="Aethyx on Facebook" className="hover:text-primary transition-colors">
          <Facebook className="h-4 w-4" />
        </a>
        <a href="https://www.instagram.com/aethyxspace/" target="_blank" rel="noopener noreferrer" aria-label="Aethyx on Instagram" className="hover:text-primary transition-colors">
          <Instagram className="h-4 w-4" />
        </a>
        <a href="https://www.linkedin.com/in/kristinaethyx" target="_blank" rel="noopener noreferrer" aria-label="Kristin on LinkedIn" className="hover:text-primary transition-colors">
          <Linkedin className="h-4 w-4" />
        </a>
      </div>

      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <Link to="/privacy-policy" className="hover:text-foreground transition-colors">
          Privacy Policy
        </Link>
        <Link to="/terms" className="hover:text-foreground transition-colors">
          Terms of Service
        </Link>
      </div>
    </div>

    <nav aria-label="Footer" className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      <Link to="/" className="hover:text-primary transition-colors">Home</Link>
      <Link to="/services" className="hover:text-primary transition-colors">Services</Link>
      <Link to="/portfolio" className="hover:text-primary transition-colors">Portfolio</Link>
      <Link to="/about" className="hover:text-primary transition-colors">About</Link>
      <Link to="/blog" className="hover:text-primary transition-colors">Blog</Link>
      <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
    </nav>

    <div className="mt-6 text-center">
      <p className="text-xs text-muted-foreground">
        © {new Date().getFullYear()} Aethyx — Premium web design &amp; brand studio in Rhode Island. All rights reserved.
      </p>
    </div>
  </footer>
);

export default Footer;

