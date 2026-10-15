import { RefObject, useEffect, useRef } from "react";

export function useDialogFocus(ref: RefObject<HTMLElement | null>, open: boolean, close: () => void, disabled = false) {
  const closeRef = useRef(close);
  const disabledRef = useRef(disabled);
  closeRef.current = close;
  disabledRef.current = disabled;
  useEffect(() => {
    if (!open || !ref.current) return;
    const dialog = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]')];
    const initial = dialog.querySelector<HTMLElement>("[autofocus]") ?? dialog.querySelector<HTMLElement>("input") ?? focusable()[0];
    initial?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !disabledRef.current) { event.preventDefault(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) { event.preventDefault(); return; }
      const first = elements[0]; const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener("keydown", onKey);
    return () => { dialog.removeEventListener("keydown", onKey); if (previous?.isConnected) previous.focus(); };
  }, [open, ref]);
}
