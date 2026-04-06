import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="relative z-10 border-t border-border/20 py-12 px-6">
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        {/* Brand */}
        <div>
          <h3 className="font-serif text-xl text-foreground mb-2">Aethyx</h3>
          <p className="text-sm text-muted-foreground">Elevate & Evolve Unapologetically</p>
        </div>

        {/* Contact */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            <a href="mailto:Aethyxspace@protonmail.com" className="hover:text-primary transition-colors">
              aethyxspace@protonmail.com
            </a>
          </p>
          <p>
            <a href="tel:+14015891023" className="hover:text-primary transition-colors">
              401.589.1023
            </a>
          </p>
          <p>Rhode Island, serving the entire USA</p>
        </div>

        {/* Links */}
        <div className="text-sm text-muted-foreground space-y-1 md:text-right">
          <Link to="/privacy-policy" className="block hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="block hover:text-foreground transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>

      <div className="border-t border-border/20 pt-6 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Aethyx. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
