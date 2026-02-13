import { NextResponse } from "next/server";
import { postToBluesky } from "@/lib/bluesky";
import { postToThreads } from "@/lib/threads";

type PostRequest = {
  text?: string;
  channels?: {
    bluesky?: boolean;
    threads?: boolean;
  };
  credentials?: {
    blueskyIdentifier?: string;
    blueskyAppPassword?: string;
    threadsUserId?: string;
    threadsAccessToken?: string;
  };
};

type ChannelResult = {
  ok: boolean;
  message: string;
  id?: string;
  uri?: string;
};

function pickCredential(custom?: string, env?: string): string {
  const value = (custom ?? env ?? "").trim();
  return value;
}

export async function POST(request: Request) {
  let payload: PostRequest;

  try {
    payload = (await request.json()) as PostRequest;
  } catch {
    return NextResponse.json(
      { error: "JSON invalido no corpo da requisicao." },
      { status: 400 },
    );
  }

  const text = payload.text?.trim() ?? "";
  const shouldPostBluesky = Boolean(payload.channels?.bluesky);
  const shouldPostThreads = Boolean(payload.channels?.threads);

  if (!text) {
    return NextResponse.json(
      { error: "O texto da postagem e obrigatorio." },
      { status: 400 },
    );
  }

  if (!shouldPostBluesky && !shouldPostThreads) {
    return NextResponse.json(
      { error: "Selecione pelo menos uma rede social." },
      { status: 400 },
    );
  }

  const results: {
    bluesky?: ChannelResult;
    threads?: ChannelResult;
  } = {};

  if (shouldPostBluesky) {
    const identifier = pickCredential(
      payload.credentials?.blueskyIdentifier,
      process.env.BLUESKY_IDENTIFIER,
    );
    const appPassword = pickCredential(
      payload.credentials?.blueskyAppPassword,
      process.env.BLUESKY_APP_PASSWORD,
    );

    if (!identifier || !appPassword) {
      results.bluesky = {
        ok: false,
        message:
          "Credenciais do Bluesky ausentes. Configure .env.local ou envie pelo formulario.",
      };
    } else {
      try {
        const output = await postToBluesky(text, {
          identifier,
          appPassword,
        });

        results.bluesky = {
          ok: true,
          message: "Publicado no Bluesky.",
          uri: output.uri,
        };
      } catch (error) {
        results.bluesky = {
          ok: false,
          message: error instanceof Error ? error.message : "Falha no Bluesky.",
        };
      }
    }
  }

  if (shouldPostThreads) {
    const userId = pickCredential(
      payload.credentials?.threadsUserId,
      process.env.THREADS_USER_ID,
    );
    const accessToken = pickCredential(
      payload.credentials?.threadsAccessToken,
      process.env.THREADS_ACCESS_TOKEN,
    );

    if (!userId || !accessToken) {
      results.threads = {
        ok: false,
        message:
          "Credenciais do Threads ausentes. Configure .env.local ou envie pelo formulario.",
      };
    } else {
      try {
        const output = await postToThreads(text, {
          userId,
          accessToken,
        });

        results.threads = {
          ok: true,
          message: "Publicado no Threads.",
          id: output.postId,
        };
      } catch (error) {
        results.threads = {
          ok: false,
          message: error instanceof Error ? error.message : "Falha no Threads.",
        };
      }
    }
  }

  const attempted = Object.values(results);
  const okCount = attempted.filter((item) => item?.ok).length;
  const failCount = attempted.filter((item) => item && !item.ok).length;

  let status = 200;
  if (okCount > 0 && failCount > 0) {
    status = 207;
  } else if (okCount === 0 && failCount > 0) {
    status = 400;
  }

  return NextResponse.json({ results }, { status });
}
