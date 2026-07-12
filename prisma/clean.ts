import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Cleaning demo data…");

  // Delete engagement data first (foreign keys)
  await db.message.deleteMany();
  await db.conversation.deleteMany();
  await db.offer.deleteMany();
  await db.favorite.deleteMany();
  await db.testDrive.deleteMany();
  await db.inspection.deleteMany();
  await db.savedSearch.deleteMany();
  await db.auditLog.deleteMany();

  // Delete listings
  const listings = await db.listing.deleteMany();
  console.log(`Deleted ${listings.count} listings.`);

  // Delete all users (site settings are stored separately)
  const users = await db.user.deleteMany();
  console.log(`Deleted ${users.count} users.`);

  console.log("Database cleaned. Site settings preserved.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
