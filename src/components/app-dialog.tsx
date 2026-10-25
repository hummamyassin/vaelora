"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * The one modal surface: a bottom sheet on phones, a centred panel from 768px.
 * Native <dialog> keeps focus trapped and Escape working; closing restores focus.
 */
export function Sheet({
  title,
  close,
  closeLabel,
  children,
  className = "",
  wide = false,
}: {
  title: string;
  close: () => void;
  closeLabel: string;
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const dialog = ref.current!,
      previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    dialog.showModal();
    // Land on the dialog itself (announced by its title) unless content asks for focus.
    if (!dialog.querySelector("[autofocus]")) dialog.focus();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`sheet ${wide ? "sheet-wide" : ""} ${className}`}
      aria-labelledby={id}
      tabIndex={-1}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="sheet-inner">
        <header className="sheet-header">
          <h2 className="sheet-title" id={id}>
            {title}
          </h2>
          <button className="icon-btn" onClick={close} aria-label={closeLabel}>
            <X size={22} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
export const AppDialog = Sheet;
