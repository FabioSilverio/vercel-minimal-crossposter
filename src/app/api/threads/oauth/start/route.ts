import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildThreadsAuthorizeUrl } from "@/lib/threads";

const STATE_COOKIE = "threads_oauth_state";
const RESULT_COOKIE = "threads_oauth_result";
const STATE_MAX_AGE_SECONDS = 10 * 60;
const RESULT_MAX_AGE_SECONDS = 2 * 60;

function getCallbackUri(request: NextRequest): string {
  return (
    process.env.THREADS_REDIRECT_URI?.trim() ||
    `${request.nextUrl.origin}/api/threads/oauth/callback`
  );
}

function encodeResult(payload: object): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function redirectWithError(request: NextRequest, message: string): NextResponse {
  const response = NextResponse.redirect(new URL("/", request.url));
  const secure = request.nextUrl.protocol === "https:";

  response.cookies.set({
    name: RESULT_COOKIE,
    value: encodeResult({ ok: false, error: message }),
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: RESULT_MAX_AGE_SECONDS,
  });

  return response;
}

export async function GET(request: NextRequest) {
  const appId = process.env.THREADS_APP_ID?.trim() ?? "";
  const appSecret = process.env.THREADS_APP_SECRET?.trim() ?? "";

  if (!appId || !appSecret) {
    return redirectWithError(
      request,
      "THREADS_APP_ID e THREADS_APP_SECRET nao configurados no servidor.",
    );
  }

  const state = `${crypto.randomUUID()}${crypto.randomBytes(12).toString("hex")}`;
  const redirectUri = getCallbackUri(request);
  const authorizeUrl = buildThreadsAuthorizeUrl({
    clientId: appId,
    redirectUri,
    state,
  });

  const response = NextResponse.redirect(authorizeUrl);
  const secure = request.nextUrl.protocol === "https:";

  response.cookies.set({
    name: STATE_COOKIE,
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: STATE_MAX_AGE_SECONDS,
  });

  return response;
}
