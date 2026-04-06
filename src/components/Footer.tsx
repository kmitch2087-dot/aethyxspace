import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="relative z-10 border-t border-border/20 py-10 px-6">
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-muted-foreground">
        <a href="mailto:aethyxspace@protonmail.com" className="hover:text-primary transition-colors">
          aethyxspace@protonmail.com
        </a>
        <span className="hidden sm:inline">•</span>
        <a href="tel:+14015891023" className="hover:text-primary transition-colors">
          401.589.1023
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
