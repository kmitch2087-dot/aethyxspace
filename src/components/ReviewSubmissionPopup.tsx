import { useState, useRef } from "react";
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
import { Camera, Upload, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReviewSubmissionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const ReviewSubmissionPopup = ({ open, onOpenChange }: ReviewSubmissionPopupProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    state: "",
    reviewText: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (JPG, PNG, etc.)",
          variant: "destructive",
        });
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image under 5MB",
          variant: "destructive",
        });
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim() || !formData.city.trim() || !formData.state || !formData.reviewText.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let photoUrl: string | null = null;

      // Upload photo if provided
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("review-photos")
          .upload(fileName, photoFile);

        if (uploadError) {
          console.error("Photo upload error:", uploadError);
          throw new Error("Failed to upload photo");
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("review-photos")
          .getPublicUrl(fileName);
        
        photoUrl = urlData.publicUrl;
      }

      // Insert review submission
      const { error: insertError } = await supabase
        .from("review_submissions")
        .insert({
          name: formData.name.trim().slice(0, 100),
          city: formData.city.trim().slice(0, 100),
          state: formData.state,
          review_text: formData.reviewText.trim().slice(0, 2000),
          photo_url: photoUrl,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error("Failed to submit review");
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Submission failed",
        description: "There was an error submitting your review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      // Reset form when closing
      setFormData({ name: "", city: "", state: "", reviewText: "" });
      setPhotoFile(null);
      setPhotoPreview(null);
      setIsSubmitted(false);
    }
    onOpenChange(open);
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (isSubmitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md bg-cream">
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-sage/20 flex items-center justify-center mx-auto mb-6">
              <Check className="h-8 w-8 text-sage" />
            </div>
            <DialogTitle className="text-2xl font-serif font-semibold text-foreground mb-4">
              Thank You!
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground mb-6">
              Your review has been submitted and is pending approval. We appreciate you taking the time to share your experience!
            </DialogDescription>
            <Button
              onClick={() => handleClose(false)}
              className="rounded-full px-8 py-5 bg-sage hover:bg-sage/90 text-white"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-cream">
        <DialogHeader className="text-center pb-2">
          <DialogTitle className="text-xl md:text-2xl font-serif font-semibold text-foreground">
            Share Your Experience
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground mt-2">
            Your feedback helps other small business owners make informed decisions
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Photo Upload */}
          <div className="flex flex-col items-center gap-3">
            <Label className="text-sm font-medium text-foreground">Your Photo (Optional)</Label>
            <div 
              className="relative w-24 h-24 rounded-full bg-sage-light/50 border-2 border-dashed border-sage/30 flex items-center justify-center cursor-pointer hover:border-sage transition-colors overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {photoPreview ? (
                <img 
                  src={photoPreview} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="h-8 w-8 text-sage/50" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-sage hover:text-sage/80 font-medium flex items-center gap-1"
            >
              <Upload className="h-3 w-3" />
              {photoPreview ? "Change Photo" : "Upload Photo"}
            </button>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-foreground">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your first name"
              className="rounded-xl border-border/50 focus:border-sage"
              maxLength={100}
              required
            />
          </div>

          {/* City and State */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm font-medium text-foreground">
                City <span className="text-destructive">*</span>
              </Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Your city"
                className="rounded-xl border-border/50 focus:border-sage"
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state" className="text-sm font-medium text-foreground">
                State <span className="text-destructive">*</span>
              </Label>
              <select
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full h-10 rounded-xl border border-border/50 bg-background px-3 text-sm focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage"
                required
              >
                <option value="">Select</option>
                {US_STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Review Date (read-only) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Review Date</Label>
            <div className="h-10 rounded-xl border border-border/50 bg-muted/30 px-3 flex items-center text-sm text-muted-foreground">
              {currentDate}
            </div>
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <Label htmlFor="reviewText" className="text-sm font-medium text-foreground">
              Your Review <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reviewText"
              value={formData.reviewText}
              onChange={(e) => setFormData({ ...formData, reviewText: e.target.value })}
              placeholder="Share your experience working with Vibe Shift Studio..."
              className="rounded-xl border-border/50 focus:border-sage min-h-[120px] resize-none"
              maxLength={2000}
              required
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.reviewText.length}/2000
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl py-6 bg-sage hover:bg-sage/90 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Review"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By submitting, you agree that your review may be displayed on our website after approval.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewSubmissionPopup;
