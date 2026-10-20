import { auditPersistedGuides } from "@/lib/db";

async function main(): Promise<void> {
  const count = await auditPersistedGuides();
  console.info(`Audited ${count} persisted guide records.`);
}

void main();
