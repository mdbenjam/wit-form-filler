import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/google-auth";
import { parseGoogleEvents, sortCalendarEvents } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "date parameter required (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const tz = "America/New_York";
  const offset = getTimezoneOffsetString(date, tz);
  const timeMin = `${date}T00:00:00${offset}`;
  const timeMax = `${date}T23:59:59${offset}`;

  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events"
  );
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeZone", tz);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    if (res.status === 401) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 502 }
    );
  }

  const data = await res.json();
  const events = sortCalendarEvents(parseGoogleEvents(data.items ?? []));
  return NextResponse.json(events);
}

/**
 * Computes the UTC offset string (e.g. "-04:00") for a given date in a given
 * IANA timezone. Uses Intl to avoid any external dependencies.
 */
function getTimezoneOffsetString(dateStr: string, timeZone: string): string {
  // Use noon UTC to avoid DST boundary edge cases
  const probe = new Date(`${dateStr}T12:00:00Z`);
  const utcStr = probe.toLocaleString("en-US", { timeZone: "UTC", hour12: false });
  const localStr = probe.toLocaleString("en-US", { timeZone, hour12: false });
  const offsetMs = new Date(localStr).getTime() - new Date(utcStr).getTime();
  const offsetMin = offsetMs / 60_000;
  const sign = offsetMin >= 0 ? "+" : "-";
  const absMin = Math.abs(offsetMin);
  const h = String(Math.floor(absMin / 60)).padStart(2, "0");
  const m = String(absMin % 60).padStart(2, "0");
  return `${sign}${h}:${m}`;
}
