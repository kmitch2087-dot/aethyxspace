import { useLayoutEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import vibeShiftBanner from "@/assets/vibe-shift-banner.png";

const Header = () => {
  const location = useLocation();
  const bannerRef = useRef<HTMLDivElement | null>(null);
  
  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Services" },
    { href: "/membership", label: "Membership" },
    { href: "/about", label: "About" },
  ];

  // Publish the banner's actual rendered height so pages can offset content reliably.
  useLayoutEffect(() => {
    const el = bannerRef.current;
    if (!el) return;

    const setVar = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--fixed-banner-height", `${h}px`);
    };

    setVar();

    const ro = new ResizeObserver(() => setVar());
    ro.observe(el);

    window.addEventListener("resize", setVar);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", setVar);
    };
  }, []);

  return (
    <>
      {/* Full-width banner with black frame and navigation at bottom */}
      <div ref={bannerRef} className="fixed top-0 left-0 right-0 z-40 bg-background px-4 py-3">
        <div className="relative border-4 border-foreground rounded-2xl overflow-hidden">
          <img 
            src={vibeShiftBanner} 
            alt="Vibe Shift Studio" 
            className="w-full h-auto max-h-[160px] md:max-h-[200px] object-cover object-center"
          />
          
          {/* Navigation bubbles at bottom center of banner */}
          <nav className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-[10px] font-semibold px-3 py-1 rounded-full transition-all duration-200 ${
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
              className="text-[10px] font-semibold px-3 py-1 rounded-full bg-sage text-white hover:bg-sage/90 transition-all duration-200 shadow-warm"
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
