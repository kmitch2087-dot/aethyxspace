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
      {/* Full-width banner */}
      <div className="fixed top-0 left-0 right-0 z-40">
        <img 
          src={vibeShiftBanner} 
          alt="Vibe Shift Studio" 
          className="w-full h-auto"
        />
      </div>
      
      {/* Navigation overlay */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 md:px-12 lg:px-24 xl:px-32">
        <div className="flex items-center justify-end gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`text-base font-semibold transition-colors duration-200 ${
                location.pathname === link.href
                  ? "text-sage"
                  : "text-foreground/80 hover:text-foreground"
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
