import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/ui";
import {
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type PropsWithChildren,
  type ReactElement,
} from "react";

const buttonStyles = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand-600 text-white hover:bg-brand-700",
        secondary: "bg-slate-200 text-slate-900 hover:bg-slate-300",
        ghost: "bg-transparent hover:bg-slate-100",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-6",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles> &
  PropsWithChildren & {
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}: ButtonProps) {
  if (asChild && isValidElement(children)) {
    const mergedClassName = cn(
      buttonStyles({ variant, size }),
      className,
      (children.props as { className?: string }).className
    );

    return cloneElement(children as ReactElement, {
      ...props,
      className: mergedClassName,
    });
  }

  return (
    <button
      className={cn(buttonStyles({ variant, size }), className)}
      {...props}
    >
      {children}
    </button>
  );
}
