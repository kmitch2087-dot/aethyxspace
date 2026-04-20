const PILLARS = [
  "Brand Identity",
  "Digital Ecosystems",
  "SEO Architecture",
  "AI Optimization",
  "Systems & Automation",
  "E-Commerce",
  "Client Portals",
  "Web Development",
];

const Row = () => (
  <div className="flex shrink-0 items-center gap-10 px-5">
    {PILLARS.map((p) => (
      <div key={p} className="flex items-center gap-10">
        <span className="font-display text-[11px] md:text-xs tracking-[0.35em] uppercase text-foreground/85 whitespace-nowrap">
          {p}
        </span>
        <span className="text-primary text-[10px]" aria-hidden>◆</span>
      </div>
    ))}
  </div>
);

const ServicesTicker = () => (
  <div className="relative w-full border-b border-border/30 bg-[#0a0a14]/95 backdrop-blur-xl overflow-hidden">
    <div className="flex animate-ticker py-3">
      <Row />
      <Row />
      <Row />
    </div>
    {/* Edge fades */}
    <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0a0a14] to-transparent" />
    <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0a0a14] to-transparent" />
  </div>
);

export default ServicesTicker;
