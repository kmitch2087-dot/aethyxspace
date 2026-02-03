import { useLayoutEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import vibeShiftBanner from "@/assets/vibe-shift-banner-new.png";

const Header = () => {
  const location = useLocation();
  const bannerRef = useRef<HTMLDivElement | null>(null);
  
  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Services" },
    { href: "/membership", label: "Membership" },
    { href: "/about", label: "About" },
    { href: "/seo", label: "SEO" },
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
      {/* Full-width banner as background with navigation */}
      <div 
        ref={bannerRef} 
        className="fixed top-0 left-0 right-0 z-40 bg-background"
      >
        <div 
          className="relative overflow-hidden h-[120px] md:h-[180px] lg:h-[220px] border-b-2 border-sage/30"
          style={{
            backgroundImage: `url(${vibeShiftBanner})`,
            backgroundSize: '100% auto',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: 'transparent',
          }}
        >
          {/* Navigation bubbles at bottom center of banner */}
          <nav className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-[10px] font-semibold px-3 py-1 rounded-full transition-all duration-300 ${
                  location.pathname === link.href
                    ? "bg-white text-sage border border-sage shadow-[0_0_12px_rgba(91,122,95,0.4)]"
                    : "bg-white/90 text-sage hover:bg-white border border-transparent hover:border-sage hover:shadow-[0_0_16px_rgba(91,122,95,0.5)] hover:animate-pulse"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/start-here"
              className="text-[10px] font-semibold px-3 py-1 rounded-full bg-sage text-white hover:bg-sage/90 transition-all duration-300 shadow-warm hover:shadow-[0_0_20px_rgba(91,122,95,0.6)] hover:animate-pulse"
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
