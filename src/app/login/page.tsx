import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getT } from "@/lib/i18n";
import { loginAction } from "@/app/actions/auth";

export async function generateMetadata() {
  return { title: getT()("meta.signIn") };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string; reset?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const settings = await getSettings();
  const t = getT();

  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="text-center text-2xl font-black text-emerald-950">{t("auth.welcome")}</h1>
        <p className="mt-1 text-center text-sm text-emerald-600">
          {t("auth.signInSub", { name: settings.siteName })}
        </p>

        {searchParams.reset && !searchParams.error && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {t("auth.resetDone")}
          </div>
        )}

        {searchParams.error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {searchParams.error}
          </div>
        )}

        <form action={loginAction} className="card mt-6 space-y-4 p-6">
          <input type="hidden" name="next" value={searchParams.next ?? "/dashboard"} />
          <div>
            <label className="label">{t("auth.email")}</label>
            <input name="email" type="email" required autoComplete="email" className="input" placeholder={t("auth.emailPh")} dir="ltr" />
          </div>
          <div>
            <label className="label">{t("auth.password")}</label>
            <input name="password" type="password" required autoComplete="current-password" className="input" placeholder="••••••••" dir="ltr" />
          </div>
          <div className="text-end">
            <Link href="/forgot" className="text-sm font-semibold text-brand-600 hover:underline">
              {t("auth.forgot")}
            </Link>
          </div>
          <button className="btn-primary w-full py-2.5">{t("auth.signIn")}</button>
        </form>

        <p className="mt-4 text-center text-sm text-emerald-600">
          {t("auth.newHere")}{" "}
          <Link href="/register" className="font-semibold text-brand-600 hover:underline">
            {t("auth.createAccount")}
          </Link>
        </p>
      </div>
    </div>
  );
}
