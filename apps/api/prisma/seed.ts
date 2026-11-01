// Development seed: roles, the default approval workflow and FICTIONAL staff accounts.
// Students are not seeded: they are created on their first (mock) Platonus login.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import type { RoleName } from "../src/generated/prisma/enums.js";
import { DEFAULT_WORKFLOW } from "../src/workflow/workflow-rules.js";

const ROLES: RoleName[] = ["STUDENT", "SPECIALIST", "ACCOUNTANT", "AUTHORIZED_SIGNER", "SYSTEM_ADMIN"];

const TEST_STAFF: { externalUserId: string; displayName: string; jobTitle: string; email: string; roles: RoleName[] }[] = [
  {
    externalUserId: "staff-specialist",
    displayName: "Тестова Әсем",
    jobTitle: "Тіркеу бөлімінің маманы (ТЕСТ)",
    email: "specialist@test.local",
    roles: ["SPECIALIST"],
  },
  {
    externalUserId: "staff-accountant",
    displayName: "Тестов Ерлан",
    jobTitle: "Бухгалтер (ТЕСТ)",
    email: "accountant@test.local",
    roles: ["ACCOUNTANT"],
  },
  {
    externalUserId: "staff-signer",
    displayName: "Тестова Гүлнар",
    jobTitle: "Академиялық мәселелер жөніндегі проректор (ТЕСТ)",
    email: "signer@test.local",
    roles: ["AUTHORIZED_SIGNER"],
  },
  {
    externalUserId: "staff-admin",
    displayName: "Тестов Арман",
    jobTitle: "Жүйе әкімшісі (ТЕСТ)",
    email: "admin@test.local",
    roles: ["SYSTEM_ADMIN"],
  },
];

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The development seed must not run in production");
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    for (const name of ROLES) {
      await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
    }

    const defaultSteps = await prisma.workflowStep.count({ where: { certificateType: null } });
    if (defaultSteps === 0) {
      await prisma.workflowStep.createMany({
        data: DEFAULT_WORKFLOW.map((step, index) => ({ certificateType: null, stepOrder: index, role: step.role, name: step.name })),
      });
    }

    for (const staff of TEST_STAFF) {
      const user = await prisma.user.upsert({
        where: { authProvider_externalUserId: { authProvider: "mock", externalUserId: staff.externalUserId } },
        update: { displayName: staff.displayName, jobTitle: staff.jobTitle, email: staff.email },
        create: {
          authProvider: "mock",
          externalUserId: staff.externalUserId,
          displayName: staff.displayName,
          jobTitle: staff.jobTitle,
          email: staff.email,
        },
      });
      const roles = await prisma.role.findMany({ where: { name: { in: staff.roles } } });
      await prisma.userRole.createMany({
        data: roles.map((role) => ({ userId: user.id, roleId: role.id })),
        skipDuplicates: true,
      });
    }

    console.log(`Seeded ${ROLES.length} roles, default workflow and ${TEST_STAFF.length} fictional staff accounts.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
