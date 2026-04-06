import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface LightboxGalleryProps {
  images: { src: string; alt: string }[];
}

const LightboxGallery = ({ images }: LightboxGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const close = () => setActiveIndex(null);
  const prev = () =>
    setActiveIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : null));
  const next = () =>
    setActiveIndex((i) => (i !== null ? (i + 1) % images.length : null));

  return (
    <>
      {/* Thumbnail grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className="aspect-video rounded-lg overflow-hidden border border-border/30 hover:border-primary/40 transition-all hover:scale-[1.02]"
          >
            <img src={img.src} alt={img.alt} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {/* Lightbox overlay */}
      {activeIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex items-center justify-center"
          onClick={close}
        >
          <button
            onClick={(e) => { e.stopPropagation(); close(); }}
            className="absolute top-6 right-6 text-foreground/70 hover:text-foreground"
          >
            <X className="h-8 w-8" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 md:left-8 text-foreground/50 hover:text-foreground"
          >
            <ChevronLeft className="h-10 w-10" />
          </button>

          <img
            src={images[activeIndex].src}
            alt={images[activeIndex].alt}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 md:right-8 text-foreground/50 hover:text-foreground"
          >
            <ChevronRight className="h-10 w-10" />
          </button>

          <p className="absolute bottom-6 text-sm text-muted-foreground">
            {activeIndex + 1} / {images.length}
          </p>
        </div>
      )}
    </>
  );
};

export default LightboxGallery;
