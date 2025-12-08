import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { GET, POST } from "./route";
import { resetDatabase } from "@/lib/test-utils";

const mockReq = (body?: any, headers?: Record<string, string>) =>
  new NextRequest("http://localhost/api/events", {
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
    headers,
  });

describe("/api/events", () => {
  beforeEach(async () => {
    await resetDatabase();
    await prisma.family.create({
      data: {
        id: "fam1",
        name: "Test Family",
        members: { create: [{ id: "m1", name: "Child", role: "child" }] },
      },
    });
  });

  it("requires familyId header", async () => {
    const res = await GET(mockReq());
    expect(res.status).toBe(400);
  });

  it("creates and lists events", async () => {
    const createRes = await POST(
      mockReq(
        {
          title: "Exam",
          startAt: "2024-01-01T10:00:00Z",
          endAt: "2024-01-01T12:00:00Z",
          type: "exam",
          importance: "must",
          participantIds: ["m1"],
        },
        { "x-family-id": "fam1" },
      ),
    );
    expect(createRes.status).toBe(201);

    const listRes = await GET(mockReq(undefined, { "x-family-id": "fam1" }));
    const data = await listRes.json();
    expect(data.length).toBe(1);
    expect(data[0].participants.length).toBe(1);
  });
});
