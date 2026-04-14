import { useRef } from "react";

const BackgroundVideo = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.6;
    }
  };

  return (
    <div className="fixed inset-0 z-0">
      <video
        ref={videoRef}
        src="/aethyx-intro.mov"
        autoPlay
        loop
        muted
        playsInline
        onLoadedData={handleVideoLoaded}
        className="w-full h-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, hsl(0 0% 4% / 0.4) 0%, hsl(0 0% 4% / 0.7) 50%, hsl(0 0% 4% / 0.92) 100%)",
        }}
      />
    </div>
  );
};

export default BackgroundVideo;
