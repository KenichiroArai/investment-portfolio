import * as React from "react";

import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    let result = (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border bg-card text-card-foreground shadow-sm",
          className,
        )}
        {...props}
      />
    );
    return result;
  },
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  let result = (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  );
  return result;
});
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  let result = (
    <div
      ref={ref}
      className={cn("font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
  return result;
});
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  let result = (
    <div
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
  return result;
});
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  let result = <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />;
  return result;
});
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  let result = (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  );
  return result;
});
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
