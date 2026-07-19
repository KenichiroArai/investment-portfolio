import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
  size?: "default" | "narrow";
};

export function PageContainer({
  children,
  className,
  size = "default",
}: PageContainerProps) {
  let result = (
    <div
      className={cn(
        "mx-auto w-full min-w-0 px-4 py-6 md:px-6 md:py-8",
        size === "default" ? "max-w-6xl" : "max-w-3xl",
        className,
      )}
    >
      {children}
    </div>
  );
  return result;
}
