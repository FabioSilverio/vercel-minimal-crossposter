import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

type SignedRequestPayload = {
  user_id?: string;
  oauth_token?: string;
  issued_at?: number;
};

function base64UrlDecodeToBuffer(input: string): Buffer {
  const padLength = (4 - (input.length % 4)) % 4;
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLength);
  return Buffer.from(padded, "base64");
}

function base64UrlDecodeToJson<T>(input: string): T {
  const buf = base64UrlDecodeToBuffer(input);
  return JSON.parse(buf.toString("utf8")) as T;
}

function verifySignedRequest(signedRequest: string, appSecret: string): SignedRequestPayload | null {
  const parts = signedRequest.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [encodedSig, encodedPayload] = parts;
  const payload = base64UrlDecodeToJson<{ algorithm?: string } & SignedRequestPayload>(
    encodedPayload,
  );

  if (payload.algorithm && payload.algorithm.toUpperCase() !== "HMAC-SHA256") {
    return null;
  }

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(encodedPayload, "utf8")
    .digest();
  const actual = base64UrlDecodeToBuffer(encodedSig);

  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return null;
  }

  return payload;
}

function getAppOrigin(request: NextRequest): string {
  return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  const appSecret = process.env.THREADS_APP_SECRET?.trim() ?? "";
  if (!appSecret) {
    return NextResponse.json(
      { error: "THREADS_APP_SECRET nao configurado." },
      { status: 500 },
    );
  }

  const form = await request.formData();
  const signedRequest = String(form.get("signed_request") ?? "").trim();
  if (!signedRequest) {
    return NextResponse.json(
      { error: "signed_request ausente." },
      { status: 400 },
    );
  }

  const payload = verifySignedRequest(signedRequest, appSecret);
  if (!payload) {
    return NextResponse.json(
      { error: "signed_request invalido." },
      { status: 400 },
    );
  }

  const confirmationCode = crypto.randomBytes(12).toString("hex");
  const statusUrl = new URL("/threads/data-deletion", getAppOrigin(request));
  statusUrl.searchParams.set("code", confirmationCode);
  if (payload.user_id) {
    statusUrl.searchParams.set("user_id", payload.user_id);
  }

  // We do not store user data server-side. This endpoint exists to satisfy Meta's callback contract.
  return NextResponse.json(
    {
      url: statusUrl.toString(),
      confirmation_code: confirmationCode,
    },
    { status: 200 },
  );
}

export async function GET(request: NextRequest) {
  const url = new URL("/threads/data-deletion", getAppOrigin(request));
  return NextResponse.json({ ok: true, status_url: url.toString() }, { status: 200 });
}
