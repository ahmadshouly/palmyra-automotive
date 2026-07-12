import Link from "next/link";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import { completeInspectionAction } from "@/app/actions/admin";
import { getLocale, getT } from "@/lib/i18n";

function inspectionTypeKey(type: string): string {
  switch (type) {
    case "MOBILE":
      return "detail.inspMobile";
    case "VIRTUAL":
      return "detail.inspVirtual";
    case "CENTER":
      return "detail.inspCenter";
    default:
      return type;
  }
}

export const metadata = { title: "Inspections" };
export const dynamic = "force-dynamic";

export default async function AdminInspectionsPage() {
  const locale = getLocale();
  const t = getT();

  const inspections = await db.inspection.findMany({
    include: { listing: { include: { seller: true } }, inspector: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const open = inspections.filter((i) => i.status !== "COMPLETED");
  const completed = inspections.filter((i) => i.status === "COMPLETED");

  return (
    <div>
      <h1 className="text-2xl font-black text-emerald-950">{t("admin.inspections.title")}</h1>

      <h2 className="mt-6 font-bold text-emerald-800">{t("admin.inspections.openRequests", { count: open.length })}</h2>
      <div className="mt-3 space-y-4">
        {open.length === 0 && <div className="card p-8 text-center text-sm text-emerald-600">{t("admin.inspections.noOpen")}</div>}
        {open.map((i) => (
          <div key={i.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Link href={`/listings/${i.listingId}`} className="font-bold text-brand-700 hover:underline">
                  {i.listing.title}
                </Link>
                <p className="text-xs text-emerald-500">
                  {t("admin.inspections.type", {
                    type: inspectionTypeKey(i.type),
                    time: timeAgo(i.createdAt, locale),
                    seller: i.listing.seller.name,
                  })}
                </p>
              </div>
              <span className="badge border-amber-200 bg-amber-50 text-amber-700">{t(`opt.td.${i.status}` as never)}</span>
            </div>
            <form action={completeInspectionAction.bind(null, i.id)} className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="label">{t("admin.inspections.score")}</label>
                <input name="score" type="number" min={0} max={100} required className="input w-28" />
              </div>
              <div className="min-w-64 flex-1">
                <label className="label">{t("admin.inspections.reportSummary")}</label>
                <input name="summary" required className="input" placeholder={t("admin.inspections.reportPh")} />
              </div>
              <button className="btn-success">{t("admin.inspections.markCompleted")}</button>
            </form>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-bold text-emerald-800">{t("admin.inspections.completed", { count: completed.length })}</h2>
      <div className="card mt-3 overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>{t("admin.inspections.vehicle")}</th><th>{t("admin.inspections.typeHeader")}</th><th>{t("admin.inspections.scoreHeader")}</th><th>{t("admin.inspections.inspector")}</th><th>{t("admin.inspections.completedTime")}</th></tr></thead>
          <tbody>
            {completed.map((i) => (
              <tr key={i.id}>
                <td>
                  <Link href={`/listings/${i.listingId}`} className="font-semibold text-brand-700 hover:underline">
                    {i.listing.title}
                  </Link>
                </td>
                <td>{t(inspectionTypeKey(i.type) as never)}</td>
                <td className="font-bold">{i.score}/100</td>
                <td>{i.inspector?.name ?? "—"}</td>
                <td className="text-xs text-emerald-600">{i.completedAt ? timeAgo(i.completedAt, locale) : "—"}</td>
              </tr>
            ))}
            {completed.length === 0 && (
              <tr><td colSpan={5} className="text-center text-sm text-emerald-600">{t("admin.inspections.none")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
