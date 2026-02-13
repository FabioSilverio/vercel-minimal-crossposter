type ThreadsConfig = {
  userId: string;
  accessToken: string;
};

type ThreadsResult = {
  creationId: string;
  postId: string;
};

type ThreadsApiResponse = {
  id?: string;
  error?: {
    message?: string;
  };
};

const THREADS_API_BASE = "https://graph.threads.net/v1.0";

export async function postToThreads(
  text: string,
  config: ThreadsConfig,
): Promise<ThreadsResult> {
  const createPayload = new URLSearchParams({
    media_type: "TEXT",
    text,
    access_token: config.accessToken,
  });

  const createResponse = await fetch(`${THREADS_API_BASE}/${config.userId}/threads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: createPayload.toString(),
    cache: "no-store",
  });

  const createData = (await createResponse.json()) as ThreadsApiResponse;
  if (!createResponse.ok || !createData.id) {
    throw new Error(createData.error?.message ?? "Falha ao criar postagem no Threads.");
  }

  const publishPayload = new URLSearchParams({
    creation_id: createData.id,
    access_token: config.accessToken,
  });

  const publishResponse = await fetch(
    `${THREADS_API_BASE}/${config.userId}/threads_publish`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: publishPayload.toString(),
      cache: "no-store",
    },
  );

  const publishData = (await publishResponse.json()) as ThreadsApiResponse;
  if (!publishResponse.ok || !publishData.id) {
    throw new Error(
      publishData.error?.message ?? "Falha ao publicar postagem no Threads.",
    );
  }

  return {
    creationId: createData.id,
    postId: publishData.id,
  };
}
