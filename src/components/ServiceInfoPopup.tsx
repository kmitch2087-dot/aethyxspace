import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Check } from "lucide-react";

interface ServiceInfoPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: 1 | 2 | 3;
}

const tierDetails = {
  1: {
    title: "Online Presence Starter",
    subtitle: "Tier 1",
    intro: "Perfect for small businesses who need a clean, professional website without overcomplicating things. This is your foundation for getting online with intention.",
    inheritNote: null,
    features: [
      {
        name: "One-page scrolling website",
        description: "A beautifully designed single-page site that tells your story from top to bottom. Includes hero section, about, services overview, and contact information."
      },
      {
        name: "Mobile optimization",
        description: "Your site will look and function flawlessly on phones and tablets—where most of your visitors will be."
      },
      {
        name: "Clear call-to-action",
        description: "Strategic placement of buttons and prompts that guide visitors toward contacting you or taking the next step."
      },
      {
        name: "Domain connection",
        description: "I'll connect your custom domain (like yourbusiness.com) so you have a professional web address."
      },
      {
        name: "Light SEO setup",
        description: "Basic search engine optimization including meta titles, descriptions, and proper page structure to help you get found online."
      },
      {
        name: "One revision included",
        description: "After the initial build is complete and you're happy with the foundation, you get one revision session to refine the details."
      }
    ],
    revisionNote: null
  },
  2: {
    title: "Professional Brand Website",
    subtitle: "Tier 2",
    intro: "For businesses ready to level up their online presence with clearer messaging and more structure. This builds on everything in Tier 1 with expanded capabilities.",
    inheritNote: "Everything included in Tier 1, plus:",
    features: [
      {
        name: "Multi-section or multi-page website",
        description: "Expand beyond a single page with dedicated sections or separate pages for services, about, contact, testimonials, and more."
      },
      {
        name: "Done-for-you copywriting",
        description: "No more staring at a blank page. I'll craft compelling copy that speaks to your ideal clients and reflects your brand voice."
      },
      {
        name: "Contact forms",
        description: "Professional, working contact forms that deliver inquiries directly to your inbox with spam protection."
      },
      {
        name: "SEO foundations",
        description: "Comprehensive SEO setup including keyword optimization, image alt texts, structured data, and sitemap submission."
      },
      {
        name: "Launch-ready build",
        description: "Your site is delivered polished, tested, and ready to go live—not a rough draft you have to finish yourself."
      },
      {
        name: "Two revisions included",
        description: "After the site is polished and you resonate with it, you get two revision sessions to make changes."
      }
    ],
    revisionNote: "Revision sessions begin once the site is polished and you feel aligned with it. Take a week or two to sit with it, keep notes on any changes you'd like, and we'll refine together. Functionality bugs and fixes are treated with priority and do not count toward your revision credits."
  },
  3: {
    title: "Signature Brand Presence",
    subtitle: "Tier 3",
    intro: "For brands that want a cohesive, aligned presence across their website and messaging. This is the complete package for businesses serious about their brand.",
    inheritNote: "Everything included in Tier 1 & 2, plus:",
    features: [
      {
        name: "Full website build",
        description: "A comprehensive, custom-designed website with all the pages and functionality your business needs to thrive online."
      },
      {
        name: "Brand kit (colors, fonts, direction)",
        description: "A complete visual identity guide including your color palette, typography choices, and design direction you can use across all platforms."
      },
      {
        name: "Refined messaging",
        description: "Deep-dive messaging work to clarify your brand voice, value proposition, and how you communicate with your audience."
      },
      {
        name: "Social bio copy",
        description: "Polished, on-brand bios for your social media profiles that maintain consistency with your website presence."
      },
      {
        name: "Post-launch support",
        description: "I don't disappear after launch. You get dedicated support to ensure everything runs smoothly as you start using your new site."
      },
      {
        name: "Three revisions included",
        description: "After the site is polished and you resonate with it, you get three revision sessions to perfect every detail."
      }
    ],
    revisionNote: "Revision sessions begin once the site is polished and you feel aligned with it. Take a week or two to sit with it, keep notes on any changes you'd like, and we'll refine together. Functionality bugs and fixes are treated with priority and do not count toward your revision credits."
  }
};

const ServiceInfoPopup = ({ open, onOpenChange, tier }: ServiceInfoPopupProps) => {
  const details = tierDetails[tier];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-cream">
        <DialogHeader>
          <p className="text-sm font-semibold text-sage uppercase tracking-wide mb-1">
            {details.subtitle}
          </p>
          <DialogTitle className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
            {details.title}
          </DialogTitle>
          <DialogDescription className="text-base text-foreground font-medium leading-relaxed pt-2">
            {details.intro}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {details.inheritNote && (
            <p className="text-lg font-semibold text-ocean">
              {details.inheritNote}
            </p>
          )}

          <div className="space-y-4">
            {details.features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-sage-light">
                  <Check className="h-4 w-4 text-sage" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{feature.name}</h4>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed mt-1">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {details.revisionNote && (
            <div className="bg-sage-light/50 rounded-2xl p-5 mt-6">
              <h4 className="font-semibold text-foreground mb-2">About Revisions</h4>
              <p className="text-sm text-foreground font-medium leading-relaxed">
                {details.revisionNote}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceInfoPopup;
