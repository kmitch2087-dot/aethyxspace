import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, FileText, ExternalLink } from "lucide-react";

interface AgreementPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgreementComplete: () => void;
  serviceName: string;
  isLoading?: boolean;
}

const AGREEMENT_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdzgzzW5h8stHAOJQgC2eDfEI4wv4tonpLgt_Ps2oqMQDdIPQ/viewform?usp=publish-editor";

const AgreementPopup = ({ 
  open, 
  onOpenChange, 
  onAgreementComplete,
  serviceName,
  isLoading = false,
}: AgreementPopupProps) => {
  const [hasAgreed, setHasAgreed] = useState(false);
  const [formOpened, setFormOpened] = useState(false);

  const handleOpenForm = () => {
    window.open(AGREEMENT_FORM_URL, "_blank");
    setFormOpened(true);
  };

  const handleProceedToPayment = () => {
    if (hasAgreed && formOpened) {
      onAgreementComplete();
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setHasAgreed(false);
      setFormOpened(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg bg-cream">
        <DialogHeader className="text-center pb-4">
          <DialogTitle className="text-xl md:text-2xl font-display font-semibold text-foreground">
            Service Agreement Required
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground mt-2">
            Before proceeding to payment for <span className="font-semibold text-foreground">{serviceName}</span>, please review and sign the service agreement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Open and Complete Form */}
          <div className="bg-sage-light/30 rounded-xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-6 h-6 rounded-full bg-sage text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Review & Sign Agreement</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Click the button below to open the service agreement form in a new tab. Please complete and submit the form.
                </p>
              </div>
            </div>
            <Button
              onClick={handleOpenForm}
              variant="outline"
              className={`w-full rounded-xl py-5 border-2 transition-all duration-300 ${
                formOpened 
                  ? "border-sage bg-sage/10 text-sage" 
                  : "border-foreground/20 hover:border-sage hover:bg-sage/5"
              }`}
            >
              <FileText className="h-4 w-4 mr-2" />
              {formOpened ? "Agreement Form Opened" : "Open Agreement Form"}
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
            {formOpened && (
              <p className="text-xs text-sage text-center mt-2 font-medium">
                ✓ Form opened in new tab
              </p>
            )}
          </div>

          {/* Step 2: Confirm Agreement */}
          <div className="bg-sage-light/30 rounded-xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-6 h-6 rounded-full bg-sage text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Confirm Completion</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Once you've submitted the agreement form, check the box below to confirm.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-border/30">
              <Checkbox
                id="agreement"
                checked={hasAgreed}
                onCheckedChange={(checked) => setHasAgreed(checked as boolean)}
                disabled={!formOpened}
              />
              <label
                htmlFor="agreement"
                className={`text-sm font-medium leading-relaxed cursor-pointer ${
                  !formOpened ? "text-muted-foreground/50" : "text-foreground"
                }`}
              >
                I have read, understood, and submitted the service agreement form
              </label>
            </div>
          </div>

          {/* Proceed Button */}
          <Button
            onClick={handleProceedToPayment}
            disabled={!hasAgreed || !formOpened || isLoading}
            className="w-full rounded-xl py-6 bg-sage hover:bg-sage/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              "Redirecting to Payment..."
            ) : (
              <>
                Proceed to Payment
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By proceeding, you agree to the terms outlined in the service agreement.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AgreementPopup;
