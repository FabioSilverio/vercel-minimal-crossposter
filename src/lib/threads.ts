type ThreadsConfig = {
  userId?: string;
  accessToken: string;
};

type ThreadsAuthorizeConfig = {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
};

type ThreadsOAuthToken = {
  accessToken: string;
  tokenType: string;
  expiresIn: number | null;
  apiVersion: string;
  isLongLived: boolean;
};

type ThreadsResult = {
  creationId: string;
  postId: string;
  apiVersion: string;
};

type ThreadsUser = {
  id: string;
  username: string;
};

type ThreadsApiError = {
  message?: string;
  error_user_msg?: string;
  error_user_title?: string;
};

type ThreadsApiResponse = {
  id?: string;
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: ThreadsApiError;
  error_description?: string;
  username?: string;
};

type ParsedResponse = {
  data: ThreadsApiResponse | null;
  raw: string;
};

const THREADS_TEXT_LIMIT = 500;
const THREADS_BASE = "https://graph.threads.net";
const THREADS_AUTH_BASE = "https://www.threads.net";
const DEFAULT_THREADS_VERSIONS = ["v1.0", ""] as const;
const DEFAULT_THREADS_SCOPES = ["threads_basic", "threads_content_publish"];

function normalizeVersion(version: string): string {
  return version.trim().replace(/^\/+|\/+$/g, "");
}

function getVersionCandidates(): string[] {
  const envVersion = normalizeVersion(process.env.THREADS_API_VERSION ?? "");
  const versions = envVersion
    ? [envVersion]
    : DEFAULT_THREADS_VERSIONS.map((item) => normalizeVersion(item));
  return Array.from(new Set(versions));
}

function buildPath(version: string, endpoint: string): string {
  const normalizedEndpoint = endpoint.replace(/^\/+/, "");
  return version ? `${THREADS_BASE}/${version}/${normalizedEndpoint}` : `${THREADS_BASE}/${normalizedEndpoint}`;
}

function buildUrl(
  version: string,
  endpoint: string,
  params: Record<string, string>,
  accessToken: string,
): string {
  const url = new URL(buildPath(version, endpoint));
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("access_token", accessToken);
  return url.toString();
}

function buildUrlWithoutToken(
  version: string,
  endpoint: string,
  params: Record<string, string>,
): string {
  const url = new URL(buildPath(version, endpoint));
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function parseJsonSafe(response: Response): Promise<ParsedResponse> {
  const raw = await response.text();
  if (!raw) {
    return { data: null, raw: "" };
  }

  try {
    return {
      data: JSON.parse(raw) as ThreadsApiResponse,
      raw,
    };
  } catch {
    return { data: null, raw };
  }
}

function buildThreadsError(
  context: string,
  response: Response,
  parsed: ParsedResponse,
): Error {
  const wwwAuthenticate = response.headers.get("www-authenticate") ?? "";
  const authReason = wwwAuthenticate.includes("Cannot parse access token")
    ? "Token invalido: Threads nao conseguiu interpretar o access token."
    : wwwAuthenticate.includes("invalid_token")
      ? "Token invalido para Threads API."
      : "";
  const snippet = parsed.raw.trim().slice(0, 180);
  const reason =
    authReason ||
    (parsed.data?.error?.error_user_msg ??
      parsed.data?.error?.message ??
      parsed.data?.error_description ??
      snippet ??
      `HTTP ${response.status}`);

  return new Error(`${context}: ${reason}`);
}

export function buildThreadsAuthorizeUrl(config: ThreadsAuthorizeConfig): string {
  const url = new URL("/oauth/authorize", THREADS_AUTH_BASE);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", (config.scopes ?? DEFAULT_THREADS_SCOPES).join(","));
  url.searchParams.set("state", config.state);
  return url.toString();
}

function buildOAuthError(context: string, response: Response, parsed: ParsedResponse): Error {
  const snippet = parsed.raw.trim().slice(0, 180);
  const reason =
    parsed.data?.error?.error_user_msg ??
    parsed.data?.error?.message ??
    parsed.data?.error_description ??
    snippet ??
    `HTTP ${response.status}`;

  return new Error(`${context}: ${reason}`);
}

async function exchangeCodeForShortToken(
  version: string,
  code: string,
  redirectUri: string,
  appId: string,
  appSecret: string,
): Promise<ThreadsOAuthToken> {
  const url = buildUrlWithoutToken(version, "oauth/access_token", {});
  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });
  const parsed = await parseJsonSafe(response);

  if (!response.ok || !parsed.data?.access_token) {
    throw buildOAuthError("Falha no OAuth do Threads", response, parsed);
  }

  return {
    accessToken: parsed.data.access_token,
    tokenType: parsed.data.token_type ?? "bearer",
    expiresIn: parsed.data.expires_in ?? null,
    apiVersion: version || "app-default",
    isLongLived: false,
  };
}

