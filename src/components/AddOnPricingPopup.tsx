import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface AddOnPricingPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addOnName: string;
  addonPrice: string;
  standalonePrice: string;
  onSelectOption: (type: "addon" | "standalone") => void;
}

const AddOnPricingPopup = ({ 
  open, 
  onOpenChange, 
  addOnName,
  addonPrice,
  standalonePrice,
  onSelectOption 
}: AddOnPricingPopupProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-cream">
        <DialogHeader className="text-center pb-4">
          <DialogTitle className="text-xl md:text-2xl font-display font-semibold text-foreground">
            {addOnName}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground mt-2">
            Choose your pricing option
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground">
              Are you adding this to an existing Vibe Shift Studio package?
            </p>
          </div>

          <Button
            onClick={() => onSelectOption("addon")}
            className="w-full rounded-xl py-6 bg-sage hover:bg-sage/90 text-white flex flex-col items-center gap-1 h-auto"
          >
            <span className="text-xs opacity-80">Yes, add to my package</span>
            <span className="text-xl font-bold">{addonPrice}</span>
            <ArrowRight className="h-4 w-4 mt-1" />
          </Button>

          <Button
            onClick={() => onSelectOption("standalone")}
            variant="outline"
            className="w-full rounded-xl py-6 border-2 border-foreground/20 hover:border-sage hover:bg-sage/5 flex flex-col items-center gap-1 h-auto"
          >
            <span className="text-xs text-muted-foreground">No, standalone purchase</span>
            <span className="text-xl font-bold text-foreground">{standalonePrice}</span>
            <ArrowRight className="h-4 w-4 mt-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddOnPricingPopup;
