import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { saveSettingsAction } from "@/app/actions/admin";
import { getT } from "@/lib/i18n";

export const metadata = { title: "Site settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireUser(["ADMIN"]);
  const settings = await getSettings();
  const t = getT();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black text-emerald-950">{t("admin.settings.title")}</h1>
      <p className="mt-1 text-sm text-emerald-600">
        {t("admin.settings.sub")}
      </p>

      <form action={saveSettingsAction} className="card mt-6 space-y-5 p-6">
        <div>
          <label className="label">{t("admin.settings.siteName")}</label>
          <input name="siteName" defaultValue={settings.siteName} required className="input" />
          <p className="mt-1 text-xs text-emerald-500">
            {t("admin.settings.siteNameHint")}
          </p>
        </div>
        <div>
          <label className="label">{t("admin.settings.tagline")}</label>
          <input name="tagline" defaultValue={settings.tagline} className="input" />
        </div>
        <div>
          <label className="label">{t("admin.settings.taglineAr")}</label>
          <input name="taglineAr" defaultValue={settings.taglineAr} dir="rtl" className="input" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t("admin.settings.heroHeadline")}</label>
            <input name="heroHeadline" defaultValue={settings.heroHeadline} className="input" />
          </div>
          <div>
            <label className="label">{t("admin.settings.heroSubheadline")}</label>
            <input name="heroSubheadline" defaultValue={settings.heroSubheadline} className="input" />
          </div>
          <div>
            <label className="label">{t("admin.settings.heroHeadlineAr")}</label>
            <input name="heroHeadlineAr" defaultValue={settings.heroHeadlineAr} dir="rtl" className="input" />
          </div>
          <div>
            <label className="label">{t("admin.settings.heroSubheadlineAr")}</label>
            <input name="heroSubheadlineAr" defaultValue={settings.heroSubheadlineAr} dir="rtl" className="input" />
          </div>
        </div>

        <div>
          <label className="label">{t("admin.settings.banner")}</label>
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={settings.bannerPath} alt={t("admin.settings.bannerCurrent")} className="h-20 w-36 rounded-lg border border-emerald-100 object-cover" />
            <div className="flex-1 space-y-2">
              <input name="bannerPath" defaultValue={settings.bannerPath} className="input" placeholder={t("admin.settings.bannerPathPh")} />
              <input name="bannerFile" type="file" accept="image/jpeg,image/png,image/webp" className="input file:me-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white" />
              <p className="text-xs text-emerald-500">{t("admin.settings.bannerHint")}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">{t("admin.settings.transactionFee")}</label>
            <input name="transactionFeePct" type="number" step="0.1" min={0} max={50} defaultValue={settings.transactionFeePct} className="input" />
          </div>
          <div>
            <label className="label">{t("admin.settings.currency")}</label>
            <input name="currency" defaultValue={settings.currency} maxLength={3} className="input uppercase" />
          </div>
          <div>
            <label className="label">{t("admin.settings.supportEmail")}</label>
            <input name="supportEmail" type="email" defaultValue={settings.supportEmail} className="input" />
          </div>
          <div>
            <label className="label">{t("admin.settings.whatsapp")}</label>
            <input name="whatsappNumber" defaultValue={settings.whatsappNumber} className="input" placeholder={t("admin.settings.whatsappPh")} dir="ltr" />
            <p className="mt-1 text-xs text-emerald-600">{t("admin.settings.whatsappHint")}</p>
          </div>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          <input type="checkbox" name="maintenanceMode" defaultChecked={settings.maintenanceMode === "1"} className="h-4 w-4 rounded" />
          {t("admin.settings.maintenanceMode")}
        </label>

        <button className="btn-primary w-full py-2.5">{t("admin.settings.save")}</button>
      </form>
    </div>
  );
}
