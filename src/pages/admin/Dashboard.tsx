import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, MessageSquare, Star, DollarSign, FileSignature, BarChart3, Share2, Facebook, ShieldCheck } from "lucide-react";

const Dashboard = () => {
  const [stats, setStats] = useState({
    posts: 0,
    publishedPosts: 0,
    inquiries: 0,
    reviews: 0,
    pendingReviews: 0,
    agreements: 0,
    totalRevenue: 0,
    pendingPayments: 0,
  });
  const [trafficStats, setTrafficStats] = useState({ tiktok: 0, instagram: 0, facebook: 0, other: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cleanup: remove any FB credentials previously persisted in localStorage (now stored as backend secrets)
    try {
      localStorage.removeItem("fb_page_id");
      localStorage.removeItem("fb_access_token");
    } catch {}

    const fetchStats = async () => {
      const [postsRes, inquiriesRes, reviewsRes, agreementsRes, financialsRes, trafficRes] =
        await Promise.all([
          supabase.from("blog_posts").select("id, published"),
          supabase.from("waiting_list").select("id"),
          supabase.from("review_submissions").select("id, status"),
          supabase.from("client_agreements").select("id"),
          supabase.from("financial_records").select("amount, payment_status"),
          supabase.from("traffic_clicks").select("source"),
        ]);

      const posts = postsRes.data || [];
      const reviews = reviewsRes.data || [];
      const financials = financialsRes.data || [];
      const traffic = trafficRes.data || [];

      const tiktok = traffic.filter((t: any) => t.source === "tiktok").length;
      const instagram = traffic.filter((t: any) => t.source === "instagram").length;
      const facebook = traffic.filter((t: any) => t.source === "facebook").length;
      const other = traffic.filter((t: any) => t.source === "other").length;

      setTrafficStats({ tiktok, instagram, facebook, other, total: traffic.length });

      setStats({
        posts: posts.length,
        publishedPosts: posts.filter((p) => p.published).length,
        inquiries: (inquiriesRes.data || []).length,
        reviews: reviews.length,
        pendingReviews: reviews.filter((r) => r.status === "pending").length,
        agreements: (agreementsRes.data || []).length,
        totalRevenue: financials
          .filter((f) => f.payment_status === "paid")
          .reduce((sum, f) => sum + Number(f.amount), 0),
        pendingPayments: financials.filter((f) => f.payment_status === "pending").length,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const cards = [
    {
      title: "Blog Posts",
      value: stats.posts,
      sub: `${stats.publishedPosts} published`,
      icon: FileText,
      color: "text-primary",
    },
    {
      title: "Inquiries",
      value: stats.inquiries,
      sub: "waiting list entries",
      icon: MessageSquare,
      color: "text-blue-400",
    },
    {
      title: "Reviews",
      value: stats.reviews,
      sub: `${stats.pendingReviews} pending`,
      icon: Star,
      color: "text-yellow-400",
    },
    {
      title: "Agreements",
      value: stats.agreements,
      sub: "total agreements",
      icon: FileSignature,
      color: "text-purple-400",
    },
    {
      title: "Revenue",
      value: `$${stats.totalRevenue.toLocaleString()}`,
      sub: `${stats.pendingPayments} pending`,
      icon: DollarSign,
      color: "text-emerald-400",
    },
  ];



  return (
    <div>
      <h1 className="text-2xl font-display tracking-wider mb-6">Dashboard</h1>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-1.5">
            <Share2 className="h-3.5 w-3.5" /> Social / Sharing
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {cards.map((card) => (
              <Card key={card.title} className="border-border/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Traffic Sources */}
          <h2 className="text-xl font-display tracking-wider mt-10 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Traffic Sources
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "TikTok", count: trafficStats.tiktok, color: "text-pink-400" },
              { label: "Instagram", count: trafficStats.instagram, color: "text-orange-400" },
              { label: "Facebook", count: trafficStats.facebook, color: "text-blue-500" },
              { label: "Other", count: trafficStats.other, color: "text-muted-foreground" },
              { label: "Total Clicks", count: trafficStats.total, color: "text-primary" },
            ].map((item) => (
              <Card key={item.label} className="border-border/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${item.color}`}>{item.count}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Social / Sharing Tab */}
        <TabsContent value="social">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Facebook */}
            <Card className="border-border/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Facebook className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Facebook Business Page</CardTitle>
                </div>
                <CardDescription>
                  Auto-post published blog articles to your Facebook page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border/40 bg-muted/30 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Credentials are stored server-side</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        For security, your Facebook Page ID and Access Token are stored as encrypted backend secrets — never in your browser. Add these as secrets in Supabase (Project Settings → Edge Functions → Secrets): <code className="px-1 py-0.5 rounded bg-background/50">FACEBOOK_PAGE_ID</code> and <code className="px-1 py-0.5 rounded bg-background/50">FACEBOOK_ACCESS_TOKEN</code>, and they'll be available to the auto-posting edge function.
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Generate a long-lived Page Access Token from Meta Business Suite → Graph API Explorer with the <code>pages_manage_posts</code> permission, then save it as a secret in Supabase (Project Settings → Edge Functions → Secrets).
                </p>
              </CardContent>
            </Card>

            {/* Placeholder for Instagram / future platforms */}
            <Card className="border-border/30 opacity-60">
              <CardHeader>
                <CardTitle className="text-lg">Instagram (Coming Soon)</CardTitle>
                <CardDescription>
                  Auto-share blog posts as Instagram feed posts. Requires a connected Facebook Business page first.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground italic">This integration will be available once your Facebook page is connected.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
