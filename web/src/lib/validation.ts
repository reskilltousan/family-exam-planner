import { Importance, EventType, Role, TaskStatus } from "@prisma/client";
import { z } from "zod";

const isoDate = z
  .string()
  .refine((val) => !Number.isNaN(Date.parse(val)), { message: "Invalid date format" })
  .transform((val) => new Date(val));

export const memberSchema = z.object({
  name: z.string().min(1),
  role: z.nativeEnum(Role),
  grade: z.string().optional(),
});

export const memberUpdateSchema = memberSchema.extend({
  id: z.string().min(1),
});

export const memberIdSchema = z.object({
  id: z.string().min(1),
});

export const familySchema = z.object({
  name: z.string().min(1),
});

export const eventSchema = z
  .object({
    title: z.string().min(1),
    startAt: isoDate,
    endAt: isoDate,
    type: z.nativeEnum(EventType),
    importance: z.nativeEnum(Importance),
    location: z.string().optional(),
    note: z.string().optional(),
    participantIds: z.array(z.string()).default([]),
    templateId: z.string().optional(),
  })
  .refine((data) => data.endAt > data.startAt, {
    message: "endAt must be after startAt",
    path: ["endAt"],
  });

export const taskSchema = z.object({
  title: z.string().min(1),
  dueDate: isoDate.optional(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.not_started),
  assigneeId: z.string().optional(),
});

export const taskUpdateSchema = taskSchema.extend({
  id: z.string().min(1),
});

export const templateTaskSchema = z.object({
  title: z.string().min(1),
  daysBeforeEvent: z.number().int().optional().nullable(),
});

export const templateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  eventType: z.nativeEnum(EventType).optional(),
  tasks: z.array(templateTaskSchema).optional(),
});

export const templateUpdateSchema = templateSchema.extend({
  id: z.string().min(1),
});
