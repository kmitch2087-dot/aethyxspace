import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TrafficSourcePopupProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (details: string) => void;
}

const TrafficSourcePopup = ({ open, onClose, onSubmit }: TrafficSourcePopupProps) => {
  const [details, setDetails] = useState("");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">How did you find us?</DialogTitle>
          <DialogDescription>
            Let us know where you heard about Aethyx — we'd love to know!
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="e.g. Google search, a friend's referral, podcast..."
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={500}
          className="min-h-[100px]"
        />
        <Button
          onClick={() => {
            if (details.trim()) onSubmit(details.trim());
          }}
          disabled={!details.trim()}
          className="w-full"
        >
          Continue to Consultation
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default TrafficSourcePopup;
