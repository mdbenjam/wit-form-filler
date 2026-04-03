import { prisma } from "./db";
import { cookies } from "next/headers";

const SESSION_COOKIE = "google_session";

export async function getSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Loads a valid Google access token for the current session.
 * Refreshes the token if expired and a refresh token is available.
 * Returns null if no session or token refresh fails.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const sessionId = await getSessionId();
  if (!sessionId) return null;

  const auth = await prisma.googleAuth.findUnique({ where: { sessionId } });
  if (!auth) return null;

  // Token still valid (with 60s buffer)
  if (auth.expiresAt.getTime() > Date.now() + 60_000) {
    return auth.accessToken;
  }

  // Try to refresh
  if (!auth.refreshToken) return null;

  const refreshed = await refreshAccessToken(auth.refreshToken);
  if (!refreshed) return null;

  await prisma.googleAuth.update({
    where: { id: auth.id },
    data: {
      accessToken: refreshed.accessToken,
      expiresAt: refreshed.expiresAt,
    },
  });

  return refreshed.accessToken;
}

async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: Date } | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}
