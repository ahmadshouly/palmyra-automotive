"use client";

import { useEffect, useState } from "react";

export default function Gallery({ images, title, locale = "en" }: { images: string[]; title: string; locale?: "en" | "ar" }) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const list = images.length > 0 ? images : [];
  const photoLabel = locale === "ar" ? "صورة" : "photo";
  const closeLabel = locale === "ar" ? "إغلاق" : "Close";

  const show = (i: number) => setActive((i + list.length) % list.length);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowRight") show(active + 1);
      else if (e.key === "ArrowLeft") show(active - 1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active, list.length]);

  if (list.length === 0) {
    return <div className="aspect-[8/5] w-full rounded-xl bg-emerald-50" />;
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={list[active]}
          alt={`${title} — ${photoLabel} ${active + 1}`}
          onClick={() => {
            setZoom(false);
            setOpen(true);
          }}
          className="aspect-[8/5] w-full cursor-zoom-in object-cover"
        />
      </div>
      {list.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {list.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              className={`overflow-hidden rounded-lg border-2 ${
                i === active ? "border-brand-600" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="aspect-[8/5] w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
            className="absolute end-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20"
          >
            ✕
          </button>

          {list.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous"
                onClick={(e) => {
                  e.stopPropagation();
                  setZoom(false);
                  show(active - 1);
                }}
                className="absolute start-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next"
                onClick={(e) => {
                  e.stopPropagation();
                  setZoom(false);
                  show(active + 1);
                }}
                className="absolute start-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20 sm:start-auto sm:end-20"
              >
                ›
              </button>
            </>
          )}

          <div className="max-h-full max-w-6xl overflow-auto" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={list[active]}
              alt={`${title} — ${photoLabel} ${active + 1}`}
              onClick={() => setZoom((z) => !z)}
              className={`mx-auto select-none transition-transform duration-200 ${
                zoom ? "max-w-none scale-150 cursor-zoom-out sm:scale-[2]" : "max-h-[85vh] w-auto cursor-zoom-in"
              }`}
            />
          </div>

          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
            {active + 1} / {list.length}
          </p>
        </div>
      )}
    </div>
  );
}
