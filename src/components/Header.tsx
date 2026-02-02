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
      {/* Full-width banner with black frame */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-background px-4 py-3">
        <div className="border-4 border-foreground rounded-2xl overflow-hidden">
          <img 
            src={vibeShiftBanner} 
            alt="Vibe Shift Studio" 
            className="w-full h-auto"
          />
        </div>
      </div>
      
      {/* Navigation overlay */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-5 md:px-12 lg:px-24 xl:px-32">
        <div className="flex items-center justify-end gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`text-base font-semibold px-6 py-2.5 rounded-full transition-all duration-200 ${
                location.pathname === link.href
                  ? "bg-white text-sage border-2 border-sage"
                  : "bg-white/90 text-sage hover:bg-white border-2 border-transparent hover:border-sage"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/start-here"
            className="text-base font-semibold px-6 py-2.5 rounded-full bg-sage text-white hover:bg-sage/90 transition-all duration-200 shadow-warm hover:shadow-warm-lg"
          >
            Start Here
          </Link>
        </div>
      </nav>
    </>
  );
};

export default Header;
