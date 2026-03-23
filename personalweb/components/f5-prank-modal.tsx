"use client";

import { useEffect, useEffectEvent, useState } from "react";

export function F5PrankModal() {
  const [isOpen, setIsOpen] = useState(false);

  function closeModal() {
    setIsOpen(false);
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "F5") {
      event.preventDefault();
      setIsOpen(true);
      return;
    }

    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      closeModal();
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,244,63,0.32),transparent_30%),radial-gradient(circle_at_20%_20%,rgba(255,0,128,0.28),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(34,211,238,0.28),transparent_32%),linear-gradient(135deg,#ff4d00_0%,#ff006e_35%,#7c3aed_68%,#00c2ff_100%)] px-6 py-10"
      role="dialog"
      aria-modal="true"
      aria-label="Mensaje F5"
    >
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 cursor-default"
        onClick={closeModal}
      />

      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-8 rounded-[2.5rem] border border-white/30 bg-slate-950/35 px-8 py-12 text-center shadow-[0_32px_120px_rgba(0,0,0,0.45)] backdrop-blur-md md:px-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.45em] text-yellow-200/95">
          F5 Interceptado
        </p>

        <h2 className="max-w-4xl text-4xl font-black uppercase leading-[0.95] text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)] md:text-7xl">
          !POR EL CULO TE LA HINCO!!!!!!
        </h2>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-full border border-white/25 bg-white/12 px-6 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-white transition hover:border-white/45 hover:bg-white/18"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
