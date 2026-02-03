import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCircle, Info, Star, MessageSquarePlus } from "lucide-react";

import testimonial1 from "@/assets/testimonial-1.jpg";
import testimonial2 from "@/assets/testimonial-2.jpg";
import testimonial3 from "@/assets/testimonial-3.jpg";
import testimonial4 from "@/assets/testimonial-4.jpg";
import testimonial5 from "@/assets/testimonial-5.jpg";

const testimonials = [
  {
    id: 1,
    name: "Sarah",
    location: "Austin, TX",
    date: "October 2025",
    image: testimonial1,
    review:
      "Kristin made the entire process so easy! As a small business owner, I barely have time to breathe, let alone figure out website stuff. She took everything off my plate and delivered something beautiful. The SEO alone has already brought in more traffic than I ever expected. Worth every penny!",
  },
  {
    id: 2,
    name: "Marcus",
    location: "Denver, CO",
    date: "November 2025",
    image: testimonial2,
    review:
      "I was skeptical at first, but Kristin really listened to understand my vision and what my business actually needed. She didn't try to upsell me on things I didn't need. The website pays for itself with the new clients I'm getting. So grateful to have this off my plate!",
  },
  {
    id: 3,
    name: "Emily",
    location: "Nashville, TN",
    date: "December 2025",
    image: testimonial3,
    review:
      "Hands down the best investment I've made for my business this year. Kristin was amazing to work with—patient, creative, and really got what I was going for. My web traffic has tripled since launch, and that's just from the SEO optimization. Can't recommend her enough!",
  },
  {
    id: 4,
    name: "James",
    location: "Portland, OR",
    date: "January 2026",
    image: testimonial4,
    review:
      "Finally, someone who speaks my language! Kristin took the time to learn exactly what my business does and who my customers are. The whole process was seamless, and now I have a website that actually works for me. The uptick in organic traffic has been incredible.",
  },
  {
    id: 5,
    name: "Maria",
    location: "Phoenix, AZ",
    date: "February 2026",
    image: testimonial5,
    review:
      "I put off getting a real website for years because it felt so overwhelming. Kristin made it painless. She handled everything and kept me in the loop without overwhelming me with decisions. The SEO results speak for themselves—new customers are finding me every week!",
  },
];

const Testimonials = () => {
  const handleLeaveReview = () => {
    window.open("https://g.page/r/your-google-review-link", "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-[var(--fixed-banner-height,220px)]">
        <div className="container mx-auto px-4 py-12 md:py-16">
          {/* Page Title */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Client Testimonials
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Real stories from small business owners who trusted Vibe Shift
              Studio to bring their vision to life.
            </p>
          </div>

          {/* Carousel */}
          <div className="max-w-4xl mx-auto px-12">
            <Carousel
              opts={{
                align: "center",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent>
                {testimonials.map((testimonial) => (
                  <CarouselItem key={testimonial.id}>
                    <Card className="bg-white/80 backdrop-blur-sm border-sage/20 shadow-lg">
                      <CardContent className="p-6 md:p-8">
                        {/* Stars */}
                        <div className="flex justify-center gap-1 mb-6">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className="w-5 h-5 fill-yellow-400 text-yellow-400"
                            />
                          ))}
                        </div>

                        {/* Review Text */}
                        <blockquote className="text-center text-foreground text-base md:text-lg leading-relaxed mb-6 italic">
                          "{testimonial.review}"
                        </blockquote>

                        {/* Profile */}
                        <div className="flex flex-col items-center gap-4">
                          <img
                            src={testimonial.image}
                            alt={testimonial.name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-sage/30"
                          />
                          <div className="text-center">
                            <p className="font-semibold text-foreground">
                              {testimonial.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Small Business Owner in {testimonial.location}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {testimonial.date}
                            </p>
                          </div>

                          {/* Verified Badge */}
                          <div className="flex items-center gap-2 mt-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-700 font-medium">
                              Verified Customer
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="focus:outline-none">
                                  <Info className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-center">
                                <p>
                                  Customers are validated through third-party
                                  systems to maintain transparency and privacy.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="border-sage text-sage hover:bg-sage hover:text-white" />
              <CarouselNext className="border-sage text-sage hover:bg-sage hover:text-white" />
            </Carousel>
          </div>

          {/* Leave a Review Button */}
          <div className="text-center mt-12">
            <Button
              onClick={handleLeaveReview}
              size="lg"
              className="bg-sage hover:bg-sage/90 text-white font-semibold px-8 py-6 text-lg rounded-full shadow-warm hover:shadow-[0_0_20px_rgba(91,122,95,0.5)] transition-all duration-300"
            >
              <MessageSquarePlus className="w-5 h-5 mr-2" />
              Leave Us a Review & Help My Small Business
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Testimonials;
