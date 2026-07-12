import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { forgotPasswordAction } from "@/app/actions/auth";

export async function generateMetadata() {
  return { title: getT()("meta.forgot") };
}

export default async function ForgotPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const t = getT();

  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="text-center text-2xl font-black text-emerald-950">{t("auth.forgotTitle")}</h1>
        <p className="mt-1 text-center text-sm text-emerald-600">{t("auth.forgotSub")}</p>

        <form action={forgotPasswordAction} className="card mt-6 space-y-4 p-6">
          <div>
            <label className="label">{t("auth.email")}</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="input"
              placeholder={t("auth.emailPh")}
              dir="ltr"
            />
          </div>
          <button className="btn-primary w-full py-2.5">{t("auth.sendResetCode")}</button>
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
