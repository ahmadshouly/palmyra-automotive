"use client";

import { useEffect, useRef, useState } from "react";
import {
  BODY_STYLES,
  CONDITIONS,
  DRIVETRAINS,
  FEATURE_OPTIONS,
  FUEL_TYPES,
  POPULAR_MAKES,
  TRANSMISSIONS,
} from "@/lib/constants";
import { makeT, type Locale } from "@/lib/dictionary";
import { createListingAction } from "@/app/actions/listings";

type DecodeState = { status: "idle" | "loading" | "done" | "error"; message?: string };

export type ListingInitial = {
  make: string;
  model: string;
  year: number;
  mileage: number;
  bodyStyle: string;
  fuelType: string;
  transmission: string;
  drivetrain: string;
  engine: string | null;
  exteriorColor: string;
  interiorColor: string | null;
  condition: string;
  ownerCount: number;
  accidentFree: boolean;
  title: string;
  description: string;
  titleAr: string | null;
  descriptionAr: string | null;
  vin: string | null;
  price: number;
  city: string;
  state: string;
  tier: string;
  features: string[];
  images: string[];
};

export default function SellForm({
  error,
  locale,
  initial,
  action,
}: {
  error?: string;
  locale: Locale;
  initial?: ListingInitial;
  action?: (formData: FormData) => void | Promise<void>;
}) {
  const t = makeT(locale);
  const isEdit = !!initial;
  const formRef = useRef<HTMLFormElement>(null);
  const [decode, setDecode] = useState<DecodeState>({ status: "idle" });
  const [importState, setImportState] = useState<DecodeState>({ status: "idle" });
  const [importedImages, setImportedImages] = useState<string[]>([]);
  const [importMeta, setImportMeta] = useState<{ ref?: string; url?: string }>({});
  const [duplicate, setDuplicate] = useState<{ listingId: string; title: string; status: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [translating, setTranslating] = useState(false);

  function setField(name: string, value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") return;
    const el = formRef.current?.elements.namedItem(name);
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
      el.value = String(value);
    }
  }

  function checkFeatures(features: string[]) {
    const set = new Set(features);
    const boxes = formRef.current?.querySelectorAll<HTMLInputElement>('input[name="features"]');
    boxes?.forEach((box) => {
      box.checked = set.has(box.value);
    });
  }

  async function autoTranslate() {
    const form = formRef.current;
    if (!form) return;
    const readValue = (name: string) => {
      const el = form.elements.namedItem(name);
      return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value.trim() : "";
    };
    const title = readValue("title");
    const description = readValue("description");
    if (!title && !description) return;
    setTranslating(true);
    try {
      const translate = async (text: string) => {
        if (!text) return "";
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, target: "ar" }),
        });
        const data = await res.json();
        return typeof data.translation === "string" ? data.translation : "";
      };
      const [titleAr, descriptionAr] = await Promise.all([translate(title), translate(description)]);
      if (titleAr) setField("titleAr", titleAr);
      if (descriptionAr) setField("descriptionAr", descriptionAr);
    } finally {
      setTranslating(false);
    }
  }

  // Prefill every field when editing an existing listing.
  useEffect(() => {
    if (!initial) return;
    const form = formRef.current;
    if (!form) return;
    const scalars: [string, string | number | null][] = [
      ["make", initial.make],
      ["model", initial.model],
      ["year", initial.year],
      ["mileage", initial.mileage],
      ["bodyStyle", initial.bodyStyle],
      ["fuelType", initial.fuelType],
      ["transmission", initial.transmission],
      ["drivetrain", initial.drivetrain],
      ["engine", initial.engine],
      ["exteriorColor", initial.exteriorColor],
      ["interiorColor", initial.interiorColor],
      ["condition", initial.condition],
      ["ownerCount", initial.ownerCount],
      ["title", initial.title],
      ["description", initial.description],
      ["titleAr", initial.titleAr],
      ["descriptionAr", initial.descriptionAr],
      ["vin", initial.vin],
      ["price", initial.price],
      ["city", initial.city],
      ["state", initial.state],
    ];
    for (const [name, value] of scalars) setField(name, value ?? "");
    checkFeatures(initial.features ?? []);
    const acc = form.elements.namedItem("accidentFree");
    if (acc instanceof HTMLInputElement) acc.checked = !!initial.accidentFree;
    form.querySelectorAll<HTMLInputElement>('input[name="tier"]').forEach((r) => {
      r.checked = r.value === initial.tier;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  async function importFromUrl() {
    const urlEl = formRef.current?.elements.namedItem("importUrl");
    const url = urlEl instanceof HTMLInputElement ? urlEl.value.trim() : "";
    if (!url) {
      setImportState({ status: "error", message: t("sell.importFail") });
      return;
    }
    setImportState({ status: "loading" });
    setDuplicate(null);
    try {
      const res = await fetch(`/api/import?url=${encodeURIComponent(url)}`);
      const d = await res.json();
      if (!res.ok) {
        if (res.status === 409 && d.duplicate) {
          setDuplicate(d.duplicate);
          throw new Error(d.error ?? "Already listed");
        }
        throw new Error(d?.error ?? "Import failed");
      }

      setField("title", d.title);
      setField("make", d.make);
      setField("model", d.model);
      setField("year", d.year);
      setField("mileage", d.mileage);
      setField("price", d.price > 0 ? d.price : null);
      setField("vin", d.vin);
      setField("engine", d.engine);
      setField("exteriorColor", d.exteriorColor);
      setField("bodyStyle", d.bodyStyle);
      setField("fuelType", d.fuelType);
      setField("transmission", d.transmission);
      setField("drivetrain", d.drivetrain);
      setField("condition", d.condition);
      setField("description", d.description);
      checkFeatures(Array.isArray(d.features) ? d.features : []);
      setImportedImages(Array.isArray(d.images) ? d.images : []);
      setImportMeta({ ref: d.ref, url: url });

      setImportState({
        status: "done",
        message: t("sell.importDone", { title: d.title, count: (d.images ?? []).length }),
      });
    } catch (e) {
      setImportState({
        status: "error",
        message: e instanceof Error && e.message !== "Import failed" ? e.message : t("sell.importFail"),
      });
    }
  }

  async function decodeVin() {
    const vinEl = formRef.current?.elements.namedItem("vin");
    const vin = vinEl instanceof HTMLInputElement ? vinEl.value.trim() : "";
    if (vin.length < 11) {
      setDecode({ status: "error", message: t("sell.vinFirst") });
      return;
    }
    setDecode({ status: "loading" });
    try {
      const res = await fetch(`/api/vin/${encodeURIComponent(vin)}`);
      if (!res.ok) throw new Error("Invalid VIN");
      const d = await res.json();
      setField("make", d.make);
      setField("model", d.model);
      setField("year", d.year);
      setField("engine", d.engine ? `${d.engine}${d.cylinders ? ` (${d.cylinders} cyl)` : ""}` : null);
      // Map free-form NHTSA values onto our option lists where possible
      if (d.fuelType) {
        const match = FUEL_TYPES.find((f) => d.fuelType.toLowerCase().includes(f.toLowerCase().split(" ")[0]));
        setField("fuelType", match);
      }
      if (d.drivetrain) {
        const dt = d.drivetrain.toUpperCase();
        const match = DRIVETRAINS.find((x) => dt.includes(x)) ?? (dt.includes("FRONT") ? "FWD" : dt.includes("REAR") ? "RWD" : dt.includes("ALL") ? "AWD" : null);
        setField("drivetrain", match);
      }
      if (d.bodyStyle) {
        const bs = d.bodyStyle.toLowerCase();
        const match = BODY_STYLES.find((b) => bs.includes(b.toLowerCase()));
        setField("bodyStyle", match ?? (bs.includes("sport utility") ? "SUV" : bs.includes("pickup") ? "Truck" : null));
      }
      setDecode({
        status: "done",
        message:
          d.source === "nhtsa"
            ? t("sell.decodedVia", { info: [d.year, d.make, d.model].filter(Boolean).join(" ") || "—" })
            : d.note ?? t("sell.partialDecode"),
      });
    } catch {
      setDecode({ status: "error", message: t("sell.decodeFail") });
    }
  }

  return (
    <form
      ref={formRef}
      action={action ?? createListingAction}
      onSubmit={() => setSubmitting(true)}
      className="space-y-8"
    >
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Import from URL */}
      {!isEdit && (
      <section className="card border-brand-200 bg-brand-50/60 p-6">
        <h2 className="text-lg font-bold text-emerald-950">{t("sell.importTitle")}</h2>
        <p className="mt-1 text-sm text-emerald-600">{t("sell.importSub")}</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            name="importUrl"
            placeholder={t("sell.importPh")}
            className="input flex-1"
            dir="ltr"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                importFromUrl();
              }
            }}
          />
          <button type="button" onClick={importFromUrl} disabled={importState.status === "loading"} className="btn-primary">
            {importState.status === "loading" ? t("sell.importing") : t("sell.importBtn")}
          </button>
        </div>
        {importState.message && (
          <p className={`mt-2 text-sm ${importState.status === "error" ? "text-rose-600" : "text-emerald-700"}`}>
            {importState.message}
          </p>
        )}
        {duplicate && (
          <p className="mt-2 text-sm text-rose-600">
            {t("sell.duplicateTitle")}:{" "}
            <a href={`/listings/${duplicate.listingId}`} className="font-semibold underline">
              {duplicate.title}
            </a>{" "}
            ({duplicate.status}).{" "}
            <a href={`/listings/${duplicate.listingId}`} className="font-semibold underline">
              {t("sell.duplicateLink")}
            </a>
          </p>
        )}
        {importedImages.length > 0 && (
          <div className="mt-3">
            <div className="flex gap-2 overflow-x-auto">
              {importedImages.slice(0, 5).map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" className="h-16 w-24 shrink-0 rounded-lg border border-emerald-100 object-cover" />
              ))}
            </div>
            <p className="mt-2 text-xs text-emerald-600">
              {t("sell.importedPhotos", { count: importedImages.length })}
            </p>
          </div>
        )}
        <input type="hidden" name="importImages" value={JSON.stringify(importedImages)} />
        <input type="hidden" name="sourceRef" value={importMeta.ref ?? ""} />
        <input type="hidden" name="sourceUrl" value={importMeta.url ?? ""} />
      </section>
      )}

      {/* VIN */}
      <section className="card p-6">
        <h2 className="text-lg font-bold text-emerald-950">{t("sell.s1")}</h2>
        <p className="mt-1 text-sm text-emerald-600">{t("sell.s1Sub")}</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input name="vin" placeholder={t("sell.vinPh")} className="input font-mono uppercase sm:max-w-md" maxLength={17} dir="ltr" />
          <button type="button" onClick={decodeVin} disabled={decode.status === "loading"} className="btn-outline">
            {decode.status === "loading" ? t("sell.decoding") : t("sell.decode")}
          </button>
        </div>
        {decode.message && (
          <p className={`mt-2 text-sm ${decode.status === "error" ? "text-rose-600" : "text-emerald-700"}`}>
            {decode.message}
          </p>
        )}
      </section>

      {/* Basics */}
      <section className="card p-6">
        <h2 className="text-lg font-bold text-emerald-950">{t("sell.s2")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label">{t("search.make")} *</label>
            <input name="make" list="makes" required className="input" placeholder={t("search.make")} />
            <datalist id="makes">
              {POPULAR_MAKES.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label">{t("search.model")} *</label>
            <input name="model" required className="input" placeholder={t("search.model")} />
          </div>
          <div>
            <label className="label">{t("spec.year")} *</label>
            <input name="year" type="number" min={1950} max={new Date().getFullYear() + 1} required className="input" placeholder={t("sell.yearPh")} />
          </div>
          <div>
            <label className="label">{t("sell.mileage")} *</label>
            <input name="mileage" type="number" min={0} required className="input" placeholder={t("sell.mileagePh")} />
          </div>
          <div>
            <label className="label">{t("search.bodyStyle")} *</label>
            <select name="bodyStyle" required className="input" defaultValue="">
              <option value="" disabled>{t("common.select")}</option>
              {BODY_STYLES.map((b) => (
                <option key={b} value={b}>{t(`opt.bodyStyle.${b}` as never)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("search.fuelType")} *</label>
            <select name="fuelType" required className="input" defaultValue="">
              <option value="" disabled>{t("common.select")}</option>
              {FUEL_TYPES.map((f) => (
                <option key={f} value={f}>{t(`opt.fuelType.${f}` as never)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("search.transmission")} *</label>
            <select name="transmission" required className="input" defaultValue="">
              <option value="" disabled>{t("common.select")}</option>
              {TRANSMISSIONS.map((x) => (
                <option key={x} value={x}>{t(`opt.transmission.${x}` as never)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("spec.drivetrain")} *</label>
            <select name="drivetrain" required className="input" defaultValue="">
              <option value="" disabled>{t("common.select")}</option>
              {DRIVETRAINS.map((d) => (
                <option key={d} value={d}>{t(`opt.drivetrain.${d}` as never)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("spec.engine")}</label>
            <input name="engine" className="input" placeholder="2.5L I4" />
          </div>
          <div>
            <label className="label">{t("spec.exteriorColor")} *</label>
            <input name="exteriorColor" required className="input" placeholder={t("spec.exteriorColor")} />
          </div>
          <div>
            <label className="label">{t("spec.interiorColor")}</label>
            <input name="interiorColor" className="input" placeholder={t("spec.interiorColor")} />
          </div>
          <div>
            <label className="label">{t("spec.condition")} *</label>
            <select name="condition" required className="input" defaultValue="">
              <option value="" disabled>{t("common.select")}</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{t(`opt.condition.${c}` as never)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("sell.owners")}</label>
            <input name="ownerCount" type="number" min={1} max={15} defaultValue={1} className="input" />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-emerald-800">
              <input type="checkbox" name="accidentFree" defaultChecked className="h-4 w-4 rounded border-emerald-300 text-brand-600 focus:ring-brand-500" />
              {t("sell.noAccidents")}
            </label>
          </div>
        </div>
      </section>

      {/* Listing content */}
      <section className="card p-6">
        <h2 className="text-lg font-bold text-emerald-950">{t("sell.s3")}</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="label">{t("sell.titleLabel")} *</label>
            <input name="title" required minLength={5} className="input" placeholder={t("sell.titlePh")} />
          </div>
          <div>
            <label className="label">{t("sell.desc")} *</label>
            <textarea name="description" required minLength={20} rows={6} className="input" placeholder={t("sell.descPh")} />
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-emerald-900">{t("sell.translateHint")}</p>
              <button type="button" onClick={autoTranslate} disabled={translating} className="btn-outline btn-sm">
                {translating ? t("sell.translating") : t("sell.autoTranslate")}
              </button>
            </div>
            <div className="mt-3 space-y-3">
              <div>
                <label className="label">{t("sell.titleAr")}</label>
                <input name="titleAr" className="input" dir="rtl" />
              </div>
              <div>
                <label className="label">{t("sell.descAr")}</label>
                <textarea name="descriptionAr" rows={5} className="input" dir="rtl" />
              </div>
            </div>
          </div>
          <div>
            <label className="label">{t("detail.features")}</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURE_OPTIONS.map((f) => (
                <label key={f} className="flex items-center gap-2 rounded-lg border border-emerald-100 px-3 py-2 text-sm text-emerald-800 hover:bg-emerald-50">
                  <input type="checkbox" name="features" value={f} className="h-4 w-4 rounded border-emerald-300 text-brand-600 focus:ring-brand-500" />
                  {t(`opt.feature.${f}` as never)}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label">{t("sell.photos")}</label>
            {isEdit && initial!.images.length > 0 && (
              <div className="mb-2 flex gap-2 overflow-x-auto">
                {initial!.images.slice(0, 6).map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src} src={src} alt="" className="h-16 w-24 shrink-0 rounded-lg border border-emerald-100 object-cover" />
                ))}
              </div>
            )}
            <input name="photos" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="input file:me-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white" />
            <p className="mt-1 text-xs text-emerald-600">{isEdit ? t("sell.keepPhotos") : t("sell.photosNote")}</p>
          </div>
        </div>
      </section>

      {/* Price & location */}
      <section className="card p-6">
        <h2 className="text-lg font-bold text-emerald-950">{t("sell.s4")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">{t("sell.price")} *</label>
            <input name="price" type="number" min={100} required className="input" placeholder="24500" />
          </div>
          <div>
            <label className="label">{t("auth.city")} *</label>
            <input name="city" required className="input" placeholder={t("auth.city")} />
          </div>
          <div>
            <label className="label">{t("auth.state")} *</label>
            <input name="state" required className="input" placeholder={t("auth.state")} />
          </div>
        </div>
        <div className="mt-4">
          <label className="label">{t("sell.tier")}</label>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { v: "FREE", title: t("sell.tierFree"), d: t("sell.tierFreeD") },
              { v: "PREMIUM", title: t("sell.tierPremium"), d: t("sell.tierPremiumD") },
              { v: "ULTIMATE", title: t("sell.tierUltimate"), d: t("sell.tierUltimateD") },
            ].map((tier, i) => (
              <label key={tier.v} className="flex cursor-pointer flex-col gap-1 rounded-xl border border-emerald-100 p-4 hover:border-brand-400 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                <span className="flex items-center gap-2 font-semibold text-emerald-950">
                  <input type="radio" name="tier" value={tier.v} defaultChecked={i === 0} className="h-4 w-4 text-brand-600 focus:ring-brand-500" />
                  {tier.title}
                </span>
                <span className="text-xs text-emerald-600">{tier.d}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-emerald-600">{isEdit ? t("sell.keepPhotos") : t("sell.publishNote")}</p>
        <button type="submit" disabled={submitting} className="btn-primary px-8 py-3">
          {submitting ? t("sell.submitting") : isEdit ? t("sell.update") : t("sell.submit")}
        </button>
      </div>
    </form>
  );
}
