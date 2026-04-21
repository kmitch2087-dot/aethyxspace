/**
 * Reusable JSON-LD schema builders for Aethyx.
 * These describe the brand to search engines and AI crawlers.
 */

const SITE_URL = "https://aethyx.space";
const LOGO = `${SITE_URL}/favicon.png`;

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${SITE_URL}#organization`,
  name: "Aethyx",
  alternateName: "Aethyx Studio",
  url: SITE_URL,
  logo: LOGO,
  image: LOGO,
  email: "aethyxspace@protonmail.com",
  telephone: "+1-401-589-1023",
  description:
    "Premium web design, branding, and digital experience studio for ambitious brands. Based in Rhode Island, serving the entire United States.",
  address: {
    "@type": "PostalAddress",
    addressRegion: "RI",
    addressCountry: "US",
  },
  areaServed: {
    "@type": "Country",
    name: "United States",
  },
  priceRange: "$$$",
  knowsAbout: [
    "Web Design",
    "Website Redesign",
    "Brand Identity",
    "Custom Website Development",
    "E-commerce",
    "SEO",
    "Generative Engine Optimization",
    "Digital Strategy",
  ],
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}#website`,
  url: SITE_URL,
  name: "Aethyx",
  publisher: { "@id": `${SITE_URL}#organization` },
  inLanguage: "en-US",
};

export const breadcrumb = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.name,
    item: `${SITE_URL}${it.path === "/" ? "" : it.path}`,
  })),
});

export const serviceSchema = (name: string, description: string, path: string) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  name,
  description,
  url: `${SITE_URL}${path}`,
  provider: { "@id": `${SITE_URL}#organization` },
  areaServed: { "@type": "Country", name: "United States" },
});
