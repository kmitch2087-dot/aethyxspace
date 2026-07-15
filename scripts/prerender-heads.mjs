// Post-build prerender: emit one HTML file per public route with a unique
// <title>, meta description, and canonical, so crawlers that don't run JS
// (Ahrefs, many AI crawlers) see distinct pages instead of 15 copies of the
// SPA shell. Bodies still hydrate the normal React app.
//
// Titles/descriptions mirror each page's <Seo> props — keep them in sync when
// a page's Seo changes.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const SITE = "https://aethyx.space";
const DIST = "dist";

const ROUTES = [
  {
    path: "/",
    title: "Aethyx — Premium Web Design & Branding | Rhode Island",
    description:
      "Premium web design, brand identity, and SEO architecture for ambitious businesses. Founder-led studio in Rhode Island, serving the USA. Book a consultation.",
  },
  {
    path: "/services",
    title: "Services — Web Design, Branding & Digital Platforms | Aethyx",
    description:
      "Custom website design, branding, e-commerce, booking systems, automation, and AI-ready digital platforms — built for ambitious businesses across the USA.",
  },
  {
    path: "/portfolio",
    title: "Portfolio — Aethyx Web Design Case Studies",
    description:
      "Selected work from Aethyx — wellness retreat brands, hospitality websites, and full brand evolutions. Real projects with real results.",
  },
  {
    path: "/about",
    title: "About Aethyx — Founder-Led Premium Web Design by Kristin Mitchell",
    description:
      "Aethyx is a one-woman studio led by Kristin Mitchell. Direct, founder-led web design and digital systems for businesses ready to evolve.",
  },
  {
    path: "/contact",
    title: "Contact Aethyx — Let's Connect",
    description:
      "Start your project with a short form. Aethyx personally reviews every submission and follows up to discuss next steps — backed by real research.",
  },
  {
    path: "/medspa",
    title: "Med Spa Web Design — Premium Websites for Aesthetic Clinics | Aethyx",
    description:
      "Luxury website design for med spas, aesthetic clinics, and wellness brands. Custom booking integrations, brand-aligned visuals, and SEO built for the aesthetics industry.",
  },
  {
    path: "/blog",
    title: "Aethyx Blog — Web Design, Branding & Digital Strategy Insights",
    description:
      "Insights on web design, brand strategy, SEO, and growing your digital presence — written for ambitious businesses by the Aethyx team.",
  },
  {
    path: "/bounty",
    title: "Bounty Program | Aethyx",
    description: "Refer clients to Aethyx and earn cash rewards. Apply to join our bounty program.",
  },
  {
    path: "/advertise",
    title: "Advertise with Aethyx — Partner Ad Space",
    description:
      "Put your brand in front of founders and business owners. Live, transparent first-party traffic stats and premium ad placements on aethyx.space.",
  },
  {
    path: "/intake",
    title: "Let's Connect — Aethyx",
    description:
      "Share a few details about your brand. Aethyx personally reviews every submission and follows up to discuss next steps.",
  },
  {
    path: "/privacy-policy",
    title: "Privacy Policy | Aethyx",
    description:
      "How Aethyx collects, uses, and protects information submitted through our website, contact forms, and social channels.",
  },
  {
    path: "/terms",
    title: "Terms of Service | Aethyx",
    description:
      "Terms governing use of aethyx.space, services provided by Aethyx, payments, intellectual property, and client agreements.",
  },
  // Utility routes: need static files so they keep working alongside 404.html,
  // but should never be indexed.
  { path: "/intake-success", title: "Submission Received — Aethyx", description: "", noindex: true },
  { path: "/payment-success", title: "Payment Received — Aethyx", description: "", noindex: true },
  { path: "/reset-password", title: "Set Your Password — Aethyx", description: "", noindex: true },
  { path: "/unsubscribe", title: "Unsubscribe — Aethyx", description: "", noindex: true },
  { path: "/admin/login", title: "Admin Login — Aethyx", description: "", noindex: true },
];

const esc = (s) => s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");

const shell = readFileSync(join(DIST, "index.html"), "utf8");

let written = 0;
for (const r of ROUTES) {
  const url = SITE + (r.path === "/" ? "/" : r.path);
  let html = shell
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(r.title)}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/?>/,
      r.description ? `<meta name="description" content="${esc(r.description)}">` : "",
    )
    .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}" />`)
    .replace(
      /<meta property="og:title" content="[^"]*"\s*\/?>/,
      `<meta property="og:title" content="${esc(r.title)}">`,
    )
    .replace(
      /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
      `<meta name="twitter:title" content="${esc(r.title)}">`,
    );
  if (r.description) {
    html = html
      .replace(
        /<meta property="og:description" content="[^"]*"\s*\/?>/,
        `<meta property="og:description" content="${esc(r.description)}">`,
      )
      .replace(
        /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
        `<meta name="twitter:description" content="${esc(r.description)}">`,
      );
  }
  const extra = [`<link rel="canonical" href="${url}" />`];
  if (r.noindex) extra.push(`<meta name="robots" content="noindex, nofollow" />`);
  html = html.replace("</head>", `    ${extra.join("\n    ")}\n  </head>`);

  // Flat `<route>.html` files: Cloudflare Pages serves /services from
  // services.html with no redirect (a services/index.html directory would
  // 308-redirect /services -> /services/, contradicting the canonical).
  const outFile = r.path === "/" ? join(DIST, "index.html") : join(DIST, `${r.path.slice(1)}.html`);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, html);
  written++;
}

// Branded 404 (Cloudflare Pages serves this with a real 404 status for
// unmatched paths once it exists, instead of the SPA 200-fallback).
const notFound = shell
  .replace(/<title>[^<]*<\/title>/, `<title>Page Not Found | Aethyx</title>`)
  .replace(/<meta name="description" content="[^"]*"\s*\/?>/, "")
  .replace("</head>", `    <meta name="robots" content="noindex" />\n  </head>`);
writeFileSync(join(DIST, "404.html"), notFound);

console.log(`prerender-heads: wrote ${written} route heads + 404.html`);