async function exchangeTokenForLongLived(
  version: string,
  shortToken: string,
  appSecret: string,
): Promise<ThreadsOAuthToken | null> {
  const url = buildUrl(version, "access_token", {
    grant_type: "th_exchange_token",
    client_secret: appSecret,
  }, shortToken);

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });
  const parsed = await parseJsonSafe(response);

  if (!response.ok || !parsed.data?.access_token) {
    return null;
  }

  return {
    accessToken: parsed.data.access_token,
    tokenType: parsed.data.token_type ?? "bearer",
    expiresIn: parsed.data.expires_in ?? null,
    apiVersion: version || "app-default",
    isLongLived: true,
  };
}

export async function exchangeThreadsCodeForToken(
  code: string,
  redirectUri: string,
  appId: string,
  appSecret: string,
): Promise<ThreadsOAuthToken> {
  const versionCandidates = getVersionCandidates();
  const errors: string[] = [];

  for (const version of versionCandidates) {
    try {
      const shortToken = await exchangeCodeForShortToken(
        version,
        code,
        redirectUri,
        appId,
        appSecret,
      );

      const longToken = await exchangeTokenForLongLived(
        version,
        shortToken.accessToken,
        appSecret,
      );

      return longToken ?? shortToken;
    } catch (error) {
      const tag = version || "app-default";
      const message =
        error instanceof Error ? error.message : "erro ao trocar code por token";
      errors.push(`[${tag}] ${message}`);
    }
  }

  throw new Error(
    errors.length
      ? `Nao foi possivel concluir OAuth do Threads. Detalhes: ${errors.join(" | ")}`
      : "Nao foi possivel concluir OAuth do Threads.",
  );
}

async function postCreateContainer(
  version: string,
  accessToken: string,
  text: string,
  userId?: string,
): Promise<{ creationId: string }> {
  const actor = userId?.trim() || "me";
  const url = buildUrl(
    version,
    `${actor}/threads`,
    {
      media_type: "TEXT",
      text,
    },
    accessToken,
  );

  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
  });
  const parsed = await parseJsonSafe(response);

  if (!response.ok || !parsed.data?.id) {
    throw buildThreadsError("Falha ao criar postagem no Threads", response, parsed);
  }

  return {
    creationId: parsed.data.id,
  };
}

async function postPublishContainer(
  version: string,
  accessToken: string,
  creationId: string,
  userId?: string,
): Promise<{ postId: string }> {
  const actor = userId?.trim() || "me";
  const url = buildUrl(
    version,
    `${actor}/threads_publish`,
    {
      creation_id: creationId,
    },
    accessToken,
  );

  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
  });
  const parsed = await parseJsonSafe(response);

  if (!response.ok || !parsed.data?.id) {
    throw buildThreadsError(
      "Falha ao publicar postagem no Threads",
      response,
      parsed,
    );
  }

  return {
    postId: parsed.data.id,
  };
}

export async function fetchThreadsUserByToken(accessToken: string): Promise<ThreadsUser> {
  const versionCandidates = getVersionCandidates();
  const errors: string[] = [];

  for (const version of versionCandidates) {
    try {
      const url = buildUrl(version, "me", { fields: "id,username" }, accessToken);

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });
      const parsed = await parseJsonSafe(response);

      if (response.ok && parsed.data?.id && parsed.data?.username) {
        return {
          id: parsed.data.id,
          username: parsed.data.username,
        };
      }

      const error = buildThreadsError(
        "Nao foi possivel validar token do Threads",
        response,
        parsed,
      );
      const tag = version || "app-default";
      errors.push(`[${tag}] ${error.message}`);
    } catch (error) {
      const tag = version || "app-default";
      const message =
        error instanceof Error ? error.message : "erro de rede ao validar token";
      errors.push(`[${tag}] ${message}`);
    }
  }

  throw new Error(
    errors.length
      ? `Nao foi possivel validar token do Threads. Detalhes: ${errors.join(" | ")}`
      : "Nao foi possivel validar token do Threads.",
  );
}

export async function postToThreads(
  text: string,
  config: ThreadsConfig,
): Promise<ThreadsResult> {
  if (Array.from(text).length > THREADS_TEXT_LIMIT) {
    throw new Error(`Threads aceita no maximo ${THREADS_TEXT_LIMIT} caracteres.`);
  }

  const versionCandidates = getVersionCandidates();
  const errors: string[] = [];

  for (const version of versionCandidates) {
    try {
      const created = await postCreateContainer(
        version,
        config.accessToken,
        text,
        config.userId,
      );
      const published = await postPublishContainer(
        version,
        config.accessToken,
        created.creationId,
        config.userId,
      );

      return {
        creationId: created.creationId,
        postId: published.postId,
        apiVersion: version || "app-default",
      };
    } catch (error) {
      const tag = version || "app-default";
      const message =
        error instanceof Error
          ? error.message
          : "erro ao publicar no Threads";
      errors.push(`[${tag}] ${message}`);
    }
  }

  throw new Error(
    errors.length
      ? `Falha ao publicar postagem no Threads. Detalhes: ${errors.join(" | ")}`
      : "Falha ao publicar postagem no Threads.",
  );
}
