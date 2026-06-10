import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
  valueClassName?: string;
};

export function StatCard({
  label,
  value,
  hint,
  className,
  valueClassName,
}: StatCardProps) {
  let result = (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn("text-2xl font-semibold tracking-tight", valueClassName)}>
          {value}
        </p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
  return result;
}
