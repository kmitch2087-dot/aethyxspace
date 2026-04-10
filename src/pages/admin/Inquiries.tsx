import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface Inquiry {
  id: string;
  name: string;
  email: string;
  update_frequency: string;
  website_url: string | null;
  created_at: string;
}

const Inquiries = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("waiting_list")
        .select("*")
        .order("created_at", { ascending: false });
      setInquiries(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-display tracking-wider mb-6">Inquiries</h1>
      <p className="text-muted-foreground mb-6 text-sm">Waiting list & contact form submissions.</p>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : inquiries.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">No inquiries yet.</p>
      ) : (
        <div className="rounded-lg border border-border/30 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden md:table-cell">Frequency</TableHead>
                <TableHead className="hidden lg:table-cell">Website</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inquiries.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell>
                    <a href={`mailto:${i.email}`} className="text-primary hover:underline">{i.email}</a>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{i.update_frequency}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {i.website_url ? (
                      <a href={i.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                        {i.website_url.replace(/^https?:\/\//, "").slice(0, 30)}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(i.created_at), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Inquiries;
