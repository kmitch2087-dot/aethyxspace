import { Link } from "react-router-dom";
import { Facebook, Mail, Phone } from "lucide-react";

const Footer = () => (
  <footer className="relative z-10 border-t border-border/20 py-10 px-6">
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-muted-foreground">
        <a href="mailto:aethyxspace@protonmail.com" className="inline-flex items-center gap-1.5 hover:text-primary transition-colors">
          <Mail className="h-4 w-4 text-primary" />
          <span>aethyxspace@protonmail.com</span>
        </a>
        <span className="hidden sm:inline">•</span>
        <a href="tel:+14015891023" className="inline-flex items-center gap-1.5 hover:text-primary transition-colors">
          <Phone className="h-4 w-4 text-primary" />
          <span>401.589.1023</span>
        </a>
        <span className="hidden sm:inline">•</span>
        <a
          href="https://www.facebook.com/Aethyxspace/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Aethyx on Facebook"
          className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
        >
          <Facebook className="h-4 w-4 text-primary" />
          <span>Facebook</span>
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

    <div className="mt-6 text-center">
      <p className="text-xs text-muted-foreground">
        © {new Date().getFullYear()} Aethyx. All rights reserved.
      </p>
    </div>
  </footer>
);

export default Footer;
