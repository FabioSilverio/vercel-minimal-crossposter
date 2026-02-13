type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function ThreadsDataDeletionPage({ searchParams }: Props) {
  const code = typeof searchParams?.code === "string" ? searchParams.code : "";
  const userId =
    typeof searchParams?.user_id === "string" ? searchParams.user_id : "";

  return (
    <div className="page">
      <main className="shell">
        <section className="hero">
          <p className="kicker">Threads</p>
          <h1>Data Deletion Status</h1>
          <p className="subtitle">
            Este app nao armazena dados do Threads no servidor. Credenciais ficam no
            navegador do usuario.
          </p>
        </section>

        <section className="panel">
          <h2>Confirmacao</h2>
          <p className="muted">
            Codigo: <span className="meta">{code || "nao informado"}</span>
          </p>
          {userId && (
            <p className="muted">
              User ID: <span className="meta">{userId}</span>
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

