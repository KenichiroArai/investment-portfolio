import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
  className?: string;
};

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: FormFieldProps) {
  let result = (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
  return result;
}
