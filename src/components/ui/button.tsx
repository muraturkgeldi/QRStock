"use client";

import clsx from "clsx";

export function Button({
  children,
  variant = "primary",
  size = "sm",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}) {
  const base =
    "inline-flex items-center justify-center whitespace-nowrap rounded-md border transition px-3 py-1.5 text-sm";
  const sizes = {
    sm: "h-9",
    md: "h-10 px-4",
  };
  const variants = {
    primary: "bg-black text-white border-black",
    secondary: "bg-white text-black border-gray-300",
    ghost: "bg-transparent text-black border-transparent hover:border-gray-200",
    danger: "bg-white text-red-600 border-red-200 hover:border-red-300",
  };

  return (
    <button
      {...props}
      className={clsx(base, sizes[size], variants[variant], props.className)}
    >
      {children}
    </button>
  );
}
