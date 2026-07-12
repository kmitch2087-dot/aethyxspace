import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

interface Inquiry {
  id: string;
  name: string;
  email: string;
  update_frequency: string;
  website_url: string | null;
  created_at: string;
}

interface AdvertiserInquiry {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  website_url: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

const AD_STATUSES = ["new", "contacted", "closed"] as const;

const statusVariant = (status: string) =>
  status === "new" ? "default" : status === "contacted" ? "secondary" : "outline";

const Inquiries = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [adInquiries, setAdInquiries] = useState<AdvertiserInquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [waiting, ads] = await Promise.all([
        supabase.from("waiting_list").select("*").order("created_at", { ascending: false }),
        supabase.from("advertiser_inquiries" as any).select("*").order("created_at", { ascending: false }),
      ]);
      setInquiries(waiting.data || []);
      setAdInquiries((ads.data as unknown as AdvertiserInquiry[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const setAdStatus = async (id: string, status: string) => {
    const prev = adInquiries;
    setAdInquiries((list) => list.map((a) => (a.id === id ? { ...a, status } : a)));
    const { error } = await supabase
      .from("advertiser_inquiries" as any)
      .update({ status } as any)
      .eq("id", id);
    if (error) setAdInquiries(prev);
  };

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

      <h2 className="text-xl font-display tracking-wider mt-12 mb-2">Advertising Inquiries</h2>
      <p className="text-muted-foreground mb-6 text-sm">Partners requesting ad space via /advertise.</p>

      {!loading && (adInquiries.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">No advertising inquiries yet.</p>
      ) : (
        <div className="rounded-lg border border-border/30 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="hidden lg:table-cell">Website</TableHead>
                <TableHead className="hidden md:table-cell">Message</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adInquiries.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.company_name}</TableCell>
                  <TableCell>
                    <div className="text-sm">{a.contact_name}</div>
                    <a href={`mailto:${a.email}`} className="text-primary hover:underline text-xs">{a.email}</a>
                    {a.phone && <div className="text-muted-foreground text-xs">{a.phone}</div>}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {a.website_url ? (
                      <a href={a.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                        {a.website_url.replace(/^https?:\/\//, "").slice(0, 30)}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-xs">
                    {a.message ? (
                      <span className="text-muted-foreground text-sm line-clamp-2" title={a.message}>{a.message}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {format(new Date(a.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Select value={a.status} onValueChange={(v) => setAdStatus(a.id, v)}>
                      <SelectTrigger className="h-8 w-[130px] border-0 bg-transparent p-0 focus:ring-0 [&>svg]:ml-1">
                        <SelectValue asChild>
                          <Badge variant={statusVariant(a.status)} className="capitalize cursor-pointer">{a.status}</Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {AD_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
};

export default Inquiries;
