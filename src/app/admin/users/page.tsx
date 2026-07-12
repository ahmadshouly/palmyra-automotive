import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { timeAgo } from "@/lib/utils";
import { updateUserAction } from "@/app/actions/admin";
import { getLocale, getT } from "@/lib/i18n";

export const metadata = { title: "User management" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string } }) {
  const me = await requireUser(["ADMIN", "MODERATOR"]);
  const q = searchParams.q?.trim();
  const locale = getLocale();
  const t = getT();

  const users = await db.user.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { _count: { select: { listings: true, offers: true } } },
  });

  const canEdit = me.role === "ADMIN";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-emerald-950">{t("admin.users.title")}</h1>
        <form action="/admin/users" className="flex gap-2">
          <input name="q" defaultValue={q} className="input w-64" placeholder={t("admin.users.searchPh")} />
          <button className="btn-outline">{t("admin.users.search")}</button>
        </form>
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>{t("admin.users.user")}</th>
              <th>{t("admin.users.activity")}</th>
              <th>{t("admin.users.joined")}</th>
              <th>{t("admin.users.roleStatus")}</th>
              {canEdit && <th>{t("admin.users.save")}</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <p className="font-semibold">
                    {u.name}
                    {u.verified && <span className="ms-2 badge border-emerald-200 bg-emerald-50 text-emerald-700">{t("admin.users.verified")}</span>}
                    {u.status === "SUSPENDED" && <span className="ms-2 badge border-rose-200 bg-rose-50 text-rose-700">{t("admin.users.suspended")}</span>}
                  </p>
                  <p className="text-xs text-emerald-500">{u.email}{u.dealershipName ? ` · ${u.dealershipName}` : ""}</p>
                </td>
                <td className="text-xs text-emerald-600">
                  {t("admin.users.listings", { count: u._count.listings })} · {t("admin.users.offers", { count: u._count.offers })}
                </td>
                <td className="text-xs text-emerald-600">{timeAgo(u.createdAt, locale)}</td>
                {canEdit && u.id !== me.id ? (
                  <td colSpan={2}>
                    <form action={updateUserAction.bind(null, u.id)} className="flex flex-wrap items-center gap-2">
                      <select name="role" defaultValue={u.role} className="input w-36 py-1.5 text-xs">
                        {ROLES.map((r) => <option key={r} value={r}>{t(`opt.role.${r}` as never)}</option>)}
                      </select>
                      <select name="status" defaultValue={u.status} className="input w-32 py-1.5 text-xs">
                        <option value="ACTIVE">{t("opt.status.ACTIVE")}</option>
                        <option value="SUSPENDED">{t("admin.users.suspended")}</option>
                      </select>
                      <label className="flex items-center gap-1 text-xs font-medium">
                        <input type="checkbox" name="verified" defaultChecked={u.verified} className="h-4 w-4 rounded" />
                        {t("admin.users.verified")}
                      </label>
                      <button className="btn-primary btn-sm">{t("admin.users.save")}</button>
                    </form>
                  </td>
                ) : (
                  <td colSpan={canEdit ? 2 : 1} className="text-xs text-emerald-500">
                    {u.id === me.id ? t("admin.users.you") : `${t(`opt.role.${u.role}` as never)} · ${u.status === "SUSPENDED" ? t("admin.users.suspended") : t("opt.status.ACTIVE")}`}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
