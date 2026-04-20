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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Upload, Trash2, ImageIcon, Search, Copy, ExternalLink, Film, File as FileGeneric } from "lucide-react";

interface MediaItem {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_type: string;
  mime_type: string | null;
  file_size: number | null;
  tags: string[];
  created_at: string;
}

const detectType = (mime: string): "image" | "video" | "other" => {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "other";
};

const formatBytes = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

// Cache signed URLs in-memory for the session
const urlCache = new Map<string, { url: string; expires: number }>();

const Media = () => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<MediaItem | null>(null);

  // Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_media")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error loading media", description: error.message, variant: "destructive" });
    }
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Generate signed URLs for all items (so previews show)
  useEffect(() => {
    const loadUrls = async () => {
      const now = Date.now();
      const toFetch = items.filter((i) => {
        const cached = urlCache.get(i.file_path);
        return !cached || cached.expires < now;
      });
      if (toFetch.length === 0) {
        // Still update state from cache
        const fromCache: Record<string, string> = {};
        items.forEach((i) => {
          const c = urlCache.get(i.file_path);
          if (c) fromCache[i.id] = c.url;
        });
        setPreviewUrls(fromCache);
        return;
      }
      const paths = toFetch.map((i) => i.file_path);
      const { data } = await supabase.storage
        .from("admin-media")
        .createSignedUrls(paths, 3600);

      const newMap: Record<string, string> = {};
      items.forEach((i) => {
        const cached = urlCache.get(i.file_path);
        if (cached && cached.expires >= now) {
          newMap[i.id] = cached.url;
        }
      });
      data?.forEach((d) => {
        if (d.signedUrl) {
          urlCache.set(d.path!, { url: d.signedUrl, expires: now + 3500 * 1000 });
          const item = items.find((i) => i.file_path === d.path);
          if (item) newMap[item.id] = d.signedUrl;
        }
      });
      setPreviewUrls(newMap);
    };
    if (items.length > 0) loadUrls();
  }, [items]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }
    if (file.size > 52428800) {
      toast({ title: "File too large", description: "Maximum size is 50MB.", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const fileType = detectType(file.type);

      const { error: upErr } = await supabase.storage
        .from("admin-media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const { error: dbErr } = await supabase.from("admin_media").insert({
        title: title.trim(),
        description: description.trim() || null,
        file_path: path,
        file_name: file.name,
        file_type: fileType,
        mime_type: file.type,
        file_size: file.size,
        tags,
      });
      if (dbErr) throw dbErr;

      toast({ title: "Media uploaded" });
      setOpen(false);
      setTitle("");
      setDescription("");
      setTagsInput("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchItems();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (item: MediaItem) => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    const { error: storageErr } = await supabase.storage
      .from("admin-media")
      .remove([item.file_path]);
    const { error: dbErr } = await supabase.from("admin_media").delete().eq("id", item.id);
    if (storageErr || dbErr) {
      toast({
        title: "Delete failed",
        description: (storageErr || dbErr)?.message,
        variant: "destructive",
      });
      return;
    }
    urlCache.delete(item.file_path);
    toast({ title: "Media deleted" });
    setSelected(null);
    fetchItems();
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "URL copied", description: "Signed URL valid for ~1 hour." });
  };

  const filtered = items.filter((i) => {
    const matchSearch =
      !search ||
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.file_name.toLowerCase().includes(search.toLowerCase()) ||
      i.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchType = filterType === "all" || i.file_type === filterType;
    return matchSearch && matchType;
  });

  const renderThumb = (item: MediaItem) => {
    const url = previewUrls[item.id];
    if (item.file_type === "image" && url) {
      return <img src={url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />;
    }
    if (item.file_type === "video" && url) {
      return (
        <div className="w-full h-full bg-black/5 flex items-center justify-center relative">
          <video src={url} className="w-full h-full object-cover" muted preload="metadata" />
          <Film className="absolute h-8 w-8 text-white drop-shadow-lg" />
        </div>
      );
    }
    return (
      <div className="w-full h-full bg-black/5 flex items-center justify-center">
        <FileGeneric className="h-10 w-10 text-black/30" />
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display tracking-wider">Media Gallery</h1>
          <p className="text-sm text-black/60 mt-1">
            Private image, video, & asset library.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="h-4 w-4" /> Upload
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Media</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="m-title">Title</Label>
                <Input
                  id="m-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-desc">Description (optional)</Label>
                <Textarea
                  id="m-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-tags">Tags (comma-separated)</Label>
                <Input
                  id="m-tags"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. logo, branding, hero"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-file">File (max 50MB)</Label>
                <Input id="m-file" type="file" ref={fileInputRef} required />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? "Uploading…" : "Upload"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40" />
          <Input
            placeholder="Search by title, file, or tag…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-black/10">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ImageIcon className="h-12 w-12 text-black/30 mb-3" />
            <p className="text-black/60">
              {items.length === 0 ? "No media yet. Upload your first asset." : "Nothing matches your filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className="border-black/10 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => setSelected(item)}
            >
              <div className="aspect-square overflow-hidden bg-black/5">
                {renderThumb(item)}
              </div>
              <CardContent className="p-2">
                <div className="text-sm font-medium truncate" title={item.title}>{item.title}</div>
                <div className="text-[10px] text-black/50 uppercase">{item.file_type} · {formatBytes(item.file_size)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-black/5 rounded-lg overflow-hidden flex items-center justify-center max-h-[60vh]">
                  {selected.file_type === "image" && previewUrls[selected.id] && (
                    <img
                      src={previewUrls[selected.id]}
                      alt={selected.title}
                      className="max-h-[60vh] w-auto object-contain"
                    />
                  )}
                  {selected.file_type === "video" && previewUrls[selected.id] && (
                    <video src={previewUrls[selected.id]} controls className="max-h-[60vh] w-full" />
                  )}
                  {selected.file_type === "other" && (
                    <div className="py-16 text-center">
                      <FileGeneric className="h-16 w-16 text-black/30 mx-auto mb-2" />
                      <p className="text-sm text-black/60">{selected.file_name}</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-black/50">File</Label>
                    <p className="truncate">{selected.file_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-black/50">Size</Label>
                    <p>{formatBytes(selected.file_size)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-black/50">Uploaded</Label>
                    <p>{format(new Date(selected.created_at), "MMM d, yyyy")}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-black/50">Type</Label>
                    <p>{selected.mime_type || selected.file_type}</p>
                  </div>
                </div>
                {selected.description && (
                  <div>
                    <Label className="text-xs text-black/50">Description</Label>
                    <p className="text-sm">{selected.description}</p>
                  </div>
                )}
                {selected.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selected.tags.map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-black/5">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                {previewUrls[selected.id] && (
                  <>
                    <Button variant="outline" onClick={() => copyUrl(previewUrls[selected.id])} className="gap-2">
                      <Copy className="h-4 w-4" /> Copy URL
                    </Button>
                    <Button variant="outline" asChild className="gap-2">
                      <a href={previewUrls[selected.id]} target="_blank" rel="noreferrer" download={selected.file_name}>
                        <ExternalLink className="h-4 w-4" /> Open
                      </a>
                    </Button>
                  </>
                )}
                <Button variant="destructive" onClick={() => handleDelete(selected)} className="gap-2">
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Media;
