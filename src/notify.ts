import fetch from "node-fetch";

const slack = async (text: string) => {
  const api = process.env.SLACK_WEB_HOOK;
  if (!api) return;
  await fetch(api, { method: "post", body: JSON.stringify({ text }) });
};

export default {
  slack
};
