import { google } from "googleapis";
import prisma from "@/lib/db";

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth env vars are required");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(familyId: string) {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.readonly"],
    prompt: "consent",
    state: familyId,
  });
}

export async function exchangeCodeForTokens(code: string, familyId: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) throw new Error("No access token");

  await prisma.oAuthToken.upsert({
    where: { familyId_provider: { familyId, provider: "google" } },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
    create: {
      familyId,
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
  });
}

export async function fetchExternalEvents(familyId: string, timeMin?: string, timeMax?: string) {
  const token = await prisma.oAuthToken.findFirst({
    where: { familyId, provider: "google" },
  });
  if (!token) throw new Error("No token for family");

  const client = getOAuthClient();
  client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken ?? undefined,
    expiry_date: token.expiresAt?.getTime(),
  });

  const calendar = google.calendar({ version: "v3", auth: client });
  const { data } = await calendar.events.list({
    calendarId: "primary",
    singleEvents: true,
    orderBy: "startTime",
    timeMin: timeMin ?? new Date().toISOString(),
    timeMax: timeMax,
  });

  const items =
    data.items?.map((item) => ({
      externalId: item.id ?? "",
      title: item.summary ?? "(No title)",
      startAt: item.start?.dateTime ?? item.start?.date ?? "",
      endAt: item.end?.dateTime ?? item.end?.date ?? "",
      location: item.location,
      organizer: item.organizer?.email ?? item.organizer?.displayName ?? undefined,
    })) ?? [];

  // Persist external events (upsert)
  for (const ev of items) {
    if (!ev.externalId || !ev.startAt || !ev.endAt) continue;
    await prisma.externalEvent.upsert({
      where: { familyId_source_externalId: { familyId, source: "google", externalId: ev.externalId } },
      update: {
        title: ev.title,
        startAt: new Date(ev.startAt),
        endAt: new Date(ev.endAt),
        location: ev.location ?? null,
        organizer: ev.organizer ?? null,
        lastSyncedAt: new Date(),
      },
      create: {
        familyId,
        source: "google",
        externalId: ev.externalId,
        title: ev.title,
        startAt: new Date(ev.startAt),
        endAt: new Date(ev.endAt),
        location: ev.location ?? null,
        organizer: ev.organizer ?? null,
      },
    });
  }

  return items;
}
