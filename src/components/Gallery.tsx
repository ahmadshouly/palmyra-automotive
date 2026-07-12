"use client";

import { useState } from "react";

export default function Gallery({ images, title, locale = "en" }: { images: string[]; title: string; locale?: "en" | "ar" }) {
  const [active, setActive] = useState(0);
  const list = images.length > 0 ? images : [];
  const photoLabel = locale === "ar" ? "صورة" : "photo";

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
          className="aspect-[8/5] w-full object-cover"
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
    </div>
  );
}
