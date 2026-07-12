import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getLocale, getT } from "@/lib/i18n";
import SellForm from "@/components/SellForm";

export async function generateMetadata() {
  return { title: getT()("meta.sell") };
}
export const dynamic = "force-dynamic";

export default async function SellPage({ searchParams }: { searchParams: { error?: string } }) {
  // Only administrators may add car listings.
  await requireUser(["ADMIN"]);
  const settings = await getSettings();
  const locale = getLocale();
  const t = getT();

  return (
    <div className="container-page max-w-4xl py-10">
      <h1 className="text-3xl font-black text-emerald-950">{t("sell.title", { name: settings.siteName })}</h1>
      <p className="mt-2 text-emerald-600">{t("sell.sub")}</p>
      <div className="mt-8">
        <SellForm error={searchParams.error} locale={locale} />
      </div>
    </div>
  );
}
