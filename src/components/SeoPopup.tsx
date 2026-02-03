import { Search, TrendingUp, Users, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface SeoPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SeoPopup = ({ open, onOpenChange }: SeoPopupProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl border-0 shadow-warm-lg">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-ocean-light flex items-center justify-center">
              <Search className="h-6 w-6 text-ocean" />
            </div>
            <DialogTitle className="text-2xl md:text-3xl text-foreground font-semibold">
              What is SEO & Why Does It Matter?
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          <p className="text-lg text-foreground leading-relaxed font-medium">
            SEO stands for <span className="text-sage font-semibold">Search Engine Optimization</span> — it's how your website gets found when people search online. Think of it as the difference between having a beautiful storefront on a busy street versus a hidden alley.
          </p>

          <div className="grid gap-4">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-sage-light/30">
              <div className="w-10 h-10 rounded-full bg-sage-light flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-sage" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Organic Visibility</h3>
                <p className="text-foreground font-medium leading-relaxed">
                  Good SEO means your ideal customers can find you naturally through Google, without paying for ads.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-ocean-light/30">
              <div className="w-10 h-10 rounded-full bg-ocean-light flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-ocean" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Trust & Credibility</h3>
                <p className="text-foreground font-medium leading-relaxed">
                  Websites that appear in search results are often perceived as more trustworthy and established.
                </p>
              </div>
            </div>
          </div>

          <p className="text-foreground leading-relaxed font-medium pt-4 border-t border-border/30">
            For small businesses, SEO is one of the most cost-effective ways to attract new customers. Every Vibe Shift Studio package includes foundational SEO setup to help you get started on the right foot.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button 
              asChild
              className="flex-1 rounded-full py-6 bg-sage hover:bg-sage/90 text-white shadow-warm"
            >
              <Link to="/seo">Learn More About SEO</Link>
            </Button>
            <Button 
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-full py-6 border-sage text-sage hover:bg-sage-light/30"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SeoPopup;
