import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Globe, ArrowRight } from "lucide-react";

interface AppPricingPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectOption: (type: "addon" | "standalone", appType: "native" | "pwa") => void;
}

const AppPricingPopup = ({ open, onOpenChange, onSelectOption }: AppPricingPopupProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-cream">
        <DialogHeader className="text-center pb-4">
          <DialogTitle className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
            App Development Options
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground mt-2">
            Choose the option that best fits your situation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Question: Add-on or Standalone */}
          <div className="text-center mb-6">
            <p className="text-lg font-semibold text-foreground mb-2">
              Is this an add-on to a Vibe Shift Studio website?
            </p>
            <p className="text-sm text-muted-foreground">
              Clients with existing Vibe Shift websites receive special pricing
            </p>
          </div>

          {/* Native App Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-sage" />
              Native App (Apple & Google Play Store)
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              A fully downloadable app for iOS and Android devices, available in the app stores.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <Button
                onClick={() => onSelectOption("addon", "native")}
                className="w-full rounded-xl py-6 bg-sage hover:bg-sage/90 text-white flex flex-col items-center gap-1 h-auto"
              >
                <span className="text-xs opacity-80">Add-on to my website</span>
                <span className="text-xl font-bold">$1,500</span>
                <ArrowRight className="h-4 w-4 mt-1" />
              </Button>
              <Button
                onClick={() => onSelectOption("standalone", "native")}
                variant="outline"
                className="w-full rounded-xl py-6 border-2 border-foreground/20 hover:border-sage hover:bg-sage/5 flex flex-col items-center gap-1 h-auto"
              >
                <span className="text-xs text-muted-foreground">Standalone service</span>
                <span className="text-xl font-bold text-foreground">$4,500</span>
                <ArrowRight className="h-4 w-4 mt-1" />
              </Button>
            </div>
          </div>

          {/* PWA Options */}
          <div className="space-y-4 pt-4 border-t border-border/30">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Globe className="h-5 w-5 text-ocean" />
              Progressive Web App (Save to Home Screen)
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              An "app-like" experience that clients can save directly to their phone's home screen — no app store required.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <Button
                onClick={() => onSelectOption("addon", "pwa")}
                className="w-full rounded-xl py-6 bg-ocean hover:bg-ocean/90 text-white flex flex-col items-center gap-1 h-auto"
              >
                <span className="text-xs opacity-80">Add-on to my website</span>
                <span className="text-xl font-bold">$300</span>
                <ArrowRight className="h-4 w-4 mt-1" />
              </Button>
              <Button
                onClick={() => onSelectOption("standalone", "pwa")}
                variant="outline"
                className="w-full rounded-xl py-6 border-2 border-foreground/20 hover:border-ocean hover:bg-ocean/5 flex flex-col items-center gap-1 h-auto"
              >
                <span className="text-xs text-muted-foreground">Standalone service</span>
                <span className="text-xl font-bold text-foreground">$900</span>
                <ArrowRight className="h-4 w-4 mt-1" />
              </Button>
            </div>
          </div>

          <div className="bg-sage-light/50 rounded-xl p-4 mt-6">
            <p className="text-sm text-foreground text-center">
              <strong>Not sure which to choose?</strong> Native apps are best for complex functionality and app store presence. PWAs are perfect for simple, fast access without the app store overhead.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppPricingPopup;
