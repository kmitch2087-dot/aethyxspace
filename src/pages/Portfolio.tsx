import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LightboxGallery from "@/components/LightboxGallery";

import rr1 from "@/assets/portfolio/re-retreats-1.jpg";
import rr2 from "@/assets/portfolio/re-retreats-2.jpg";
import rr3 from "@/assets/portfolio/re-retreats-3.jpg";
import kk1 from "@/assets/portfolio/kokopelli-1.jpg";
import kk2 from "@/assets/portfolio/kokopelli-2.jpg";
import kk3 from "@/assets/portfolio/kokopelli-3.jpg";
import vs1 from "@/assets/portfolio/vibeshift-1.jpg";
import vs2 from "@/assets/portfolio/vibeshift-2.jpg";
import vs3 from "@/assets/portfolio/vibeshift-3.jpg";

const projects = [
  {
    title: "Rē Retreats",
    tagline: "rēset • rēstore • rēimagine",
    subtitle: "Where Women Come Home to Themselves",
    description: "Women's Wellness Retreats in the Mountains of Southern Vermont. A serene, nature-inspired brand and web presence designed to reflect the transformative retreat experience.",
    url: "https://re-retreats.com",
    images: [
      { src: rr1, alt: "Rē Retreats homepage" },
      { src: rr2, alt: "Rē Retreats retreat details" },
      { src: rr3, alt: "Rē Retreats experience" },
    ],
  },
  {
    title: "Kokopelli Kabin",
    tagline: "Modern Mountain Retreat",
    subtitle: "Luxury Cabin Rental",
    description: "A premium booking-ready website for a luxury cabin rental experience. Clean photography-driven design with seamless reservation integration.",
    url: "https://kokopellikabin.com",
    images: [
      { src: kk1, alt: "Kokopelli Kabin homepage" },
      { src: kk2, alt: "Kokopelli Kabin interiors" },
      { src: kk3, alt: "Kokopelli Kabin booking" },
    ],
  },
  {
    title: "Vibe Shift Studio → Aethyx",
    tagline: "Brand Evolution",
    subtitle: "From Calm to Bold",
    description: "Our own rebrand story. Vibe Shift Studio evolved into Aethyx — a bolder, more unapologetic creative identity. Same vision, sharper execution.",
    url: "https://vibe-shift.com",
    images: [
      { src: vs1, alt: "Vibe Shift Studio original" },
      { src: vs2, alt: "Brand transition" },
      { src: vs3, alt: "Aethyx rebrand" },
    ],
  },
];

const Portfolio = () => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <div className="pt-28 pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-display text-4xl md:text-6xl text-center mb-4">Portfolio</h1>
          <p className="text-center text-muted-foreground text-lg mb-20 max-w-2xl mx-auto">
            Real projects. Real results. Every site built with intention.
          </p>

          <div className="space-y-8">
            {projects.map((project, i) => (
              <div key={project.title} className="glass-card overflow-hidden">
                {/* Header / Cover */}
                <button
                  onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                  className="w-full flex items-center justify-between p-8 text-left hover:bg-muted/10 transition-colors"
                >
                  <div>
                    <h2 className="font-display text-2xl md:text-3xl mb-1">{project.title}</h2>
                    <p className="text-primary text-sm tracking-widest uppercase">{project.tagline}</p>
                    <p className="text-muted-foreground text-sm mt-1">{project.subtitle}</p>
                  </div>
                  <ChevronDown
                    className={`h-6 w-6 text-muted-foreground transition-transform ${
                      expandedIndex === i ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Expanded content */}
                {expandedIndex === i && (
                  <div className="px-8 pb-8 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-muted-foreground leading-relaxed max-w-2xl">
                      {project.description}
                    </p>

                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary text-sm hover:text-primary/80 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Visit Live Site
                    </a>

                    <LightboxGallery images={project.images} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Portfolio;
