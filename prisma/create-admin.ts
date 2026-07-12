import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = "admin@palmyra.auto";
  const password = "Passw0rd!";

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
