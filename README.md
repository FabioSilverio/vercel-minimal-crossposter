# Crosspost Studio

Site Next.js para publicar em **Bluesky** e **Threads** no mesmo fluxo, com layout preto/branco minimalista inspirado no estilo da Vercel.

## Requisitos

- Node.js 20+
- Conta Bluesky com App Password
- App Threads API (Meta) com token e `user_id`

## Configuracao

1. Copie `.env.example` para `.env.local`.
2. Preencha as variaveis:

```env
BLUESKY_IDENTIFIER=seu-usuario.bsky.social
BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
THREADS_USER_ID=1234567890
THREADS_ACCESS_TOKEN=EAAB...
```

Tambem e possivel informar credenciais direto no formulario da interface.

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Como funciona

- `POST /api/post` recebe texto + canais selecionados.
- Bluesky: login via `@atproto/api` e publicacao de texto.
- Threads: cria container de texto e publica via `threads_publish`.

## Observacoes

- O limite do Bluesky e 300 caracteres por post.
- Para Threads funcionar em producao, seu app Meta precisa das permissoes corretas e token valido.
