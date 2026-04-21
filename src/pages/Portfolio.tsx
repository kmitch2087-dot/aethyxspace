import { useState } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { breadcrumb } from "@/lib/seoSchemas";
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
    description: "Women's Wellness Retreats in the Mountains of Southern Vermont. A serene, nature-inspired brand & web presence designed to reflect the transformative retreat experience.",
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
  const [activeProject, setActiveProject] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <Navbar />

      <div className="pt-28 pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-display text-4xl md:text-6xl text-center mb-4">Portfolio</h1>
          <p className="text-center text-muted-foreground text-lg mb-20 max-w-2xl mx-auto">
            Real projects. Real results. Every site built with intention.
          </p>

          {/* Featured Project Hero */}
          <div className="glass-card overflow-hidden mb-16">
            <div className="relative aspect-video md:aspect-[21/9]">
              <img src={rr1} alt="Rē Retreats" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
              <div className="absolute bottom-0 left-0 p-8 md:p-12">
                <p className="text-primary text-sm tracking-widest uppercase mb-2">Featured Project</p>
                <h2 className="font-display text-3xl md:text-5xl mb-3">Rē Retreats</h2>
                <p className="text-muted-foreground max-w-lg mb-4">
                  Women's Wellness Retreats in the Mountains of Southern Vermont.
                </p>
                <button
                  onClick={() => setActiveProject(activeProject === 0 ? null : 0)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm uppercase tracking-wide hover:bg-primary/90 transition-all"
                >
                  View Case Study <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            {activeProject === 0 && (
              <div className="px-8 pb-8 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-muted-foreground leading-relaxed max-w-2xl">{projects[0].description}</p>
                <a href={projects[0].url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary text-sm hover:text-primary/80 transition-colors">
                  <ExternalLink className="h-3.5 w-3.5" /> Visit Live Site
                </a>
                <LightboxGallery images={projects[0].images} />
              </div>
            )}
          </div>

          {/* Project Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {projects.slice(1).map((project, i) => (
              <div key={project.title} className="glass-card overflow-hidden group">
                <div className="aspect-video overflow-hidden">
                  <img
                    src={project.images[0].src}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <p className="text-primary text-xs tracking-widest uppercase mb-1">{project.tagline}</p>
                  <h3 className="font-display text-2xl mb-2">{project.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{project.subtitle}</p>
                  <button
                    onClick={() => setActiveProject(activeProject === i + 1 ? null : i + 1)}
                    className="text-primary text-sm uppercase tracking-widest hover:text-primary/80 transition-colors"
                  >
                    View Case Study →
                  </button>
                </div>
                {activeProject === i + 1 && (
                  <div className="px-6 pb-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-muted-foreground text-sm leading-relaxed">{project.description}</p>
                    <a href={project.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary text-sm hover:text-primary/80 transition-colors">
                      <ExternalLink className="h-3.5 w-3.5" /> Visit Live Site
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
