import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("Seeding site settings…");

  // ---- Site settings (brand name lives here, never in code) ----
  const settings: Record<string, string> = {
    siteName: "Nahda Motors",
    tagline: "The trusted marketplace for your next car",
    taglineAr: "\u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0645\u0648\u062b\u0648\u0642 \u0644\u0633\u064a\u0627\u0631\u062a\u0643 \u0627\u0644\u0642\u0627\u062f\u0645\u0629",
    bannerPath: "/assets/banner.jpeg",
    heroHeadline: "Find your perfect car",
    heroHeadlineAr: "\u0627\u0639\u062b\u0631 \u0639\u0644\u0649 \u0633\u064a\u0627\u0631\u062a\u0643 \u0627\u0644\u0645\u062b\u0627\u0644\u064a\u0629",
    heroSubheadline: "Verified sellers, inspected vehicles, secure payments and nationwide delivery.",
    heroSubheadlineAr:
      "\u0628\u0627\u0626\u0639\u0648\u0646 \u0645\u0648\u062b\u0651\u0642\u0648\u0646\u060c \u0633\u064a\u0627\u0631\u0627\u062a \u0645\u0641\u062d\u0648\u0635\u0629\u060c \u0645\u062f\u0641\u0648\u0639\u0627\u062a \u0622\u0645\u0646\u0629 \u0648\u062a\u0648\u0635\u064a\u0644 \u0644\u062c\u0645\u064a\u0639 \u0627\u0644\u0645\u0646\u0627\u0637\u0642.",
    transactionFeePct: "4",
    currency: "USD",
    supportEmail: "support@nahdamotors.example",
    maintenanceMode: "0",
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.siteSetting.upsert({ where: { key }, create: { key, value }, update: {} });
  }

  console.log("Seed complete. Site settings preserved; no demo users or listings created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
