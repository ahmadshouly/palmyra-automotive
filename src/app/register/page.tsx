import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getT } from "@/lib/i18n";
import { registerAction } from "@/app/actions/auth";

export async function generateMetadata() {
  return { title: getT()("meta.register") };
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const settings = await getSettings();
  const t = getT();

  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-lg">
        <h1 className="text-center text-2xl font-black text-emerald-950">{t("auth.join", { name: settings.siteName })}</h1>
        <p className="mt-1 text-center text-sm text-emerald-600">{t("auth.joinSub")}</p>

        {searchParams.error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {searchParams.error}
          </div>
        )}

        <form action={registerAction} className="card mt-6 space-y-4 p-6">
          <div>
            <label className="label">{t("auth.fullName")}</label>
            <input name="name" required minLength={2} className="input" placeholder={t("auth.namePh")} />
          </div>
          <div>
            <label className="label">{t("auth.email")}</label>
            <input name="email" type="email" required autoComplete="email" className="input" placeholder={t("auth.emailPh")} dir="ltr" />
          </div>
          <div>
            <label className="label">{t("auth.passwordMin")}</label>
            <input name="password" type="password" required minLength={8} autoComplete="new-password" className="input" placeholder="••••••••" dir="ltr" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">{t("auth.city")}</label>
              <input name="city" className="input" placeholder={t("auth.cityPh")} />
            </div>
            <div>
              <label className="label">{t("auth.state")}</label>
              <input name="state" className="input" placeholder={t("auth.statePh")} />
            </div>
          </div>
          <button className="btn-primary w-full py-2.5">{t("auth.register")}</button>
        </form>

        <p className="mt-4 text-center text-sm text-emerald-600">
          {t("auth.already")}{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            {t("auth.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
