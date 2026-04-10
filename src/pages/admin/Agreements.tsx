import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Agreement {
  id: string;
  client_name: string;
  client_email: string | null;
  service_name: string | null;
  agreement_url: string | null;
  signed_at: string | null;
  status: string;
  amount: number | null;
  notes: string | null;
  created_at: string;
}

const emptyForm = {
  client_name: "",
  client_email: "",
  service_name: "",
  agreement_url: "",
  status: "draft",
  amount: "",
  notes: "",
};

const Agreements = () => {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Agreement | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchAgreements = async () => {
    const { data } = await supabase
      .from("client_agreements")
      .select("*")
      .order("created_at", { ascending: false });
    setAgreements(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAgreements(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setEditorOpen(true);
  };

  const openEdit = (a: Agreement) => {
    setEditing(a);
    setForm({
      client_name: a.client_name,
      client_email: a.client_email || "",
      service_name: a.service_name || "",
      agreement_url: a.agreement_url || "",
      status: a.status,
      amount: a.amount?.toString() || "",
      notes: a.notes || "",
    });
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!form.client_name.trim()) {
      toast({ title: "Client name is required", variant: "destructive" });
      return;
    }
    const payload = {
      client_name: form.client_name,
      client_email: form.client_email || null,
      service_name: form.service_name || null,
      agreement_url: form.agreement_url || null,
      status: form.status,
      amount: form.amount ? parseFloat(form.amount) : null,
      notes: form.notes || null,
      signed_at: form.status === "signed" ? new Date().toISOString() : null,
    };

    if (editing) {
      const { error } = await supabase.from("client_agreements").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Agreement updated!" });
    } else {
      const { error } = await supabase.from("client_agreements").insert(payload);
      if (error) { toast({ title: "Create failed", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Agreement created!" });
    }
    setEditorOpen(false);
    fetchAgreements();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this agreement?")) return;
    await supabase.from("client_agreements").delete().eq("id", id);
    toast({ title: "Agreement deleted" });
    fetchAgreements();
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      sent: "bg-blue-500/20 text-blue-400",
      signed: "bg-emerald-500/20 text-emerald-400",
    };
    return <span className={`text-xs px-2 py-1 rounded-full ${styles[status] || "bg-muted text-muted-foreground"}`}>{status}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display tracking-wider">Client Agreements</h1>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> New Agreement</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : agreements.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">No agreements yet.</p>
      ) : (
        <div className="rounded-lg border border-border/30 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="hidden md:table-cell">Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Amount</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agreements.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.client_name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{a.service_name || "—"}</TableCell>
                  <TableCell>{statusBadge(a.status)}</TableCell>
                  <TableCell className="hidden md:table-cell">{a.amount ? `$${Number(a.amount).toLocaleString()}` : "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">{format(new Date(a.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wider">{editing ? "Edit Agreement" : "New Agreement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Name *</Label>
                <Input value={form.client_name} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Client Email</Label>
                <Input type="email" value={form.client_email} onChange={(e) => setForm((f) => ({ ...f, client_email: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Service</Label>
                <Input value={form.service_name} onChange={(e) => setForm((f) => ({ ...f, service_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Agreement URL</Label>
              <Input value={form.agreement_url} onChange={(e) => setForm((f) => ({ ...f, agreement_url: e.target.value }))} placeholder="Link to agreement document" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="signed">Signed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Agreements;
