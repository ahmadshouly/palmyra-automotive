import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@palmyra.auto").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Passw0rd!";

  if (!process.env.ADMIN_PASSWORD) {
    console.warn("⚠  ADMIN_PASSWORD not set — using the default demo password. Change it after first login.");
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Admin user already exists.");
    return;
  }

  await db.user.create({
    data: {
      name: "Administrator",
      email,
      passwordHash: bcrypt.hashSync(password, 10),
      role: "ADMIN",
      verified: true,
    },
  });

  console.log(`Admin created: ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
