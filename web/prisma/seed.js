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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
