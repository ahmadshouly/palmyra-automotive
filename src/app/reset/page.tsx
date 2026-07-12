import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { resetPasswordAction } from "@/app/actions/auth";

export async function generateMetadata() {
  return { title: getT()("meta.reset") };
}

export default async function ResetPage({
  searchParams,
}: {
  searchParams: { email?: string; error?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const t = getT();
  const email = searchParams.email ?? "";

  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="text-center text-2xl font-black text-emerald-950">{t("auth.resetTitle")}</h1>
        <p className="mt-1 text-center text-sm text-emerald-600">
          {t("auth.resetSub", { email })}
        </p>

        {searchParams.error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {searchParams.error}
          </div>
        )}

        <form action={resetPasswordAction} className="card mt-6 space-y-4 p-6">
          <input type="hidden" name="email" value={email} />
          <div>
            <label className="label">{t("auth.code")}</label>
            <input
              name="code"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              autoComplete="one-time-code"
              className="input text-center text-lg tracking-[0.5em]"
              placeholder={t("auth.otpPh")}
              dir="ltr"
            />
          </div>
          <div>
            <label className="label">{t("auth.newPassword")}</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="input"
              placeholder="••••••••"
              dir="ltr"
            />
          </div>
          <button className="btn-primary w-full py-2.5">{t("auth.resetBtn")}</button>
        </form>

        <p className="mt-4 text-center text-sm text-emerald-600">
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            {t("auth.backToSignIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
