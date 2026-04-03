import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateB64 = request.nextUrl.searchParams.get("state");

  if (!code || !stateB64) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }

  let state: { sessionId: string; returnTo: string };
  try {
    state = JSON.parse(Buffer.from(stateB64, "base64").toString("utf-8"));
  } catch {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("Token exchange failed:", err);
    return NextResponse.json({ error: "Token exchange failed" }, { status: 500 });
  }

  const tokens = await tokenRes.json();

  // Fetch user email
  let email: string | null = null;
  try {
    const userInfoRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    if (userInfoRes.ok) {
      const userInfo = await userInfoRes.json();
      email = userInfo.email ?? null;
    }
  } catch {
    // Non-critical, continue without email
  }

  // Upsert GoogleAuth record
  await prisma.googleAuth.upsert({
    where: { sessionId: state.sessionId },
    create: {
      sessionId: state.sessionId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      email,
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? undefined,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      email,
    },
  });

  return NextResponse.redirect(`${baseUrl}${state.returnTo}`);
}
