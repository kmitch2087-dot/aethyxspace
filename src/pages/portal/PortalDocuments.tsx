import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const PortalDocuments = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: profile } = await supabase
        .from("client_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      const filter = profile?.id
        ? `client_profile_id.eq.${profile.id},user_id.eq.${user.id}`
        : `user_id.eq.${user.id}`;
      const { data } = await supabase
        .from("client_documents")
        .select("*")
        .or(filter)
        .order("created_at", { ascending: false });
      setDocuments(data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleDownload = async (doc: any) => {
    setDownloadingId(doc.id);
    try {
      // Backwards compatibility: legacy rows stored a full public URL.
      // New rows store the storage path. Extract the path either way.
      let path: string = doc.file_url;
      const marker = "/client-documents/";
      const idx = path.indexOf(marker);
      if (idx !== -1) {
        path = path.substring(idx + marker.length);
      }

      const { data, error } = await supabase.storage
        .from("client-documents")
        .createSignedUrl(path, 3600);

      if (error || !data?.signedUrl) {
        toast({
          title: "Unable to open document",
          description: "Please try again or contact support.",
          variant: "destructive",
        });
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-display tracking-wider mb-6">Documents</h1>

      {documents.length === 0 ? (
        <p className="text-muted-foreground text-sm">No documents have been shared with you yet.</p>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => handleDownload(doc)}
              disabled={downloadingId === doc.id}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-border/30 bg-card hover:border-primary/30 transition-colors text-left disabled:opacity-60"
            >
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(doc.created_at), "MMM d, yyyy")} • Uploaded by {doc.uploaded_by}
                </p>
              </div>
              {downloadingId === doc.id ? (
                <Loader2 className="h-4 w-4 text-muted-foreground shrink-0 animate-spin" />
              ) : (
                <Download className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortalDocuments;
