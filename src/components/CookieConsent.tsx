import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const STORAGE_KEY = "aethyx-cookie-consent";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Quietly appear after a short delay so it doesn't crash the entrance.
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const setConsent = (value: "accepted" | "declined") => {
    localStorage.setItem(STORAGE_KEY, value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[60] max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <div className="relative rounded-2xl border border-border/40 bg-background/85 backdrop-blur-xl shadow-2xl shadow-primary/5 p-5">
        <button
          onClick={() => setConsent("declined")}
          aria-label="Dismiss cookie notice"
          className="absolute top-3 right-3 text-muted-foreground/60 hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="font-display text-sm tracking-wide text-foreground mb-1">
          A quiet note on cookies
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed pr-4">
          We use a few cookies to keep this site running smoothly and understand how it's used. See our{" "}
          <Link to="/privacy-policy" className="text-primary hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to="/terms" className="text-primary hover:underline">
            Terms
          </Link>
          .
        </p>

        <div className="mt-4 flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setConsent("accepted")}
            className="flex-1 h-9 text-xs tracking-wide"
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConsent("declined")}
            className="h-9 text-xs tracking-wide text-muted-foreground hover:text-foreground"
          >
            Decline
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
