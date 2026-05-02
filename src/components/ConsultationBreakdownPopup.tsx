import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileSearch, MessageSquare, ClipboardList, CreditCard, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onNavigate?: () => void;
}

const steps = [
  {
    icon: FileSearch,
    title: "Surface-level research report",
    body: "Before we even speak, I dig into your company, your industry, and your competitors so I show up to the call already understanding your landscape.",
  },
  {
    icon: MessageSquare,
    title: "The consultation call",
    body: "We sit down (virtually) and walk through your goals, pain points, and what your site actually needs to do for the business — informed by the research, not guesswork.",
  },
  {
    icon: ClipboardList,
    title: "Project estimate & proposal",
    body: "After the call, you receive a tailored estimate, scope, timeline, and proposal built specifically around what you told me.",
  },
  {
    icon: CreditCard,
    title: "Payment plan — $50 credited back",
    body: "If you move forward, the $50 is deducted from your first invoice. The consultation pays for itself.",
  },
];

const ConsultationBreakdownPopup = ({ open, onOpenChange, onNavigate }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#0a0a14] border-primary/30 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-wider text-foreground">
            What do I get for my $50?
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            The consultation isn't just a call — it's a deliverable.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-4 mt-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={i} className="flex gap-3">
                <div className="shrink-0 h-9 w-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {i + 1}. {s.title}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{s.body}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex gap-2 items-start">
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/90 leading-relaxed">
            You walk away with clarity on what your project actually needs, what it'll cost, and a plan — even if you decide not to move forward.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <Button asChild className="flex-1" onClick={() => onNavigate?.()}>
            <Link to="/contact">Book my $50 consultation</Link>
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Keep browsing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConsultationBreakdownPopup;
