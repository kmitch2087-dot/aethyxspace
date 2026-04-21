import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, EyeOff, Upload } from "lucide-react";
import { format } from "date-fns";
import RichTextEditor from "@/components/blog/RichTextEditor";
import DOMPurify from "dompurify";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
}

const BlogManager = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    cover_image_url: "",
    published: false,
  });

  const fetchPosts = async () => {
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Starter template prefilled into new posts. Any H2/H3 in the FAQ section
  // ending in "?" with answer text below auto-generates FAQPage JSON-LD on the
  // public post page — no extra schema code needed.
  const STARTER_TEMPLATE = `<p>[Opening hook — one or two sentences that frame the problem this post solves.]</p>
<p>[Set up the value of the post. Why should the reader keep reading?]</p>
<h2>[First Main Section Heading]</h2>
<p>[Body paragraph. Cover the first key idea here.]</p>
<ul><li>[supporting point]</li><li>[supporting point]</li><li>[supporting point]</li></ul>
<h2>[Second Main Section Heading]</h2>
<p>[Body paragraph for the second idea. Link naturally to other pages where it makes sense, e.g. <a href="/services">website design services</a> or <a href="/contact">contact Aethyx.space</a>.]</p>
<h2>[Third Main Section Heading]</h2>
<p>[Body paragraph for the third idea.]</p>
<h2>[Closing Section / Call to Action]</h2>
<p>[Wrap up the post and tell the reader what to do next. Link to <a href="/contact">contact</a> or another relevant page.]</p>
<h2>Frequently Asked Questions</h2>
<h3>[Question 1 ending with a question mark?]</h3>
<p>[Clear, direct answer in 1-3 sentences. Google reads this as the answer for FAQ rich results.]</p>
<h3>[Question 2 ending with a question mark?]</h3>
<p>[Answer.]</p>
<h3>[Question 3 ending with a question mark?]</h3>
<p>[Answer.]</p>
<h3>[Question 4 ending with a question mark?]</h3>
<p>[Answer.]</p>`;

  const openNew = () => {
    setEditingPost(null);
    setForm({ title: "", slug: "", content: STARTER_TEMPLATE, excerpt: "", cover_image_url: "", published: false });
    setPreviewMode(false);
    setFormErrors({});
    setEditorOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditingPost(post);
    setForm({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt || "",
      cover_image_url: post.cover_image_url || "",
      published: post.published,
    });
    setPreviewMode(false);
    setFormErrors({});
    setEditorOpen(true);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("blog-covers").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data } = supabase.storage.from("blog-covers").getPublicUrl(path);
      setForm((f) => ({ ...f, cover_image_url: data.publicUrl }));
      toast({ title: "Cover image uploaded!" });
    }
    setUploading(false);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = "Title is required";
    if (!form.slug.trim()) errors.slug = "Slug is required";
    if (!form.content.trim()) errors.content = "Content is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (saving) return;

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim().replace(/^\/+/, ""),
      content: form.content,
      excerpt: form.excerpt.trim() || null,
      cover_image_url: form.cover_image_url.trim() || null,
      published: form.published,
      published_at: form.published ? new Date().toISOString() : null,
      author_id: user?.id,
    };

    try {
      if (editingPost) {
        const { error } = await supabase
          .from("blog_posts")
          .update(payload)
          .eq("id", editingPost.id);
        if (error) {
          toast({ title: "Update failed", description: error.message, variant: "destructive" });
          return;
        }
        toast({ title: "Post updated!" });
      } else {
        const { error } = await supabase.from("blog_posts").insert(payload);
        if (error) {
          toast({ title: "Create failed", description: error.message, variant: "destructive" });
          return;
        }
        toast({ title: "Post created!" });
      }

      setEditorOpen(false);
      fetchPosts();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Post deleted" });
      fetchPosts();
    }
  };

  const togglePublish = async (post: BlogPost) => {
    const newPublished = !post.published;
    const { error } = await supabase
      .from("blog_posts")
      .update({
        published: newPublished,
        published_at: newPublished ? new Date().toISOString() : null,
      })
      .eq("id", post.id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    } else {
      toast({ title: newPublished ? "Post published!" : "Post unpublished" });
      fetchPosts();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display tracking-wider">Blog Manager</h1>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-1" /> New Post
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : posts.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">No blog posts yet. Create your first one!</p>
      ) : (
        <div className="rounded-lg border border-border/30 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        post.published
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {post.published ? "Published" : "Draft"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {format(new Date(post.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => togglePublish(post)} title={post.published ? "Unpublish" : "Publish"}>
                        {post.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(post)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wider">
              {editingPost ? "Edit Post" : "New Post"}
            </DialogTitle>
            <DialogDescription>
              {editingPost ? "Update your blog post details below." : "Fill in the details to create a new blog post."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title <span className="text-destructive">*</span></Label>
                <Input
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((f) => ({
                      ...f,
                      title,
                      slug: editingPost ? f.slug : generateSlug(title),
                    }));
                    if (title.trim()) setFormErrors((e) => ({ ...e, title: "" }));
                  }}
                  placeholder="Post title"
                  className={formErrors.title ? "border-destructive" : ""}
                />
                {formErrors.title && <p className="text-xs text-destructive">{formErrors.title}</p>}
              </div>
              <div className="space-y-2">
                <Label>Slug <span className="text-destructive">*</span></Label>
                <Input
                  value={form.slug}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, slug: e.target.value }));
                    if (e.target.value.trim()) setFormErrors((err) => ({ ...err, slug: "" }));
                  }}
                  placeholder="post-url-slug"
                  className={formErrors.slug ? "border-destructive" : ""}
                />
                {formErrors.slug && <p className="text-xs text-destructive">{formErrors.slug}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Excerpt</Label>
              <Input
                value={form.excerpt}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                placeholder="Brief description for listing cards"
              />
            </div>

            <div className="space-y-2">
              <Label>Cover Image</Label>
              <div className="flex items-center gap-3">
                <Input
                  value={form.cover_image_url}
                  onChange={(e) => setForm((f) => ({ ...f, cover_image_url: e.target.value }))}
                  placeholder="Image URL or upload below"
                  className="flex-1"
                />
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span>
                      <Upload className="h-4 w-4 mr-1" />
                      {uploading ? "Uploading..." : "Upload"}
                    </span>
                  </Button>
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                </label>
              </div>
              {form.cover_image_url && (
                <img src={form.cover_image_url} alt="Cover preview" className="mt-2 rounded-lg max-h-40 object-cover" />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Content <span className="text-destructive">*</span></Label>
                <Button variant="ghost" size="sm" onClick={() => setPreviewMode(!previewMode)}>
                  {previewMode ? "Edit" : "Preview"}
                </Button>
              </div>
              {previewMode ? (
                <div
                  className="blog-content min-h-[300px] p-4 rounded-lg border border-border/30 bg-background"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(form.content) }}
                />
              ) : (
                <RichTextEditor
                  value={form.content}
                  onChange={(html) => {
                    setForm((f) => ({ ...f, content: html }));
                    if (html.replace(/<[^>]+>/g, "").trim()) setFormErrors((err) => ({ ...err, content: "" }));
                  }}
                  placeholder="Write your post — use the toolbar to format..."
                />
              )}
              {formErrors.content && <p className="text-xs text-destructive">{formErrors.content}</p>}
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.published}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, published: checked }))}
              />
              <Label>Publish immediately</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editingPost ? "Update Post" : "Create Post"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlogManager;
