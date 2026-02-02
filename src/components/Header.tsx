import { Link, useLocation } from "react-router-dom";
import vibeShiftLogo from "@/assets/vibe-shift-logo.jpg";

const Header = () => {
  const location = useLocation();
  
  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Services" },
    { href: "/about", label: "About" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/20">
      <div className="px-6 py-4 md:px-12 lg:px-24 xl:px-32">
        <div className="flex items-center justify-between">
          <Link to="/">
            <img 
              src={vibeShiftLogo} 
              alt="Vibe Shift Studio" 
              className="h-24 md:h-28 w-auto rounded-xl shadow-soft"
            />
          </Link>
          
          <nav className="flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-medium transition-colors duration-200 ${
                  location.pathname === link.href
                    ? "text-sage"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/start-here"
              className="text-sm font-medium px-6 py-2.5 rounded-full bg-sage text-white hover:bg-sage/90 transition-all duration-200 shadow-warm hover:shadow-warm-lg"
            >
              Start Here
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
