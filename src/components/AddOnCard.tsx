import { Button } from "@/components/ui/button";
import { ArrowRight, Plus, Check } from "lucide-react";
import { ReactNode } from "react";

interface AddOnCardProps {
  name: string;
  addonPrice: string;
  standalonePrice: string;
  description: string;
  icon: ReactNode;
  onSelect: () => void;
  includedInTier3?: boolean;
}

const AddOnCard = ({ name, addonPrice, standalonePrice, description, icon, onSelect, includedInTier3 }: AddOnCardProps) => {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-warm flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-warm-lg ${includedInTier3 ? 'ring-2 ring-sage/30' : ''}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-sage-light flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-base font-display font-semibold text-foreground">
          {name}
        </h3>
      </div>
      
      {includedInTier3 ? (
        <div className="flex items-baseline gap-2 mb-3 flex-wrap">
          <span className="text-xl font-bold text-sage">{addonPrice}</span>
          <span className="text-xs text-muted-foreground">with package</span>
          <span className="text-muted-foreground mx-1">|</span>
          <span className="text-sm font-semibold text-ocean">Included in Tier 3</span>
        </div>
      ) : (
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-xl font-bold text-sage">{addonPrice}</span>
          <span className="text-xs text-muted-foreground">with package</span>
          <span className="text-muted-foreground mx-1">|</span>
          <span className="text-sm font-semibold text-foreground/70">{standalonePrice}</span>
          <span className="text-xs text-muted-foreground">standalone</span>
        </div>
      )}
      
      <p className="text-sm text-foreground font-medium leading-relaxed flex-grow mb-4">
        {description}
      </p>
      
      {includedInTier3 ? (
        <div className="flex items-center justify-center gap-2 py-4 text-sage font-semibold">
          <Check className="h-5 w-5" />
          Included in Tier 3 Package
        </div>
      ) : (
        <Button 
          onClick={onSelect}
          className="w-full rounded-full py-4 bg-sage hover:bg-sage/90 text-white shadow-warm transition-all duration-300 hover:-translate-y-0.5"
          size="sm"
        >
          <Plus className="mr-1 h-4 w-4" />
          Add This
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default AddOnCard;
