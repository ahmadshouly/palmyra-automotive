import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { verifyAction, resendVerifyAction } from "@/app/actions/auth";

export async function generateMetadata() {
  return { title: getT()("meta.verify") };
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: { email?: string; error?: string; sent?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const t = getT();
  const email = searchParams.email ?? "";

  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="text-center text-2xl font-black text-emerald-950">{t("auth.verifyTitle")}</h1>
        <p className="mt-1 text-center text-sm text-emerald-600">
          {t("auth.verifySub", { email })}
        </p>

        {searchParams.error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {searchParams.error}
          </div>
        )}
        {searchParams.sent && !searchParams.error && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {t("auth.otpSent")}
          </div>
        )}

        <form action={verifyAction} className="card mt-6 space-y-4 p-6">
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
          <button className="btn-primary w-full py-2.5">{t("auth.verifyBtn")}</button>
        </form>

        <form action={resendVerifyAction} className="mt-4 text-center">
          <input type="hidden" name="email" value={email} />
          <button className="text-sm font-semibold text-brand-600 hover:underline">
            {t("auth.otpResend")}
          </button>
        </form>

        <p className="mt-2 text-center text-sm text-emerald-600">
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            {t("auth.backToSignIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
