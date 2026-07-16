import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import Seo from "@/components/Seo";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Seo
        title="Page Not Found | Aethyx"
        description="The page you are looking for does not exist."
        noindex
      />
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6 pt-32 pb-20">
        <div className="text-center max-w-lg">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary mb-4">Error 404</p>
          <h1 className="text-4xl md:text-5xl font-display tracking-wider mb-4">Page Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The page you're looking for doesn't exist or has moved. Here's where you might want to go instead:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm tracking-widest uppercase hover:bg-primary/90 transition-colors"
            >
              Home
            </Link>
            <Link
              to="/services"
              className="px-6 py-2.5 rounded-full border border-primary/30 text-primary text-sm tracking-widest uppercase hover:bg-primary/10 transition-colors"
            >
              Services
            </Link>
            <Link
              to="/portfolio"
              className="px-6 py-2.5 rounded-full border border-primary/30 text-primary text-sm tracking-widest uppercase hover:bg-primary/10 transition-colors"
            >
              Portfolio
            </Link>
            <Link
              to="/contact"
              className="px-6 py-2.5 rounded-full border border-primary/30 text-primary text-sm tracking-widest uppercase hover:bg-primary/10 transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
