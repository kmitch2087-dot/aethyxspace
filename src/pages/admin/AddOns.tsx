import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Loader2 } from "lucide-react";

const lightVars = {
  "--background": "0 0% 100%", "--foreground": "0 0% 4%",
  "--card": "0 0% 98%", "--card-foreground": "0 0% 4%",
  "--popover": "0 0% 100%", "--popover-foreground": "0 0% 4%",
  "--muted": "0 0% 96%", "--muted-foreground": "0 0% 45%",
  "--input": "0 0% 93%", "--border": "0 0% 88%",
  "--secondary": "0 0% 96%", "--secondary-foreground": "0 0% 9%",
  "--accent": "0 0% 96%", "--accent-foreground": "0 0% 9%",
} as React.CSSProperties;

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  type: string;
  category: string;
  price_min: number | null;
  price_max: number | null;
  display_price: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
}

type FormState = {
  name: string;
  description: string;
  category: string;
  type: string;
  price_min: string;
  price_max: string;
  display_price: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  category: "retainer",
  type: "recurring",
  price_min: "",
  price_max: "",
  display_price: "",
  active: true,
};

function computeDisplayPrice(minStr: string, maxStr: string, type: string): string {
  const min = parseFloat(minStr);
  const max = parseFloat(maxStr);
  if (isNaN(min) && isNaN(max)) return "";
  const fmt = (n: number) => `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
  const parts: string[] = [];
  if (!isNaN(min)) parts.push(fmt(min));
  if (!isNaN(max) && max !== min) parts.push(fmt(max));
  const range = parts.join(" – ");
  return type === "recurring" ? `${range} / mo` : range;
}

const AddOns = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState("");

  const fetchItems = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from("add_on_catalog").select("*").order("sort_order", { ascending: true });
    setItems((data as CatalogItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const updateForm = (patch: Partial<FormState>) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if ("price_min" in patch || "price_max" in patch || "type" in patch) {
        next.display_price = computeDisplayPrice(next.price_min, next.price_max, next.type);
      }
      return next;
    });
  };

  const openDialog = (item: CatalogItem | null) => {
    setEditTarget(item);
    if (item) {
      setForm({
        name: item.name,
        description: item.description || "",
        category: item.category,
        type: item.type,
        price_min: item.price_min != null ? String(item.price_min) : "",
        price_max: item.price_max != null ? String(item.price_max) : "",
        display_price: item.display_price || "",
        active: item.active,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setDialogOpen(true);
  };

  const submitForm = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category,
      type: form.type,
      price_min: form.price_min ? parseFloat(form.price_min) : null,
      price_max: form.price_max ? parseFloat(form.price_max) : null,
      display_price: form.display_price.trim() || null,
      active: form.active,
      updated_at: new Date().toISOString(),
    };

    if (editTarget) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("add_on_catalog").update(payload).eq("id", editTarget.id);
      setSaving(false);
      if (error) {
        toast({ title: "Save failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Service updated" });
        setDialogOpen(false);
        fetchItems();
      }
    } else {
      const maxSort = items.length ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("add_on_catalog").insert({ ...payload, sort_order: maxSort });
      setSaving(false);
      if (error) {
        toast({ title: "Create failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Service added" });
        setDialogOpen(false);
        fetchItems();
      }
    }
  };

  const toggleActive = async (item: CatalogItem) => {
    const newVal = !item.active;
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, active: newVal } : i));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("add_on_catalog").update({ active: newVal, updated_at: new Date().toISOString() }).eq("id", item.id);
  };

  const swapSort = async (indexA: number, indexB: number) => {
    const a = items[indexA];
    const b = items[indexB];
    await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("add_on_catalog").update({ sort_order: b.sort_order }).eq("id", a.id),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("add_on_catalog").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    setItems((prev) => {
      const next = [...prev];
      next[indexA] = { ...next[indexA], sort_order: b.sort_order };
      next[indexB] = { ...next[indexB], sort_order: a.sort_order };
      return next.sort((x, y) => x.sort_order - y.sort_order);
    });
  };

  const saveEditingPrice = async (item: CatalogItem) => {
    const val = editingPriceValue.trim();
    setEditingPriceId(null);
    if (val === (item.display_price || "")) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("add_on_catalog").update({ display_price: val || null, updated_at: new Date().toISOString() }).eq("id", item.id);
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, display_price: val || null } : i));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const targetId = deleteId;
    setDeleteId(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("add_on_catalog").delete().eq("id", targetId);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Service deleted" });
      setItems((prev) => prev.filter((i) => i.id !== targetId));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display tracking-wider">Add-On Services</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your service catalog. Changes here reflect across all client assignments.
          </p>
        </div>
        <Button size="sm" onClick={() => openDialog(null)}>
          <Plus className="h-4 w-4 mr-2" /> Add New Service
        </Button>
      </div>

      <div className="rounded-lg border border-black/10 overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-black/[0.02]">
              <TableHead className="w-16">Sort</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-28">Category</TableHead>
              <TableHead className="w-28">Type</TableHead>
              <TableHead className="w-48">Price Range</TableHead>
              <TableHead className="w-20">Status</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  No services in catalog yet.
                </TableCell>
              </TableRow>
            ) : items.map((item, idx) => (
              <TableRow key={item.id} className={item.active ? "" : "opacity-50"}>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <button
                      className="p-0.5 rounded hover:bg-black/5 disabled:opacity-30"
                      onClick={() => swapSort(idx, idx - 1)}
                      disabled={idx === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      className="p-0.5 rounded hover:bg-black/5 disabled:opacity-30"
                      onClick={() => swapSort(idx, idx + 1)}
                      disabled={idx === items.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-sm">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                  )}
                </TableCell>
                <TableCell>
                  {item.category === "retainer" ? (
                    <Badge className="bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-100 text-xs">Retainer</Badge>
                  ) : (
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100 text-xs">Project</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {item.type === "recurring" ? "Recurring" : "One-time"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {editingPriceId === item.id ? (
                    <input
                      autoFocus
                      className="text-sm w-full bg-white border border-black/20 rounded px-2 py-1 focus:outline-none focus:border-primary"
                      value={editingPriceValue}
                      onChange={(e) => setEditingPriceValue(e.target.value)}
                      onBlur={() => saveEditingPrice(item)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditingPrice(item);
                        if (e.key === "Escape") setEditingPriceId(null);
                      }}
                    />
                  ) : (
                    <button
                      className="text-sm text-left hover:text-primary transition-colors w-full"
                      onClick={() => { setEditingPriceId(item.id); setEditingPriceValue(item.display_price || ""); }}
                    >
                      {item.display_price || <span className="text-muted-foreground italic text-xs">click to set</span>}
                    </button>
                  )}
                </TableCell>
                <TableCell>
                  <Switch checked={item.active} onCheckedChange={() => toggleActive(item)} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openDialog(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white text-black" style={lightVars}>
          <DialogHeader>
            <DialogTitle className="text-black">
              {editTarget ? "Edit Service" : "Add New Service"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-black">Name</Label>
              <Input
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                className="bg-white text-black border-black/20"
                placeholder="e.g. Monthly SEO Retainer"
              />
            </div>
            <div>
              <Label className="text-black">Description</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                className="bg-white text-black border-black/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-black">Category</Label>
                <Select value={form.category} onValueChange={(v) => updateForm({ category: v })}>
                  <SelectTrigger className="bg-white text-black border-black/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={lightVars} className="bg-white text-black">
                    <SelectItem value="retainer">Retainer</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-black">Type</Label>
                <Select value={form.type} onValueChange={(v) => updateForm({ type: v })}>
                  <SelectTrigger className="bg-white text-black border-black/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={lightVars} className="bg-white text-black">
                    <SelectItem value="recurring">Recurring</SelectItem>
                    <SelectItem value="one_time">One-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-black">Price min ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price_min}
                  onChange={(e) => updateForm({ price_min: e.target.value })}
                  className="bg-white text-black border-black/20"
                />
              </div>
              <div>
                <Label className="text-black">Price max ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price_max}
                  onChange={(e) => updateForm({ price_max: e.target.value })}
                  className="bg-white text-black border-black/20"
                />
              </div>
            </div>
            <div>
              <Label className="text-black">Display price</Label>
              <Input
                value={form.display_price}
                onChange={(e) => setForm((prev) => ({ ...prev, display_price: e.target.value }))}
                className="bg-white text-black border-black/20"
                placeholder="e.g. $150 – $299 / mo"
              />
              <p className="text-xs text-muted-foreground mt-1">Auto-generated from price min/max — you can override it here.</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="active-toggle"
                checked={form.active}
                onCheckedChange={(v) => updateForm({ active: v })}
              />
              <Label htmlFor="active-toggle" className="text-black cursor-pointer">
                Active (visible for client assignment)
              </Label>
            </div>
            <Button onClick={submitForm} disabled={saving || !form.name.trim()} className="w-full">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editTarget ? "Save changes" : "Add service"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent style={lightVars} className="bg-white text-black">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-black">Delete service?</AlertDialogTitle>
            <AlertDialogDescription className="text-black/60">
              This will permanently remove the service from the catalog. Existing client assignments will remain but will lose the catalog reference.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white text-black border-black/20 hover:bg-black/5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AddOns;
