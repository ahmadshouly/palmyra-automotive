import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney, getSettings } from "@/lib/settings";
import { getLocale, getT } from "@/lib/i18n";
import { formatMileage, parseJsonArray } from "@/lib/utils";

export async function generateMetadata() {
  return { title: getT()("meta.compare") };
}
export const dynamic = "force-dynamic";

async function compareAction(formData: FormData) {
  "use server";
  const ids = [0, 1, 2, 3]
    .map((i) => String(formData.get(`slot${i}`) ?? "").trim())
    .filter(Boolean)
    .join(",");
  redirect(ids ? `/compare?ids=${encodeURIComponent(ids)}` : "/compare");
}

export default async function ComparePage({ searchParams }: { searchParams: { ids?: string } }) {
  const settings = await getSettings();
  const locale = getLocale();
  const t = getT();
  const ids = (searchParams.ids ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);

  const [available, selected] = await Promise.all([
    db.listing.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, title: true, price: true },
    }),
    ids.length > 0
      ? db.listing.findMany({ where: { id: { in: ids }, status: { in: ["ACTIVE", "SOLD"] } } })
      : Promise.resolve([]),
  ]);

  // keep original order
  const cars = ids.map((id) => selected.find((l) => l.id === id)).filter(Boolean) as typeof selected;
  const currency = settings.currency;

  const rows: [string, (l: (typeof cars)[number]) => string][] = [
    [t("dash.thPrice"), (l) => formatMoney(l.price, currency)],
    [t("spec.year"), (l) => String(l.year)],
    [t("spec.mileage"), (l) => formatMileage(l.mileage, locale)],
    [t("spec.bodyStyle"), (l) => t(`opt.bodyStyle.${l.bodyStyle}` as never)],
    [t("spec.fuelType"), (l) => t(`opt.fuelType.${l.fuelType}` as never)],
    [t("spec.transmission"), (l) => t(`opt.transmission.${l.transmission}` as never)],
    [t("spec.drivetrain"), (l) => t(`opt.drivetrain.${l.drivetrain}` as never)],
    [t("spec.engine"), (l) => l.engine ?? "—"],
    [t("spec.condition"), (l) => t(`opt.condition.${l.condition}` as never)],
    [t("spec.accidents"), (l) => (l.accidentFree ? t("detail.noneReported") : t("detail.reported"))],
    [t("spec.owners"), (l) => String(l.ownerCount)],
    [t("spec.location"), (l) => `${l.city}, ${l.state}`],
    [t("detail.features"), (l) => t("compare.featuresCount", { count: parseJsonArray(l.features).length })],
  ];

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-black text-emerald-950">{t("compare.title")}</h1>
      <p className="mt-2 text-emerald-600">{t("compare.sub")}</p>

      <form action={compareAction} className="card mt-6 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5">
        {[0, 1, 2, 3].map((i) => (
          <select key={i} name={`slot${i}`} defaultValue={ids[i] ?? ""} className="input">
            <option value="">{t("compare.slot", { n: i + 1 })}</option>
            {available.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title.slice(0, 40)} · {formatMoney(l.price, currency)}
              </option>
            ))}
          </select>
        ))}
        <button className="btn-primary">{t("compare.btn")}</button>
      </form>

      {cars.length > 0 ? (
        <div className="card mt-8 overflow-x-auto">
          <table className="table-base min-w-[700px]">
            <thead>
              <tr>
                <th className="w-40">{t("compare.attribute")}</th>
                {cars.map((l) => (
                  <th key={l.id}>
                    <Link href={`/listings/${l.id}`} className="hover:text-brand-600">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={parseJsonArray(l.images)[0] ?? ""}
                        alt=""
                        className="mb-2 aspect-[8/5] w-40 rounded-lg object-cover"
                      />
                      <span className="normal-case">{l.title}</span>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, fn]) => (
                <tr key={label}>
                  <td className="font-semibold text-emerald-600">{label}</td>
                  {cars.map((l) => (
                    <td key={l.id}>{fn(l)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card mt-8 p-16 text-center text-sm text-emerald-600">
          {t("compare.empty")}
        </div>
      )}
    </div>
  );
}
