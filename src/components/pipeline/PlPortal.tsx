"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/* Modal, drawer, menu, dan toast dirender ke <body> agar tidak terjebak stacking
   context layout dashboard; dibungkus .pl-root agar CSS variable Pipeline tetap berlaku. */
export function PlPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<div className="pl-root">{children}</div>, document.body);
}
