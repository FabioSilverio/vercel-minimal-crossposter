type ThreadsConfig = {
  userId?: string;
  accessToken: string;
};

type ThreadsResult = {
  creationId: string;
  postId: string;
};

type ThreadsApiResponse = {
  id?: string;
  error_description?: string;
  error?: {
    message?: string;
    error_user_msg?: string;
    error_user_title?: string;
  };
};

const THREADS_API_BASE = "https://graph.threads.net/v1.0";
const THREADS_TEXT_LIMIT = 500;

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  const raw = await response.text();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function resolveTargetUser(userId?: string): string {
  const normalized = (userId ?? "").trim();
  return normalized || "me";
}

function buildThreadsError(
  context: string,
  response: Response,
  data: ThreadsApiResponse | null,
): Error {
  const reason =
    data?.error?.error_user_msg ??
    data?.error?.message ??
    data?.error_description ??
    `HTTP ${response.status}`;

  return new Error(`${context}: ${reason}`);
}

export async function postToThreads(
  text: string,
  config: ThreadsConfig,
): Promise<ThreadsResult> {
  if (Array.from(text).length > THREADS_TEXT_LIMIT) {
    throw new Error(`Threads aceita no maximo ${THREADS_TEXT_LIMIT} caracteres.`);
  }

  const targetUser = resolveTargetUser(config.userId);

  const createPayload = new URLSearchParams({
    media_type: "TEXT",
    text,
  });

  const createResponse = await fetch(
    `${THREADS_API_BASE}/${targetUser}/threads?access_token=${encodeURIComponent(config.accessToken)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: createPayload.toString(),
      cache: "no-store",
    },
  );

  const createData = await parseJsonSafe<ThreadsApiResponse>(createResponse);
  if (!createResponse.ok || !createData?.id) {
    throw buildThreadsError("Falha ao criar postagem no Threads", createResponse, createData);
  }

  const publishPayload = new URLSearchParams({
    creation_id: createData.id,
  });

  const publishResponse = await fetch(
    `${THREADS_API_BASE}/${targetUser}/threads_publish?access_token=${encodeURIComponent(config.accessToken)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: publishPayload.toString(),
      cache: "no-store",
    },
  );

  const publishData = await parseJsonSafe<ThreadsApiResponse>(publishResponse);
  if (!publishResponse.ok || !publishData?.id) {
    throw buildThreadsError(
      "Falha ao publicar postagem no Threads",
      publishResponse,
      publishData,
    );
  }

  return {
    creationId: createData.id,
    postId: publishData.id,
  };
}
