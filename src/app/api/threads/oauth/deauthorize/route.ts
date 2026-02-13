import { NextResponse } from "next/server";

// Meta may call this when a user removes the app connection.
// We do not persist user data server-side; credentials are stored client-side.
export async function POST() {
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
