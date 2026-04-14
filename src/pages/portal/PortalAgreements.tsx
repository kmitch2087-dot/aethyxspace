import { FileSignature } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const PortalAgreements = () => {
  return (
    <div>
      <h1 className="text-2xl font-display tracking-wider mb-6">Agreements</h1>

      <Card className="border-border/30">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FileSignature className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="font-display text-lg mb-2">DocuSign Integration Coming Soon</h3>
          <p className="text-muted-foreground text-sm max-w-md">
            You'll be able to view and sign your project agreements directly from this portal. 
            We're working on connecting DocuSign for a seamless experience.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalAgreements;
