interface DisplayProps {
  /** The in-progress expression shown above the current value, e.g. "128 × 3 =" */
  expression: string;
  /** The current number being entered or the last result */
  currentValue: string;
}

/** Picks a Tailwind font-size class based on digit count so it never overflows. */
function getFontSize(value: string): string {
  if (value.length <= 9)  return "text-5xl";
  if (value.length <= 12) return "text-4xl";
  if (value.length <= 15) return "text-3xl";
  return "text-2xl";
}

export default function Display({ expression, currentValue }: DisplayProps) {
  return (
    <div className="px-6 pt-8 pb-5 text-right select-none">
      {/* Expression line */}
      <p
        className="text-zinc-400 text-base h-6 truncate leading-6 transition-all duration-150"
        aria-label="expression"
      >
        {expression || "\u00A0"}
      </p>

      {/* Main value */}
      <p
        className={`text-white font-light tracking-tight truncate mt-1 transition-all duration-100 ${getFontSize(currentValue)}`}
        aria-label="current value"
        aria-live="polite"
      >
        {currentValue}
      </p>
    </div>
  );
}
