"use client";

export type ButtonVariant = "number" | "operator" | "action" | "equals" | "zero";

interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: ButtonVariant;
  /** Highlights an operator button while it is the pending operation */
  active?: boolean;
}

const variantBase =
  "rounded-full h-16 text-2xl font-light transition-all duration-100 " +
  "active:scale-95 active:brightness-90 select-none cursor-pointer w-full " +
  "flex items-center justify-center focus:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-amber-400";

const variantClasses: Record<ButtonVariant, string> = {
  number:   "bg-zinc-700 hover:bg-zinc-600 text-white",
  operator: "bg-amber-500 hover:bg-amber-400 text-white",
  action:   "bg-zinc-500 hover:bg-zinc-400 text-white",
  equals:   "bg-amber-500 hover:bg-amber-400 text-white",
  zero:     "bg-zinc-700 hover:bg-zinc-600 text-white justify-start pl-7",
};

/** When an operator is "pending", invert its colours (white bg, amber text) */
const activeOperatorClasses =
  "bg-white hover:bg-zinc-100 !text-amber-500";

export default function Button({
  label,
  onClick,
  variant = "number",
  active = false,
}: ButtonProps) {
  const isOperator = variant === "operator" || variant === "equals";
  const colorClass =
    active && isOperator
      ? activeOperatorClasses
      : variantClasses[variant];

  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`${variantBase} ${colorClass}`}
    >
      {label}
    </button>
  );
}
