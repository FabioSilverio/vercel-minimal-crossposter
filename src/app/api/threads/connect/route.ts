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
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao validar token do Threads.";
    const actionableMessage = message.includes("Token invalido")
      ? `${message} Gere um novo token de usuario no produto Threads API e confirme as permissoes threads_basic e threads_content_publish.`
      : message;

    return NextResponse.json(
      {
        ok: false,
        error: actionableMessage,
      },
      { status: 400 },
    );
  }
}
