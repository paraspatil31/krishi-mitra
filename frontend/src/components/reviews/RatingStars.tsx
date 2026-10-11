import { useState } from "react";

interface RatingStarsProps {
  rating: number; // 0 to 5
  maxRating?: number;
  count?: number; // optional total review count e.g. (14)
  editable?: boolean;
  size?: "sm" | "md" | "lg";
  onChange?: (rating: number) => void;
  showScore?: boolean;
}

export default function RatingStars({
  rating,
  maxRating = 5,
  count,
  editable = false,
  size = "md",
  onChange,
  showScore = true,
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const displayRating = hoverRating !== null ? hoverRating : rating;

  const starSizes = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  };

  return (
    <div className="inline-flex items-center gap-1.5 select-none">
      <div className="flex items-center">
        {Array.from({ length: maxRating }, (_, idx) => {
          const starValue = idx + 1;
          const isFilled = starValue <= Math.round(displayRating);
          const isInteractive = editable && onChange;

          return (
            <button
              key={idx}
              type="button"
              disabled={!isInteractive}
              onClick={() => isInteractive && onChange(starValue)}
              onMouseEnter={() => isInteractive && setHoverRating(starValue)}
              onMouseLeave={() => isInteractive && setHoverRating(null)}
              className={`${starSizes[size]} transition-all ${
                isInteractive
                  ? "cursor-pointer hover:scale-125 focus:outline-none"
                  : "cursor-default"
              } ${
                isFilled
                  ? "text-amber-400 drop-shadow-xs"
                  : "text-gray-300 hover:text-amber-200"
              }`}
              aria-label={`${starValue} star`}
            >
              ★
            </button>
          );
        })}
      </div>

      {showScore && rating > 0 && !editable && (
        <span className="text-xs font-bold text-gray-800">
          {rating.toFixed(1)}
        </span>
      )}

      {count !== undefined && !editable && (
        <span className="text-xs font-medium text-gray-500">
          ({count} {count === 1 ? "review" : "reviews"})
        </span>
      )}
    </div>
  );
}
