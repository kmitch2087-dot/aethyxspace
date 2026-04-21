import { Helmet } from "react-helmet-async";

const SITE_URL = "https://aethyx.space";
const DEFAULT_OG = "https://storage.googleapis.com/gpt-engineer-file-uploads/g2MMpPpUsQh5UsOphbgCfs8V92I2/social-images/social-1775501085008-Image_4-6-26_at_2.18_PM_(1).webp";

interface SeoProps {
  title: string;
  description: string;
  /** Path relative to site root, e.g. "/services". Defaults to current pathname when undefined. */
  path?: string;
  image?: string;
  /** "website" | "article" | etc. */
  type?: string;
  /** Block search indexing (e.g. admin/portal pages). */
  noindex?: boolean;
  /** Optional JSON-LD object(s) injected as application/ld+json. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Article-only metadata. */
  publishedTime?: string;
  modifiedTime?: string;
}

/**
 * Centralized per-route SEO. Sets <title>, meta description, canonical,
 * OpenGraph + Twitter cards, optional JSON-LD, and robots directives.
 * Visual UI is unaffected.
 */
const Seo = ({
  title,
  description,
  path,
  image = DEFAULT_OG,
  type = "website",
  noindex = false,
  jsonLd,
  publishedTime,
  modifiedTime,
}: SeoProps) => {
  const resolvedPath =
    path ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const canonical = `${SITE_URL}${resolvedPath === "/" ? "" : resolvedPath}`;
  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta
        name="robots"
        content={noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"}
      />

      {/* OpenGraph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Aethyx" />
      <meta property="og:locale" content="en_US" />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default Seo;
