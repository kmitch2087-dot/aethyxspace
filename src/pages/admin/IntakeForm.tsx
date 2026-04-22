import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type Field = {
  id: string;
  field_key: string;
  label: string;
  help_text: string | null;
  field_type: string;
  options: string[];
  required: boolean;
  section: "about" | "project" | "market" | "extra";
  display_order: number;
  active: boolean;
};

const SECTIONS: Field["section"][] = ["about", "project", "market", "extra"];
const TYPES = ["text", "textarea", "email", "tel", "url", "select", "multiselect"];

const blank = (section: Field["section"]): Partial<Field> => ({
  field_key: "",
  label: "",
  help_text: "",
  field_type: "text",
  options: [],
  required: false,
  section,
  display_order: 999,
  active: true,
});

const IntakeFormManager = () => {
  const { toast } = useToast();
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Field> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("intake_form_fields")
      .select("*")
      .order("section", { ascending: true })
      .order("display_order", { ascending: true });
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    } else {
      setFields((data || []) as unknown as Field[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const move = async (f: Field, dir: -1 | 1) => {
    const sectionFields = fields
      .filter((x) => x.section === f.section)
      .sort((a, b) => a.display_order - b.display_order);
    const idx = sectionFields.findIndex((x) => x.id === f.id);
    const swapWith = sectionFields[idx + dir];
    if (!swapWith) return;
    await Promise.all([
      supabase.from("intake_form_fields").update({ display_order: swapWith.display_order }).eq("id", f.id),
      supabase.from("intake_form_fields").update({ display_order: f.display_order }).eq("id", swapWith.id),
    ]);
    load();
  };

  const toggleActive = async (f: Field) => {
    await supabase.from("intake_form_fields").update({ active: !f.active }).eq("id", f.id);
    load();
  };

  const remove = async (f: Field) => {
    if (!confirm(`Delete field "${f.label}"? This cannot be undone.`)) return;
    await supabase.from("intake_form_fields").delete().eq("id", f.id);
    toast({ title: "Field deleted" });
    load();
  };

  const save = async () => {
    if (!editing?.label?.trim() || !editing?.field_key?.trim()) {
      toast({ title: "Label and key required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      field_key: editing.field_key.trim(),
      label: editing.label.trim(),
      help_text: editing.help_text?.trim() || null,
      field_type: editing.field_type || "text",
      options: editing.options || [],
      required: !!editing.required,
      section: editing.section || "extra",
      display_order: editing.display_order ?? 999,
      active: editing.active !== false,
    };
    let error;
    if (editing.id) {
      ({ error } = await supabase.from("intake_form_fields").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("intake_form_fields").insert(payload));
    }
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved" });
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Intake Form Builder</h1>
          <p className="text-sm text-black/60 mt-1">
            Add, reorder, or hide questions on the public <code>/intake</code> form. Changes go live instantly.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {SECTIONS.map((section) => {
            const items = fields
              .filter((f) => f.section === section)
              .sort((a, b) => a.display_order - b.display_order);
            return (
              <section key={section}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display text-xl tracking-tight capitalize">
                    {section === "extra" ? "Anything else" : `The ${section}`}
                  </h2>
                  <Button size="sm" variant="outline" onClick={() => setEditing(blank(section))}>
                    <Plus className="h-4 w-4 mr-1" /> Add field
                  </Button>
                </div>
                <div className="border border-black/10 rounded-xl divide-y divide-black/10">
                  {items.length === 0 && (
                    <div className="p-4 text-sm text-black/50 italic">No fields in this section yet.</div>
                  )}
                  {items.map((f, idx) => (
                    <div key={f.id} className="flex items-center gap-3 p-3">
                      <div className="flex flex-col gap-1">
                        <button
                          className="text-black/40 hover:text-black disabled:opacity-30"
                          disabled={idx === 0}
                          onClick={() => move(f, -1)}
                          aria-label="Move up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          className="text-black/40 hover:text-black disabled:opacity-30"
                          disabled={idx === items.length - 1}
                          onClick={() => move(f, 1)}
                          aria-label="Move down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{f.label}</span>
                          {f.required && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-black/5">required</span>
                          )}
                          <span className="text-xs text-black/50">{f.field_type}</span>
                        </div>
                        <code className="text-xs text-black/40">{f.field_key}</code>
                      </div>
                      <Switch checked={f.active} onCheckedChange={() => toggleActive(f)} />
                      <Button size="icon" variant="ghost" onClick={() => setEditing(f)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(f)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit field" : "New field"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Label *</Label>
                <Input
                  value={editing.label || ""}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                />
              </div>
              <div>
                <Label>Field key * <span className="text-xs text-black/50">(unique, no spaces)</span></Label>
                <Input
                  value={editing.field_key || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, field_key: e.target.value.toLowerCase().replace(/\s+/g, "_") })
                  }
                  disabled={!!editing.id}
                />
              </div>
              <div>
                <Label>Help text</Label>
                <Input
                  value={editing.help_text || ""}
                  onChange={(e) => setEditing({ ...editing, help_text: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={editing.field_type || "text"}
                    onValueChange={(v) => setEditing({ ...editing, field_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Section</Label>
                  <Select
                    value={editing.section || "extra"}
                    onValueChange={(v) => setEditing({ ...editing, section: v as Field["section"] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SECTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(editing.field_type === "select" || editing.field_type === "multiselect") && (
                <div>
                  <Label>Options <span className="text-xs text-black/50">(one per line)</span></Label>
                  <Textarea
                    rows={4}
                    value={(editing.options || []).join("\n")}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                  />
                </div>
              )}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={!!editing.required}
                    onCheckedChange={(v) => setEditing({ ...editing, required: v })}
                  />
                  Required
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={editing.active !== false}
                    onCheckedChange={(v) => setEditing({ ...editing, active: v })}
                  />
                  Active
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntakeFormManager;
