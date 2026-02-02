import { Link, useLocation } from "react-router-dom";
import vibeShiftBanner from "@/assets/vibe-shift-banner.png";

const Header = () => {
  const location = useLocation();
  
  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Services" },
    { href: "/about", label: "About" },
  ];

  return (
    <>
      {/* Full-width banner with black frame and navigation at bottom */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-background px-4 py-3">
        <div className="relative border-4 border-foreground rounded-2xl overflow-hidden">
          <img 
            src={vibeShiftBanner} 
            alt="Vibe Shift Studio" 
            className="w-full h-auto"
          />
          
          {/* Navigation bubbles at bottom center of banner */}
          <nav className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-xs font-semibold px-4 py-1.5 rounded-full transition-all duration-200 ${
                  location.pathname === link.href
                    ? "bg-white text-sage border border-sage"
                    : "bg-white/90 text-sage hover:bg-white border border-transparent hover:border-sage"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/start-here"
              className="text-xs font-semibold px-4 py-1.5 rounded-full bg-sage text-white hover:bg-sage/90 transition-all duration-200 shadow-warm"
            >
              Start Here
            </Link>
          </nav>
        </div>
      </div>
    </>
  );
};

export default Header;
