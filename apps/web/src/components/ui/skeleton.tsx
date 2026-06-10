import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  let result = (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props}
    />
  );
  return result;
}

export { Skeleton };
