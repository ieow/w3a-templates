const DISCORD_CLIENT_ID = "1275709031138463754";
const DISCORD_CLIENT_SECRET = "o3E7TBYnYza3h1BJ962IiQ_hRoJBpuiD";

async function revokeDiscordToken(token: string) {
  const formData = new FormData();
  formData.append("token", token);
  const res = await fetch("https://discord.com/api/oauth2/token/revoke", {
    headers: {
      // ...formData,
      Authorization: `Basic ${Buffer.from(`${DISCORD_CLIENT_ID}:${DISCORD_CLIENT_SECRET}`, "binary").toString("base64")}`,
    },
    body: formData,
  });
  return res;
}
