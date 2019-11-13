import fetch from "node-fetch";

const { SLACK_WEB_HOOK, DISCORD_WEB_HOOK } = process.env;

const slack = async (text: string) => {
  if (!SLACK_WEB_HOOK) return;
  await fetch(SLACK_WEB_HOOK, {
    method: "post",
    body: JSON.stringify({ text })
  });
};

const discord = async (content: string) => {
  if (!DISCORD_WEB_HOOK) return;
  await fetch(DISCORD_WEB_HOOK, {
    method: "post",
    body: JSON.stringify({ content })
  });
};

export default {
  slack,
  discord
};
