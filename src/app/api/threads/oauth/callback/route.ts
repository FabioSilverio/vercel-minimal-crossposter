import { NextRequest, NextResponse } from "next/server";
import { exchangeThreadsCodeForToken, fetchThreadsUserByToken } from "@/lib/threads";

const STATE_COOKIE = "threads_oauth_state";
const RESULT_COOKIE = "threads_oauth_result";
const RESULT_MAX_AGE_SECONDS = 2 * 60;

type OAuthResult =
  | {
      ok: true;
      message: string;
      accessToken: string;
      user: {
        id: string;
        username: string;
      };
      tokenMeta: {
        apiVersion: string;
        isLongLived: boolean;
        expiresIn: number | null;
      };
    }
  | {
      ok: false;
      error: string;
    };

function getCallbackUri(request: NextRequest): string {
  return (
    process.env.THREADS_REDIRECT_URI?.trim() ||
    `${request.nextUrl.origin}/api/threads/oauth/callback`
  );
}

function encodeResult(payload: OAuthResult): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function finalizeRedirect(
  request: NextRequest,
  payload: OAuthResult,
): NextResponse {
  const response = NextResponse.redirect(new URL("/", request.url));
  const secure = request.nextUrl.protocol === "https:";

  response.cookies.set({
    name: RESULT_COOKIE,
    value: encodeResult(payload),
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: RESULT_MAX_AGE_SECONDS,
  });

  response.cookies.set({
    name: STATE_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });

  return response;
}

export async function GET(request: NextRequest) {
  const expectedState = request.cookies.get(STATE_COOKIE)?.value ?? "";
  const returnedState = request.nextUrl.searchParams.get("state") ?? "";
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const oauthError =
    request.nextUrl.searchParams.get("error_description") ??
    request.nextUrl.searchParams.get("error") ??
    "";

  if (oauthError) {
    return finalizeRedirect(request, {
      ok: false,
      error: `OAuth Threads retornou erro: ${oauthError}`,
    });
  }

  if (!expectedState || !returnedState || expectedState !== returnedState) {
    return finalizeRedirect(request, {
      ok: false,
      error: "Falha de seguranca no OAuth do Threads (state invalido).",
    });
  }

  if (!code) {
    return finalizeRedirect(request, {
      ok: false,
      error: "OAuth do Threads nao retornou code.",
    });
  }

  const appId = process.env.THREADS_APP_ID?.trim() ?? "";
  const appSecret = process.env.THREADS_APP_SECRET?.trim() ?? "";
  if (!appId || !appSecret) {
    return finalizeRedirect(request, {
      ok: false,
      error: "THREADS_APP_ID e THREADS_APP_SECRET nao configurados.",
    });
  }

  try {
    const redirectUri = getCallbackUri(request);
    const tokenData = await exchangeThreadsCodeForToken(
      code,
      redirectUri,
      appId,
      appSecret,
    );
    const user = await fetchThreadsUserByToken(tokenData.accessToken);

    return finalizeRedirect(request, {
      ok: true,
      message: `Conectado com Threads OAuth como @${user.username}.`,
      accessToken: tokenData.accessToken,
      user,
      tokenMeta: {
        apiVersion: tokenData.apiVersion,
        isLongLived: tokenData.isLongLived,
        expiresIn: tokenData.expiresIn,
      },
    });
  } catch (error) {
    return finalizeRedirect(request, {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Falha ao concluir OAuth do Threads.",
    });
  }
}
