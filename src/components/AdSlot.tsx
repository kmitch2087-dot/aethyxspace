import { Link } from "react-router-dom";
import { Megaphone, ArrowRight, Handshake } from "lucide-react";

/**
 * "Your ad here" placeholder slot. Deliberately styled a step away from the
 * site's gold-on-dark branding — violet accent, dashed border — so it reads
 * as available inventory rather than site content, while staying on the same
 * rounded/dark design language.
 *
 * variant "banner": full-width strip for page bottoms.
 * variant "card": grid tile (e.g. inside the blog post grid).
 */
const AdSlot = ({ variant = "banner" }: { variant?: "banner" | "card" }) => {
  const ctas = (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Link
        to="/advertise"
        className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 border border-violet-400/40 px-4 py-1.5 text-xs tracking-widest uppercase text-violet-200 hover:bg-violet-500/30 transition-colors"
      >
        Buy this spot <ArrowRight className="h-3 w-3" />
      </Link>
      <Link
        to="/barter"
        className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 px-4 py-1.5 text-xs tracking-widest uppercase text-violet-300/90 hover:bg-violet-500/10 transition-colors"
      >
        <Handshake className="h-3 w-3" /> Barter for it
      </Link>
    </div>
  );

  if (variant === "card") {
    return (
      <div className="rounded-2xl border border-dashed border-violet-400/30 bg-violet-500/[0.06] p-8 flex flex-col items-center justify-center text-center min-h-[280px]">
        <Megaphone className="h-6 w-6 text-violet-300/80 mb-4" />
        <p className="text-[10px] tracking-[0.35em] uppercase text-violet-300/70 mb-2">Ad Space</p>
        <p className="font-display text-xl text-violet-100 mb-1">Your ad here</p>
        <p className="text-xs text-violet-200/60 mb-6 max-w-[220px]">
          Put your brand in front of founders and business owners.
        </p>
        {ctas}
      </div>
    );
  }

  return (
    <section className="px-6 py-10">
      <div className="max-w-4xl mx-auto rounded-2xl border border-dashed border-violet-400/30 bg-violet-500/[0.06] px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="hidden sm:flex w-11 h-11 rounded-full bg-violet-500/15 items-center justify-center shrink-0">
            <Megaphone className="h-5 w-5 text-violet-300/80" />
          </div>
          <div>
            <p className="text-[10px] tracking-[0.35em] uppercase text-violet-300/70 mb-1">Ad Space</p>
            <p className="font-display text-xl text-violet-100">
              Your ad here <span className="text-violet-200/60 text-sm font-sans">— reach founders &amp; business owners</span>
            </p>
          </div>
        </div>
        {ctas}
      </div>
    </section>
  );
};

export default AdSlot;
