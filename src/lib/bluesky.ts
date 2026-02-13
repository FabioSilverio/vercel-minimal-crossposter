import { BskyAgent } from "@atproto/api";

type BlueskyConfig = {
  identifier: string;
  appPassword: string;
  serviceUrl?: string;
};

type BlueskyPostResult = {
  uri: string;
  cid: string;
};

const BLUESKY_TEXT_LIMIT = 300;

export async function postToBluesky(
  text: string,
  config: BlueskyConfig,
): Promise<BlueskyPostResult> {
  if (Array.from(text).length > BLUESKY_TEXT_LIMIT) {
    throw new Error(`Bluesky aceita no maximo ${BLUESKY_TEXT_LIMIT} caracteres.`);
  }

  const agent = new BskyAgent({
    service: config.serviceUrl ?? "https://bsky.social",
  });

  await agent.login({
    identifier: config.identifier,
    password: config.appPassword,
  });

  const response = await agent.post({
    text,
    createdAt: new Date().toISOString(),
  });

  return {
    uri: response.uri,
    cid: response.cid,
  };
}
