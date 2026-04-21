import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { breadcrumb } from "@/lib/seoSchemas";
import { format } from "date-fns";

interface BlogPostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
}

const Blog = () => {
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image_url, published_at, created_at")
        .eq("published", true)
        .order("published_at", { ascending: false });
      setPosts(data || []);
      setLoading(false);
    };
    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen bg-transparent">
      <Seo
        title="Aethyx Blog — Web Design, Branding & Digital Strategy Insights"
        description="Insights on web design, brand strategy, SEO, and growing your digital presence — written for ambitious businesses by the Aethyx team."
        path="/blog"
        jsonLd={breadcrumb([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
        ])}
      />
      <Navbar />
      <main className="pt-24 pb-16 px-6 max-w-5xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-display tracking-wider mb-4">Blog</h1>
        <p className="text-muted-foreground mb-12 max-w-2xl">
          Insights on branding, web design, & growing your digital presence.
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">No posts yet. Check back soon!</p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group block rounded-xl border border-border/30 bg-card overflow-hidden hover:border-primary/40 transition-all duration-300"
              >
                {post.cover_image_url && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-5">
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                    {format(new Date(post.published_at || post.created_at), "MMM d, yyyy")}
                  </p>
                  <h2 className="text-lg font-display tracking-wider mb-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
