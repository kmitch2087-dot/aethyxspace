import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { FileText, MessageSquare, Star, DollarSign, FileSignature, BarChart3, Share2, Facebook, Save } from "lucide-react";

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
  const [fbPageId, setFbPageId] = useState(() => localStorage.getItem("fb_page_id") || "");
  const [fbAccessToken, setFbAccessToken] = useState(() => localStorage.getItem("fb_access_token") || "");
  const [savingFb, setSavingFb] = useState(false);

  useEffect(() => {
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

  const handleSaveFacebook = async () => {
    setSavingFb(true);
    try {
      localStorage.setItem("fb_page_id", fbPageId);
      localStorage.setItem("fb_access_token", fbAccessToken);
      toast({ title: "Saved", description: "Facebook credentials saved locally. They'll be configured as secrets when you're ready." });
    } finally {
      setSavingFb(false);
    }
  };

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
                  <Facebook className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-lg">Facebook Business Page</CardTitle>
                </div>
                <CardDescription>
                  Auto-post published blog articles to your Facebook page. Enter your Page ID & long-lived Page Access Token below.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fb-page-id">Page ID</Label>
                  <Input
                    id="fb-page-id"
                    placeholder="e.g. 123456789012345"
                    value={fbPageId}
                    onChange={(e) => setFbPageId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fb-token">Page Access Token</Label>
                  <Input
                    id="fb-token"
                    type="password"
                    placeholder="Paste your long-lived token here"
                    value={fbAccessToken}
                    onChange={(e) => setFbAccessToken(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Get this from Meta Business Suite → Graph API Explorer → generate a long-lived token with <code>pages_manage_posts</code> permission.
                  </p>
                </div>
                <Button onClick={handleSaveFacebook} disabled={savingFb} className="gap-2">
                  <Save className="h-4 w-4" /> Save Credentials
                </Button>
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
