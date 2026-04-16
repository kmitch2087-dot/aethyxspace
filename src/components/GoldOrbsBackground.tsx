import React, { useEffect, useRef } from "react";

interface Orb {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speedX: number;
  speedY: number;
  pulseSpeed: number;
  pulseOffset: number;
}

const GoldOrbsBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let orbs: Orb[] = [];
    let dpr = window.devicePixelRatio || 1;

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      // Reset transform to avoid cumulative scaling
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const initOrbs = () => {
      orbs = [];
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const count = Math.min(Math.floor((w * h) / 3000), 200);

      for (let i = 0; i < count; i++) {
        orbs.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: Math.random() * 3 + 1.5,
          opacity: Math.random() * 0.5 + 0.2,
          speedX: (Math.random() - 0.5) * 0.3,
          speedY: (Math.random() - 0.5) * 0.2 - 0.05,
          pulseSpeed: Math.random() * 0.003 + 0.001,
          pulseOffset: Math.random() * Math.PI * 2,
        });
      }
    };

    const draw = (time: number) => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      ctx.clearRect(0, 0, w, h);

      for (const orb of orbs) {
        orb.x += orb.speedX;
        orb.y += orb.speedY;

        // Wrap around edges
        if (orb.x < -10) orb.x = w + 10;
        if (orb.x > w + 10) orb.x = -10;
        if (orb.y < -10) {
          orb.y = h + 10;
          orb.x = Math.random() * w;
        }
        if (orb.y > h + 10) {
          orb.y = -10;
          orb.x = Math.random() * w;
        }

        const pulse = Math.sin(time * orb.pulseSpeed + orb.pulseOffset) * 0.3 + 0.7;
        const alpha = orb.opacity * pulse;

        // Gold orb with soft glow
        const gradient = ctx.createRadialGradient(
          orb.x, orb.y, 0,
          orb.x, orb.y, orb.size * 2.5
        );
        gradient.addColorStop(0, `rgba(212, 185, 130, ${alpha})`);
        gradient.addColorStop(0.4, `rgba(195, 165, 100, ${alpha * 0.6})`);
        gradient.addColorStop(1, `rgba(180, 150, 80, 0)`);

        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Bright core
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(235, 215, 170, ${alpha})`;
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    };

    resize();
    initOrbs();
    animationId = requestAnimationFrame(draw);

    const handleResize = () => {
      resize();
      initOrbs();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: "block" }}
    />
  );
};

export default GoldOrbsBackground;
