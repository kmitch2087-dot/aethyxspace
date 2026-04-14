import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Upload, Loader2 } from "lucide-react";

interface ClientProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  business_name: string | null;
  billing_city: string | null;
  billing_state: string | null;
  created_at: string;
}

const Clients = () => {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchClients = async () => {
    const { data } = await supabase
      .from("client_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setClients((data as ClientProfile[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleUpload = async () => {
    if (!selectedClient || !docFile || !docTitle.trim()) return;
    setUploading(true);

    const filePath = `${selectedClient.user_id}/${Date.now()}_${docFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from("client-documents")
      .upload(filePath, docFile);

    if (uploadError) {
      setUploading(false);
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      return;
    }

    const { data: urlData } = supabase.storage
      .from("client-documents")
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase.from("client_documents").insert({
      user_id: selectedClient.user_id,
      title: docTitle.trim(),
      file_url: urlData.publicUrl,
      uploaded_by: "admin",
    });

    setUploading(false);
    if (insertError) {
      toast({ title: "Failed to save document record", description: insertError.message, variant: "destructive" });
    } else {
      toast({ title: "Document uploaded!" });
      setUploadOpen(false);
      setDocTitle("");
      setDocFile(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-display tracking-wider mb-6 flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" />
        Clients
      </h1>

      {clients.length === 0 ? (
        <p className="text-muted-foreground">No client accounts yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{client.full_name}</CardTitle>
              </CardHeader>
              <CardContent>
                {client.business_name && (
                  <p className="text-sm text-muted-foreground">{client.business_name}</p>
                )}
                {client.billing_city && client.billing_state && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {client.billing_city}, {client.billing_state}
                  </p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => {
                    setSelectedClient(client);
                    setUploadOpen(true);
                  }}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Upload Document
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={(v) => !v && setUploadOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document for {selectedClient?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Document Title</Label>
              <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="e.g. Brand Guidelines v2" />
            </div>
            <div>
              <Label>File</Label>
              <Input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
            </div>
            <Button onClick={handleUpload} disabled={uploading || !docTitle.trim() || !docFile} className="w-full">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;
