import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Check, X, Eye } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface Review {
  id: string;
  name: string;
  city: string;
  state: string;
  review_text: string;
  photo_url: string | null;
  status: string;
  review_date: string;
  created_at: string;
}

const Reviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Review | null>(null);

  const fetchReviews = async () => {
    const { data } = await supabase
      .from("review_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    setReviews(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("review_submissions")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Review ${status}` });
      fetchReviews();
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-400",
      approved: "bg-emerald-500/20 text-emerald-400",
      rejected: "bg-destructive/20 text-destructive",
    };
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${styles[status] || "bg-muted text-muted-foreground"}`}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-display tracking-wider mb-6">Reviews</h1>
      <p className="text-muted-foreground mb-6 text-sm">Manage submitted client reviews.</p>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">No reviews submitted yet.</p>
      ) : (
        <div className="rounded-lg border border-border/30 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {r.city}, {r.state}
                  </TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {format(new Date(r.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setSelected(r)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {r.status === "pending" && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => updateStatus(r.id, "approved")} className="text-emerald-400 hover:text-emerald-300">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => updateStatus(r.id, "rejected")} className="text-destructive hover:text-destructive">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Review Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wider">Review from {selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 mt-2">
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>{selected.city}, {selected.state}</span>
                <span>{format(new Date(selected.review_date), "MMM d, yyyy")}</span>
                {statusBadge(selected.status)}
              </div>
              {selected.photo_url && (
                <img src={selected.photo_url} alt="Review photo" className="rounded-lg max-h-48 object-cover" />
              )}
              <p className="text-sm leading-relaxed">{selected.review_text}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reviews;
