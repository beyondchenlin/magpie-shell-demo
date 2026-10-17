import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { popoverHost } from "../lib/popover";

/** Portal out of scrolling/animated pages; retain the simulated window boundary. */
export function PopoverPortal({ children }: { children: ReactNode }) {
  return createPortal(children, popoverHost());
}
