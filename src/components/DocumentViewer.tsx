import { Loader2 } from "lucide-react";
import { isImageFile } from "@/lib/isImageFile";

interface DocumentViewerProps {
  url: string | null;
  fileName: string;
  loading?: boolean;
  downloadUrl?: string;
}

const DocumentViewer = ({ url, fileName, loading, downloadUrl }: DocumentViewerProps) => {
  if (loading || !url) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      {isImageFile(fileName) ? (
        <img src={url} alt={fileName} className="w-full max-h-[600px] object-contain rounded" />
      ) : (
        <iframe src={url} title={fileName} className="w-full h-[70vh] border-0 rounded" />
      )}
      <div className="pt-3">
        <a
          href={downloadUrl || url}
          download={fileName}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary underline"
        >
          Download
        </a>
      </div>
    </div>
  );
};

export default DocumentViewer;
