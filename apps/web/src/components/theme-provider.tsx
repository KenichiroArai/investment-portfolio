"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  let result = <NextThemesProvider {...props}>{children}</NextThemesProvider>;
  return result;
}
