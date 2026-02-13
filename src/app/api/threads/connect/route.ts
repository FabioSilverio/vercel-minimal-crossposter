import { NextResponse } from "next/server";
import { fetchThreadsUserByToken } from "@/lib/threads";

type ConnectRequest = {
  accessToken?: string;
};

export async function POST(request: Request) {
  let payload: ConnectRequest;

  try {
    payload = (await request.json()) as ConnectRequest;
  } catch {
    return NextResponse.json(
      { error: "JSON invalido no corpo da requisicao." },
      { status: 400 },
    );
  }

  const accessToken = payload.accessToken?.trim() ?? "";
  if (!accessToken) {
    return NextResponse.json(
      { error: "Informe o token do Threads." },
      { status: 400 },
    );
  }

  try {
    const user = await fetchThreadsUserByToken(accessToken);
    return NextResponse.json(
      {
        ok: true,
        user,
        message: `Conectado como @${user.username}.`,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao validar token do Threads.",
      },
      { status: 400 },
    );
  }
}
