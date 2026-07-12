import { db } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import { getLocale, getT } from "@/lib/i18n";

export const metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const locale = getLocale();
  const t = getT();

  const logs = await db.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="text-2xl font-black text-emerald-950">{t("admin.audit.title")}</h1>
      <p className="mt-1 text-sm text-emerald-600">
        {t("admin.audit.sub", { count: 200 })}
      </p>

      <div className="card mt-6 overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>{t("admin.audit.when")}</th>
              <th>{t("admin.audit.actor")}</th>
              <th>{t("admin.audit.action")}</th>
              <th>{t("admin.audit.target")}</th>
              <th>{t("admin.audit.detail")}</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap text-xs text-emerald-600">{timeAgo(log.createdAt, locale)}</td>
                <td className="text-xs">{log.actor?.name ?? t("admin.audit.system")}</td>
                <td><span className="badge border-emerald-100 bg-emerald-50 font-mono text-[11px] text-emerald-800">{log.action}</span></td>
                <td className="text-xs text-emerald-600">
                  {log.targetType}{log.targetId ? ` · ${log.targetId.slice(0, 10)}…` : ""}
                </td>
                <td className="max-w-xs truncate text-xs text-emerald-600">{log.detail ?? "—"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} className="text-center text-sm text-emerald-600">{t("admin.audit.none")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
