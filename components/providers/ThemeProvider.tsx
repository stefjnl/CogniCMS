"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import React from "react";

/**
 * ThemeProvider wraps the application with next-themes for light/dark mode support
 * This component enables seamless theme switching across the entire application
 * using CSS custom properties defined in globals.css
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
