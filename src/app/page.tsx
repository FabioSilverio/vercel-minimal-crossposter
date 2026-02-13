"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Channel = "bluesky" | "threads";

type ChannelResult = {
  ok: boolean;
  message: string;
  id?: string;
  uri?: string;
};

type PostResponse = {
  results: Partial<Record<Channel, ChannelResult>>;
  error?: string;
};

type ChannelsState = Record<Channel, boolean>;

const initialChannels: ChannelsState = {
  bluesky: true,
  threads: true,
};

const STORAGE_KEY = "crosspost.credentials.v1";

const initialCredentials = {
  blueskyIdentifier: "",
  blueskyAppPassword: "",
  threadsUserId: "",
  threadsAccessToken: "",
};

export default function Home() {
  const [text, setText] = useState("");
  const [channels, setChannels] = useState<ChannelsState>(initialChannels);
  const [useCustomCredentials, setUseCustomCredentials] = useState(false);
  const [credentials, setCredentials] = useState(initialCredentials);
  const [rememberCredentials, setRememberCredentials] = useState(true);
  const [storageReady, setStorageReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PostResponse | null>(null);

  const selectedChannels = useMemo(
    () => Object.values(channels).filter(Boolean).length,
    [channels],
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          useCustomCredentials?: boolean;
          rememberCredentials?: boolean;
          credentials?: Partial<typeof initialCredentials>;
        };

        setUseCustomCredentials(Boolean(parsed.useCustomCredentials));
        setRememberCredentials(parsed.rememberCredentials ?? true);
        setCredentials((current) => ({
          ...current,
          ...parsed.credentials,
        }));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    if (!rememberCredentials) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        useCustomCredentials,
        rememberCredentials,
        credentials,
      }),
    );
  }, [credentials, rememberCredentials, storageReady, useCustomCredentials]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!text.trim()) {
      setResult({ error: "Escreva um texto para publicar.", results: {} });
      return;
    }

    if (selectedChannels === 0) {
      setResult({ error: "Selecione pelo menos uma rede social.", results: {} });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          channels,
          credentials: useCustomCredentials ? credentials : undefined,
        }),
      });

      const raw = await response.text();
      const data = raw ? (JSON.parse(raw) as PostResponse) : { results: {} };
      setResult(data);
    } catch {
      setResult({
        error: "Falha de rede ou resposta invalida ao tentar publicar.",
        results: {},
      });
    } finally {
      setLoading(false);
    }
  }

  function updateCredential(
    field: keyof typeof credentials,
    value: string,
  ): void {
    setCredentials((current) => ({ ...current, [field]: value }));
  }

  function clearSavedCredentials(): void {
    localStorage.removeItem(STORAGE_KEY);
    setCredentials(initialCredentials);
    setUseCustomCredentials(false);
    setRememberCredentials(false);
  }

  return (
    <div className="page">
      <main className="shell">
        <section className="hero">
          <p className="kicker">Crosspost Studio</p>
          <h1>Publique no Bluesky e no Threads ao mesmo tempo.</h1>
          <p className="subtitle">
            Visual minimalista, fluxo direto e resultado em um clique.
          </p>
        </section>

        <section className="panel">
          <form onSubmit={onSubmit} className="form">
            <label htmlFor="postText">Mensagem</label>
            <textarea
              id="postText"
              name="postText"
              value={text}
              maxLength={500}
              onChange={(event) => setText(event.target.value)}
              placeholder="Escreva sua postagem..."
              required
            />
            <p className="character-counter">{text.length}/500 caracteres</p>

            <div className="choices">
              <p>Publicar em</p>
              <label>
                <input
                  type="checkbox"
                  checked={channels.bluesky}
                  onChange={(event) =>
                    setChannels((current) => ({
                      ...current,
                      bluesky: event.target.checked,
                    }))
                  }
                />
                Bluesky
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={channels.threads}
                  onChange={(event) =>
                    setChannels((current) => ({
                      ...current,
                      threads: event.target.checked,
                    }))
                  }
                />
                Threads
              </label>
            </div>

            <div className="credentials-header">
              <p>Credenciais</p>
              <label>
                <input
                  type="checkbox"
                  checked={useCustomCredentials}
                  onChange={(event) =>
                    setUseCustomCredentials(event.target.checked)
                  }
                />
                Informar credenciais no formulario
              </label>
            </div>

            <div className="credentials-actions">
              <label>
                <input
                  type="checkbox"
                  checked={rememberCredentials}
                  onChange={(event) =>
                    setRememberCredentials(event.target.checked)
                  }
                />
                Salvar credenciais neste navegador
              </label>
              <button
                type="button"
                className="secondary-button"
                onClick={clearSavedCredentials}
              >
                Limpar salvas
              </button>
            </div>

            {useCustomCredentials && (
              <div className="credentials-grid">
                <label htmlFor="blueskyIdentifier">
                  Bluesky Identifier
                  <input
                    id="blueskyIdentifier"
                    type="text"
                    value={credentials.blueskyIdentifier}
                    onChange={(event) =>
                      updateCredential("blueskyIdentifier", event.target.value)
                    }
                    placeholder="usuario.bsky.social"
                  />
                </label>

                <label htmlFor="blueskyAppPassword">
                  Bluesky App Password
                  <input
                    id="blueskyAppPassword"
                    type="password"
                    value={credentials.blueskyAppPassword}
                    onChange={(event) =>
                      updateCredential("blueskyAppPassword", event.target.value)
                    }
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                  />
                </label>

                <label htmlFor="threadsUserId">
                  Threads User ID (opcional)
                  <input
                    id="threadsUserId"
                    type="text"
                    value={credentials.threadsUserId}
                    onChange={(event) =>
                      updateCredential("threadsUserId", event.target.value)
                    }
                    placeholder="1234567890"
                  />
                </label>

                <p className="helper">
                  Deixe o User ID vazio para publicar com o endpoint &quot;me&quot;.
                </p>

                <label htmlFor="threadsAccessToken">
                  Threads Access Token
                  <input
                    id="threadsAccessToken"
                    type="password"
                    value={credentials.threadsAccessToken}
                    onChange={(event) =>
                      updateCredential("threadsAccessToken", event.target.value)
                    }
                    placeholder="EAAB..."
                  />
                </label>
              </div>
            )}

            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? "Publicando..." : "Publicar agora"}
            </button>
          </form>
        </section>

        <section className="panel result-panel">
          <h2>Status</h2>
          {!result && <p className="muted">Aguardando envio.</p>}

          {result?.error && <p className="error">{result.error}</p>}

          {result?.results.bluesky && (
            <article className={result.results.bluesky.ok ? "ok" : "error"}>
              <h3>Bluesky</h3>
              <p>{result.results.bluesky.message}</p>
              {result.results.bluesky.uri && (
                <p className="meta">{result.results.bluesky.uri}</p>
              )}
            </article>
          )}

          {result?.results.threads && (
            <article className={result.results.threads.ok ? "ok" : "error"}>
              <h3>Threads</h3>
              <p>{result.results.threads.message}</p>
              {result.results.threads.id && (
                <p className="meta">ID {result.results.threads.id}</p>
              )}
            </article>
          )}
        </section>
      </main>
    </div>
  );
}
