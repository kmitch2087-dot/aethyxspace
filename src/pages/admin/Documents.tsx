import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Upload, Download, Trash2, FileText, Search, MoreHorizontal, Share2, Mail, Clock, Users, Sparkles } from "lucide-react";

interface Doc {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  category: string;
  created_at: string;
}

interface ClientProfile {
  id: string;
  full_name: string;
  email: string | null;
  first_name: string | null;
}

interface ClientDoc {
  id: string;
  title: string;
  file_url: string;
  client_profile_id: string | null;
  parent_admin_doc_id: string | null;
  created_at: string;
  uploaded_by: string;
  note: string | null;
}

const CATEGORIES = ["general", "contracts", "templates", "invoices", "legal", "internal"];

const formatBytes = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const Documents = () => {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [clientDocs, setClientDocs] = useState<ClientDoc[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");

  // Upload form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Action dialogs
  const [actionDoc, setActionDoc] = useState<Doc | null>(null);
  const [actionMode, setActionMode] = useState<"share" | "email" | "schedule" | "extract" | null>(null);
  const [actionClientIds, setActionClientIds] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState("");
  const [actionSubject, setActionSubject] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  // Schedule fields
  const [schedTrigger, setSchedTrigger] = useState<"once" | "recurring" | "event">("once");
  const [schedRunAt, setSchedRunAt] = useState("");
  const [schedRecurrence, setSchedRecurrence] = useState("weekly");
  const [schedEvent, setSchedEvent] = useState("client_added");
  const [schedTargetType, setSchedTargetType] = useState<"specific" | "all" | "event_subject">("event_subject");

  // Client upload
  const [clientUploadOpen, setClientUploadOpen] = useState(false);
  const clientFileRef = useRef<HTMLInputElement>(null);
  const [clientUploadTitle, setClientUploadTitle] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    const [docRes, clientRes, sharedRes] = await Promise.all([
      supabase.from("admin_documents").select("*").order("created_at", { ascending: false }),
      supabase.from("client_profiles").select("id, full_name, email, first_name").order("full_name"),
      supabase.from("client_documents").select("*").order("created_at", { ascending: false }),
    ]);
    setDocs(docRes.data || []);
    setClients(clientRes.data || []);
    setClientDocs(sharedRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file || !title.trim()) {
      toast({ title: "Title and file required", variant: "destructive" });
      return;
    }
    if (file.size > 52428800) {
      toast({ title: "File too large (max 50MB)", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("admin-documents").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("admin_documents").insert({
        title: title.trim(), description: description.trim() || null,
        file_path: path, file_name: file.name, file_type: file.type || ext, file_size: file.size, category,
      });
      if (dbErr) throw dbErr;
      toast({ title: "Document uploaded" });
      setOpen(false); setTitle(""); setDescription(""); setCategory("general");
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchAll();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: Doc) => {
    const { data, error } = await supabase.storage.from("admin-documents").createSignedUrl(doc.file_path, 60);
    if (error || !data) return toast({ title: "Download failed", variant: "destructive" });
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (doc: Doc) => {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    await supabase.storage.from("admin-documents").remove([doc.file_path]);
    await supabase.from("admin_documents").delete().eq("id", doc.id);
    toast({ title: "Deleted" });
    fetchAll();
  };

  const openAction = (doc: Doc, mode: "share" | "email" | "schedule" | "extract") => {
    setActionDoc(doc);
    setActionMode(mode);
    setActionClientIds([]);
    setActionMessage("");
    setActionSubject(mode === "email" ? `Document: ${doc.title}` : "");
    setSchedTrigger("once");
    setSchedRunAt(""); setSchedRecurrence("weekly"); setSchedEvent("client_added");
    setSchedTargetType("event_subject");
  };

  const submitAction = async () => {
    if (!actionDoc || !actionMode) return;
    setActionBusy(true);
    try {
      if (actionMode === "extract") {
        if (actionClientIds.length !== 1) {
          toast({ title: "Select exactly one client", variant: "destructive" });
          setActionBusy(false); return;
        }
        const { data, error } = await supabase.functions.invoke("extract-document-assets", {
          body: {
            clientProfileId: actionClientIds[0],
            sourceDocumentId: actionDoc.id,
            sourceDocumentType: "admin_documents",
            planId: null,
          },
        });
        if (error || !data?.ok) throw new Error(data?.error || error?.message || "Extraction failed");
        if (data.textCount === 0 && data.geminiError) {
          toast({ title: "Extraction found nothing", description: data.geminiError });
        } else {
          toast({ title: "Extraction complete", description: `Found ${data.textCount} item(s) for review on that client's profile.` });
        }
      } else if (actionMode === "share" || actionMode === "email") {
        if (actionClientIds.length === 0) {
          toast({ title: "Select at least one client", variant: "destructive" });
          setActionBusy(false); return;
        }
        const { error } = await supabase.functions.invoke("document-actions", {
          body: {
            action: actionMode === "share" ? "share" : "share_and_email",
            adminDocId: actionDoc.id,
            clientProfileIds: actionClientIds,
            subject: actionSubject,
            message: actionMessage,
          },
        });
        if (error) throw error;
        toast({ title: actionMode === "share" ? "Shared with client(s)" : "Emailed to client(s)" });
      } else {
        // schedule
        const payload: any = {
          admin_document_id: actionDoc.id,
          trigger_type: schedTrigger,
          subject: actionSubject || null,
          message: actionMessage || null,
          target_type: schedTargetType,
          target_client_ids: schedTargetType === "specific" ? actionClientIds : [],
        };
        if (schedTrigger === "once") {
          if (!schedRunAt) { toast({ title: "Pick a date/time", variant: "destructive" }); setActionBusy(false); return; }
          payload.run_at = new Date(schedRunAt).toISOString();
          payload.next_run_at = payload.run_at;
        } else if (schedTrigger === "recurring") {
          if (!schedRunAt) { toast({ title: "Pick a start date/time", variant: "destructive" }); setActionBusy(false); return; }
          payload.recurrence = schedRecurrence;
          payload.next_run_at = new Date(schedRunAt).toISOString();
        } else {
          payload.event_name = schedEvent;
        }
        const { error } = await supabase.from("document_schedules").insert(payload);
        if (error) throw error;
        toast({ title: "Schedule created" });
      }
      setActionDoc(null); setActionMode(null);
      fetchAll();
    } catch (e: any) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    } finally {
      setActionBusy(false);
    }
  };

  const handleClientUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;
    const client = clients.find((c) => c.id === selectedClientId);
    const file = clientFileRef.current?.files?.[0];
    if (!client || !file || !clientUploadTitle.trim()) {
      toast({ title: "Title and file required", variant: "destructive" }); return;
    }
    setActionBusy(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${selectedClientId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("client-documents").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      // get profile.user_id
      const { data: profile } = await supabase.from("client_profiles").select("user_id").eq("id", selectedClientId).single();
      const { error } = await supabase.from("client_documents").insert({
        client_profile_id: selectedClientId,
        user_id: profile?.user_id,
        title: clientUploadTitle.trim(),
        file_url: path,
        uploaded_by: "admin",
      });
      if (error) throw error;
      toast({ title: "Uploaded to client" });
      setClientUploadOpen(false); setClientUploadTitle("");
      if (clientFileRef.current) clientFileRef.current.value = "";
      fetchAll();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setActionBusy(false);
    }
  };

  const filteredDocs = docs.filter((d) => {
    const m = !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.file_name.toLowerCase().includes(search.toLowerCase());
    return m && (filterCat === "all" || d.category === filterCat);
  });

  const docsByCategory = CATEGORIES.reduce((acc, c) => {
    acc[c] = filteredDocs.filter((d) => d.category === c);
    return acc;
  }, {} as Record<string, Doc[]>);

  const selectedClientDocs = clientDocs.filter((d) => d.client_profile_id === selectedClientId);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display tracking-wider">Documents</h1>
          <p className="text-sm text-black/60 mt-1">Private library + client document repository.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Upload className="h-4 w-4" /> Upload</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>File (max 50MB)</Label><Input type="file" ref={fileInputRef} required /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={uploading}>Cancel</Button>
                <Button type="submit" disabled={uploading}>{uploading ? "Uploading…" : "Upload"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="my-files">
        <TabsList>
          <TabsTrigger value="my-files">My Files</TabsTrigger>
          <TabsTrigger value="client-files">Client Files</TabsTrigger>
        </TabsList>

        <TabsContent value="my-files" className="space-y-6 mt-6">
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40" />
              <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filteredDocs.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-black/60"><FileText className="h-10 w-10 mx-auto mb-3 text-black/30" />No documents.</CardContent></Card>
          ) : (
            CATEGORIES.map((cat) => {
              const items = docsByCategory[cat];
              if (!items.length) return null;
              return (
                <div key={cat}>
                  <h3 className="font-display text-sm tracking-wider uppercase text-black/60 mb-2">{cat}</h3>
                  <div className="rounded-lg border border-black/10 overflow-x-auto bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>File</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Uploaded</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell>
                              <div className="font-medium">{doc.title}</div>
                              {doc.description && <div className="text-xs text-black/50 mt-0.5">{doc.description}</div>}
                            </TableCell>
                            <TableCell className="text-sm text-black/60 max-w-[180px] truncate">{doc.file_name}</TableCell>
                            <TableCell className="text-sm text-black/60">{formatBytes(doc.file_size)}</TableCell>
                            <TableCell className="text-sm text-black/60">{format(new Date(doc.created_at), "MMM d, yyyy")}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost" onClick={() => handleDownload(doc)}><Download className="h-4 w-4" /></Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openAction(doc, "share")}><Share2 className="h-4 w-4 mr-2" />Share with client(s)</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openAction(doc, "email")}><Mail className="h-4 w-4 mr-2" />Email now</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openAction(doc, "schedule")}><Clock className="h-4 w-4 mr-2" />Schedule send</DropdownMenuItem>
                                  {doc.file_name.toLowerCase().endsWith(".pdf") && (
                                    <DropdownMenuItem onClick={() => openAction(doc, "extract")}><Sparkles className="h-4 w-4 mr-2" />Extract info</DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDelete(doc)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="client-files" className="mt-6">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-4">
              <h3 className="font-display text-sm tracking-wider uppercase text-black/60 mb-2 flex items-center gap-2"><Users className="h-4 w-4" /> Clients</h3>
              <div className="rounded-lg border border-black/10 bg-white max-h-[600px] overflow-y-auto">
                {clients.length === 0 ? (
                  <p className="p-4 text-sm text-black/60">No clients yet.</p>
                ) : clients.map((c) => (
                  <button key={c.id} onClick={() => setSelectedClientId(c.id)}
                    className={`block w-full text-left px-4 py-2 border-b border-black/5 hover:bg-black/5 ${selectedClientId === c.id ? "bg-primary/10" : ""}`}>
                    <div className="font-medium text-sm">{c.full_name}</div>
                    <div className="text-xs text-black/50">{c.email}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-12 md:col-span-8">
              {!selectedClientId ? (
                <Card><CardContent className="py-12 text-center text-black/60">Select a client to see their files.</CardContent></Card>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-sm tracking-wider uppercase text-black/60">
                      Files for {clients.find((c) => c.id === selectedClientId)?.full_name}
                    </h3>
                    <Button size="sm" onClick={() => setClientUploadOpen(true)}><Upload className="h-4 w-4 mr-1" /> Upload to client</Button>
                  </div>
                  {selectedClientDocs.length === 0 ? (
                    <Card><CardContent className="py-12 text-center text-black/60">No documents shared with this client yet.</CardContent></Card>
                  ) : (
                    <div className="rounded-lg border border-black/10 bg-white">
                      <Table>
                        <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Source</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
                        <TableBody>
                          {selectedClientDocs.map((d) => (
                            <TableRow key={d.id}>
                              <TableCell className="font-medium">{d.title}</TableCell>
                              <TableCell className="text-xs text-black/60">{d.parent_admin_doc_id ? "Shared from library" : "Direct upload"}</TableCell>
                              <TableCell className="text-xs text-black/60">{format(new Date(d.created_at), "MMM d, yyyy")}</TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="ghost" onClick={async () => {
                                  const { data } = await supabase.storage.from(d.parent_admin_doc_id ? "admin-documents" : "client-documents").createSignedUrl(d.file_url, 60);
                                  if (data) window.open(data.signedUrl, "_blank");
                                }}><Download className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => {
                                  if (!confirm("Remove from client?")) return;
                                  await supabase.from("client_documents").delete().eq("id", d.id);
                                  fetchAll();
                                }}><Trash2 className="h-4 w-4" /></Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Upload to specific client dialog */}
      <Dialog open={clientUploadOpen} onOpenChange={setClientUploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload to client</DialogTitle></DialogHeader>
          <form onSubmit={handleClientUpload} className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input value={clientUploadTitle} onChange={(e) => setClientUploadTitle(e.target.value)} required /></div>
            <div className="space-y-2"><Label>File</Label><Input type="file" ref={clientFileRef} required /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setClientUploadOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={actionBusy}>{actionBusy ? "Uploading…" : "Upload"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Action dialog (share / email / schedule) */}
      <Dialog open={!!actionDoc} onOpenChange={(o) => !o && setActionDoc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {actionMode === "share" && "Share with clients"}
              {actionMode === "email" && "Email to clients"}
              {actionMode === "schedule" && "Schedule document send"}
              {actionMode === "extract" && "Extract info — choose a client"}
            </DialogTitle>
          </DialogHeader>
          {actionDoc && (
            <div className="space-y-4">
              <div className="text-sm text-black/60">Document: <span className="font-medium text-black">{actionDoc.title}</span></div>

              {actionMode === "schedule" && (
                <>
                  <div className="space-y-2">
                    <Label>Trigger</Label>
                    <Select value={schedTrigger} onValueChange={(v: any) => setSchedTrigger(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once">Specific date/time</SelectItem>
                        <SelectItem value="recurring">Recurring</SelectItem>
                        <SelectItem value="event">Event-based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {schedTrigger === "once" && (
                    <div className="space-y-2"><Label>Send at</Label><Input type="datetime-local" value={schedRunAt} onChange={(e) => setSchedRunAt(e.target.value)} /></div>
                  )}
                  {schedTrigger === "recurring" && (
                    <>
                      <div className="space-y-2"><Label>First send at</Label><Input type="datetime-local" value={schedRunAt} onChange={(e) => setSchedRunAt(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Repeat</Label>
                        <Select value={schedRecurrence} onValueChange={setSchedRecurrence}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  {schedTrigger === "event" && (
                    <div className="space-y-2"><Label>Event</Label>
                      <Select value={schedEvent} onValueChange={setSchedEvent}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client_added">Client added</SelectItem>
                          <SelectItem value="portal_activated">Portal activated</SelectItem>
                          <SelectItem value="invoice_paid">Invoice paid</SelectItem>
                          <SelectItem value="intake_completed">Intake completed</SelectItem>
                          <SelectItem value="agreement_signed">Agreement signed</SelectItem>
                          <SelectItem value="project_status_changed">Project status changed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2"><Label>Recipients</Label>
                    <Select value={schedTargetType} onValueChange={(v: any) => setSchedTargetType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {schedTrigger === "event" && <SelectItem value="event_subject">Client tied to the event</SelectItem>}
                        <SelectItem value="all">All active clients</SelectItem>
                        <SelectItem value="specific">Specific clients</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {(actionMode === "share" || actionMode === "email" || actionMode === "extract" || (actionMode === "schedule" && schedTargetType === "specific")) && (
                <div className="space-y-2">
                  <Label>{actionMode === "extract" ? "Client (pick one)" : "Clients"}</Label>
                  <div className="border rounded p-2 max-h-40 overflow-y-auto space-y-1">
                    {clients.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <input
                          type={actionMode === "extract" ? "radio" : "checkbox"}
                          name={actionMode === "extract" ? "extract-client" : undefined}
                          checked={actionClientIds.includes(c.id)}
                          onChange={(e) => {
                            if (actionMode === "extract") {
                              setActionClientIds(e.target.checked ? [c.id] : []);
                            } else {
                              setActionClientIds((ids) => e.target.checked ? [...ids, c.id] : ids.filter((i) => i !== c.id));
                            }
                          }}
                        />
                        {c.full_name} <span className="text-black/40">({c.email || "no email"})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {(actionMode === "email" || actionMode === "schedule") && (
                <div className="space-y-2"><Label>Subject</Label><Input value={actionSubject} onChange={(e) => setActionSubject(e.target.value)} /></div>
              )}
              <div className="space-y-2"><Label>Message {actionMode === "share" && "(optional note)"}</Label><Textarea rows={3} value={actionMessage} onChange={(e) => setActionMessage(e.target.value)} /></div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setActionDoc(null)} disabled={actionBusy}>Cancel</Button>
                <Button onClick={submitAction} disabled={actionBusy}>{actionBusy ? "Working…" : "Confirm"}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documents;
