import { NextRequest, NextResponse } from "next/server";

const RESULT_COOKIE = "threads_oauth_result";

type OAuthSessionPayload = {
  ok: boolean;
  error?: string;
  message?: string;
  accessToken?: string;
  user?: {
    id: string;
    username: string;
  };
  tokenMeta?: {
    apiVersion: string;
    isLongLived: boolean;
    expiresIn: number | null;
  };
};

function decodeResult(value: string): OAuthSessionPayload | null {
  try {
    const raw = Buffer.from(value, "base64url").toString("utf8");
    return JSON.parse(raw) as OAuthSessionPayload;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const cookieValue = request.cookies.get(RESULT_COOKIE)?.value;
  const secure = request.nextUrl.protocol === "https:";

  const clearCookie = (response: NextResponse) => {
    response.cookies.set({
      name: RESULT_COOKIE,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 0,
    });
    return response;
  };

  if (!cookieValue) {
    return clearCookie(
      NextResponse.json({ ok: false, empty: true }, { status: 200 }),
    );
  }

  const decoded = decodeResult(cookieValue);
  if (!decoded) {
    return clearCookie(
      NextResponse.json(
        {
          ok: false,
          error: "Nao foi possivel ler resultado do OAuth do Threads.",
        },
        { status: 400 },
      ),
    );
  }

  return clearCookie(
    NextResponse.json(decoded, { status: decoded.ok ? 200 : 400 }),
  );
}
