import prisma from "./db";

export async function resetDatabase() {
  await prisma.eventNote.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.eventParticipant.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.member.deleteMany({});
  await prisma.family.deleteMany({});
  await prisma.oAuthToken.deleteMany({});
  await prisma.externalEvent.deleteMany({});
}
