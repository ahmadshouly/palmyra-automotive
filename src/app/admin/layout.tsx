import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getLocale, getT } from "@/lib/i18n";
import { dirFor } from "@/lib/dictionary";

export const metadata = { title: "Admin" };

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/listings", label: "Listing moderation" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/inspections", label: "Inspections" },
  { href: "/admin/settings", label: "Site settings" },
  { href: "/admin/audit", label: "Audit log" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireUser(["ADMIN", "MODERATOR"]), getSettings()]);
  const locale = getLocale();
  const t = getT();
  const dir = dirFor(locale);

  const nav = [
    { href: "/admin", label: t("admin.nav.overview") },
    { href: "/admin/listings", label: t("admin.nav.listings") },
    { href: "/admin/users", label: t("admin.nav.users") },
    { href: "/admin/inspections", label: t("admin.nav.inspections") },
    { href: "/admin/settings", label: t("admin.nav.settings") },
    { href: "/admin/audit", label: t("admin.nav.audit") },
  ];

  return (
    <div dir={dir} className="container-page grid gap-8 py-10 lg:grid-cols-[230px_1fr]">
      <aside>
        <div className="card sticky top-20 p-4">
          <p className="px-2 text-xs font-bold uppercase tracking-widest text-emerald-600">
            {t("admin.siteNameAdmin", { name: settings.siteName })}
          </p>
          <p className="px-2 pb-3 pt-1 text-xs text-emerald-500">
            {user.name} · {user.role === "ADMIN" ? t("admin.role.administrator") : t("admin.role.moderator")}
          </p>
          <nav className="space-y-1">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-brand-50 hover:text-brand-700"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
