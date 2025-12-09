/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient, Role, EventType, Importance, TaskStatus } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const family = await prisma.family.upsert({
    where: { name: "Demo Family" },
    update: {},
    create: {
      name: "Demo Family",
      members: {
        create: [
          { name: "Parent A", role: Role.parent },
          { name: "Child A", role: Role.child, grade: "G9" },
        ],
      },
    },
    include: { members: true },
  });

  const parent = family.members.find((m) => m.role === Role.parent);
  const child = family.members.find((m) => m.role === Role.child);

  const examEvent = await prisma.event.create({
    data: {
      familyId: family.id,
      title: "Mock Exam",
      startAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      type: EventType.exam,
      importance: Importance.must,
      location: "City Hall",
      participants: {
        create: [
          { memberId: child?.id ?? "" },
          { memberId: parent?.id ?? "" },
        ].filter((p) => p.memberId),
      },
      tasks: {
        create: [
          {
            title: "Submit application",
            status: TaskStatus.not_started,
            dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
            assigneeId: parent?.id,
          },
          {
            title: "Print exam ticket",
            status: TaskStatus.not_started,
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            assigneeId: parent?.id,
          },
        ],
      },
      notes: {
        create: [{ content: "Arrive 30 minutes early", createdBy: parent?.id }],
      },
    },
  });

  console.log("Seed completed: family=%s event=%s", family.id, examEvent.id);

  // Templates
  await prisma.template.deleteMany({});
  const mockTemplate = await prisma.template.create({
    data: {
      name: "模試準備テンプレ",
      description: "申込・支払・受験票印刷・持ち物準備",
      eventType: EventType.exam,
      tasks: {
        create: [
          { title: "模試申込", daysBeforeEvent: 14 },
          { title: "受験料支払", daysBeforeEvent: 10 },
          { title: "受験票印刷", daysBeforeEvent: 3 },
          { title: "持ち物準備", daysBeforeEvent: 1 },
        ],
      },
    },
  });
  console.log("Template created:", mockTemplate.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
