import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import ReactMarkdown from "react-markdown";
import DOMPurify from "dompurify";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";

interface Post {
  id: string;
  title: string;
  content: string;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
}

const isHtml = (s: string) => /^\s*<(\/?[a-zA-Z]+)/.test(s);

const extractFaqSchema = (html: string) => {
  if (typeof window === "undefined") return null;
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const headings = Array.from(doc.querySelectorAll("h2, h3"));
    const faqs: { q: string; a: string }[] = [];
    headings.forEach((h) => {
      const text = (h.textContent || "").trim();
      if (!text.endsWith("?")) return;
      let answer = "";
      let next = h.nextElementSibling;
      while (next && !["H1", "H2", "H3", "H4"].includes(next.tagName)) {
        answer += " " + (next.textContent || "");
        next = next.nextElementSibling;
      }
      const a = answer.trim();
      if (a) faqs.push({ q: text, a });
    });
    if (faqs.length < 2) return null;
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    };
  } catch {
    return null;
  }
};

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      setPost(data);
      setLoading(false);
    };
    fetchPost();
  }, [slug]);

  const renderedHtml = useMemo(() => {
    if (!post || !isHtml(post.content)) return null;
    return DOMPurify.sanitize(post.content, { ADD_ATTR: ["target", "rel"] });
  }, [post]);

  useEffect(() => {
    if (!renderedHtml) return;
    const schema = extractFaqSchema(renderedHtml);
    if (!schema) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(schema);
    script.setAttribute("data-faq-schema", "true");
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [renderedHtml]);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent">
        <Navbar />
        <div className="flex justify-center items-center pt-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-transparent">
        <Navbar />
        <main className="pt-24 pb-16 px-6 max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-display mb-4">Post not found</h1>
          <Link to="/blog" className="text-primary hover:underline">← Back to Blog</Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />
      <main className="pt-24 pb-16 px-6 max-w-3xl mx-auto">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Blog
        </Link>

        {post.cover_image_url && (
          <div className="rounded-xl overflow-hidden mb-8 aspect-video">
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
          {format(new Date(post.published_at || post.created_at), "MMMM d, yyyy")}
        </p>
        <h1 className="text-3xl md:text-4xl font-display tracking-wider mb-8">{post.title}</h1>

        {renderedHtml ? (
          <article className="blog-content" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
        ) : (
          <article className="blog-content">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </article>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BlogPost;
