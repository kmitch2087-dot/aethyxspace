interface PaintSplatProps {
  number: string;
  color: "sage" | "ocean";
}

const PaintSplat = ({ number, color }: PaintSplatProps) => {
  const fillColor = color === "sage" ? "#5B7A5F" : "#4A7C8C";
  
  return (
    <div className="relative w-14 h-14 mx-auto mb-3">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }}
      >
        {/* Paint splat shape */}
        <path
          d="M50 8c-5 0-12 3-15 8-2 4-1 6-4 8-4 3-12 2-16 7-5 6-4 14-2 20 2 5 6 9 5 14-1 6-6 10-5 17 1 8 10 13 18 14 6 1 11-1 16 1 6 2 10 8 17 8 8 0 14-7 18-14 3-5 4-11 7-16 4-6 10-10 10-18 0-9-7-15-12-21-4-5-6-11-12-15-7-5-16-8-25-8-7 0-14 3-20-5z"
          fill={fillColor}
        />
        {/* Small drip 1 */}
        <ellipse cx="25" cy="88" rx="4" ry="6" fill={fillColor} />
        {/* Small drip 2 */}
        <ellipse cx="72" cy="85" rx="3" ry="5" fill={fillColor} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-white font-display font-semibold text-lg">
        {number}
      </span>
    </div>
  );
};

export default PaintSplat;
