import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone, User } from "lucide-react";
import ClientLoginDialog from "@/components/ClientLoginDialog";
import navLogo from "@/assets/aethyx-calligraphy-updated.png";

const links = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/blog", label: "Blog" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 backdrop-blur-xl bg-[#0a0a14]/95">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-1">
            <img src={navLogo} alt="Aethyx" className="h-8" />
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-6">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`text-sm tracking-widest uppercase transition-colors ${
                  location.pathname === l.to
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <a
              href="tel:+14015891023"
              className="flex items-center gap-1.5 text-xs tracking-widest uppercase text-destructive hover:text-destructive/80 transition-colors border border-destructive/30 rounded-full px-4 py-2"
            >
              <Phone className="h-3 w-3" />
              Emergency
            </a>
            <button
              onClick={() => setLoginOpen(true)}
              className="flex items-center gap-1.5 text-xs tracking-widest uppercase text-primary hover:text-primary/80 transition-colors border border-primary/30 rounded-full px-4 py-2"
            >
              <User className="h-3 w-3" />
              Client Login
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden text-foreground"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden border-t border-border/30 bg-background/95 backdrop-blur-xl">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={`block px-6 py-4 text-sm tracking-widest uppercase border-b border-border/10 transition-colors ${
                  location.pathname === l.to
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <a
              href="tel:+14015891023"
              className="flex items-center gap-2 px-6 py-4 text-sm tracking-widest uppercase text-destructive border-b border-border/10"
            >
              <Phone className="h-4 w-4" />
              Emergency Contact
            </a>
            <button
              onClick={() => { setOpen(false); setLoginOpen(true); }}
              className="flex items-center gap-2 px-6 py-4 text-sm tracking-widest uppercase text-primary w-full text-left"
            >
              <User className="h-4 w-4" />
              Client Login
            </button>
          </div>
        )}
      </nav>

      <ClientLoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
};

export default Navbar;
