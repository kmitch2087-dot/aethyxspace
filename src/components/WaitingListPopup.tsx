import { useState } from "react";
import { X, Clock, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface WaitingListPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WaitingListPopup = ({ open, onOpenChange }: WaitingListPopupProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    updateFrequency: "",
    websiteUrl: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission - in production, this would send to a backend
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({
      title: "You're on the list! 🎉",
      description: "We'll reach out when a spot opens up.",
    });

    setFormData({ name: "", email: "", updateFrequency: "", websiteUrl: "" });
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-3xl border-0 shadow-warm-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-ocean-light flex items-center justify-center">
              <Clock className="h-5 w-5 text-ocean" />
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sage" />
              <span className="text-sm font-medium text-sage">High Demand</span>
            </div>
          </div>
          <DialogTitle className="text-2xl md:text-3xl text-foreground font-semibold">
            Join the Waiting List
          </DialogTitle>
          <DialogDescription className="text-foreground font-medium text-base leading-relaxed">
            Our schedule is currently full, but spots open up on a rolling basis. Get on the list to be notified when we can take on new projects!
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground font-medium">
              Your Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Jane Smith"
              required
              className="rounded-xl py-5 border-border/50 focus:border-sage focus:ring-sage"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground font-medium">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="jane@example.com"
              required
              className="rounded-xl py-5 border-border/50 focus:border-sage focus:ring-sage"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="updateFrequency" className="text-foreground font-medium">
              How often do you anticipate updating your web page?
            </Label>
            <Textarea
              id="updateFrequency"
              value={formData.updateFrequency}
              onChange={(e) => setFormData({ ...formData, updateFrequency: e.target.value })}
              placeholder="e.g., Monthly, quarterly, as needed..."
              required
              className="rounded-xl min-h-[80px] border-border/50 focus:border-sage focus:ring-sage"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="websiteUrl" className="text-foreground font-medium">
              If you do have a website already, please share the link
            </Label>
            <Input
              id="websiteUrl"
              type="url"
              value={formData.websiteUrl}
              onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
              placeholder="https://yourwebsite.com (optional)"
              className="rounded-xl py-5 border-border/50 focus:border-sage focus:ring-sage"
            />
          </div>

          <Button 
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full py-6 bg-sage hover:bg-sage/90 text-white shadow-warm transition-all duration-300"
          >
            {isSubmitting ? "Submitting..." : "Get on the Waiting List"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WaitingListPopup;
