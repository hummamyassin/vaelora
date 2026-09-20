"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function AppDialog({
  title,
  close,
  closeLabel,
  children,
  className = "",
}: {
  title: string;
  close: () => void;
  closeLabel: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const dialog = ref.current!,
      previous = document.activeElement as HTMLElement,
      overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`v2-sheet ${className}`}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="sheet-inner">
        <header>
          <h2 id={id}>{title}</h2>
          <button onClick={close} aria-label={closeLabel}>
            <X size={22} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
