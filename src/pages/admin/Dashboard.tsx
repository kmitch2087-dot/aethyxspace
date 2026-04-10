import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MessageSquare, Star, DollarSign, FileSignature } from "lucide-react";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [postsRes, inquiriesRes, reviewsRes, agreementsRes, financialsRes] =
        await Promise.all([
          supabase.from("blog_posts").select("id, published"),
          supabase.from("waiting_list").select("id"),
          supabase.from("review_submissions").select("id, status"),
          supabase.from("client_agreements").select("id"),
          supabase.from("financial_records").select("amount, payment_status"),
        ]);

      const posts = postsRes.data || [];
      const reviews = reviewsRes.data || [];
      const financials = financialsRes.data || [];

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
    </div>
  );
};

export default Dashboard;
