# Crosspost Studio

Site Next.js para publicar em **Bluesky** e **Threads** no mesmo fluxo, com layout preto/branco minimalista inspirado no estilo da Vercel.

## Requisitos

- Node.js 20+
- Conta Bluesky com App Password
- App Threads API (Meta) com token de usuario

## Configuracao

1. Copie `.env.example` para `.env.local`.
2. Preencha as variaveis:

```env
BLUESKY_IDENTIFIER=seu-usuario.bsky.social
BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
THREADS_USER_ID=1234567890
THREADS_ACCESS_TOKEN=EAAB...
# THREADS_API_VERSION=v1.0
```

Tambem e possivel informar credenciais direto no formulario da interface.
O `THREADS_USER_ID` e opcional: se vazio, o app usa o endpoint `me`.
As credenciais digitadas no formulario podem ser salvas localmente no navegador.
No formulario, use o botao **Conectar Threads** para validar o token e preencher o usuario automaticamente.

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Como funciona

- `POST /api/post` recebe texto + canais selecionados.
- Bluesky: login via `@atproto/api` e publicacao de texto.
- Threads: cria container de texto e publica via `me/threads` + `me/threads_publish`.
- O parser de resposta do Threads e tolerante a respostas vazias/invalidas para evitar erro de JSON.

## Observacoes

- O limite do Bluesky e 300 caracteres por post.
- Para Threads funcionar em producao, seu app Meta precisa das permissoes corretas e token valido.
- Se aparecer erro HTTP 500 no Threads, valide:
  - token gerado para o produto **Threads API** (nao Instagram Graph),
  - permissao `threads_content_publish`,
  - app em modo Live (ou usuario de teste autorizado),
  - usar o botao **Conectar Threads** antes de publicar.
