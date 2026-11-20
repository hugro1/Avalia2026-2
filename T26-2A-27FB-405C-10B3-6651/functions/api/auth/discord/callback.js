
import { createSession, getCookie } from "../../../_shared/session.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = getCookie(request, "discord_oauth_state");

  const headers = new Headers({
    Location: "/",
    "Cache-Control": "no-store"
  });

  function redirect(error) {
    headers.set("Location", error ? "/?auth_error=" + encodeURIComponent(error) : "/?login=success");
    headers.append(
      "Set-Cookie",
      "discord_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
    );
    return new Response(null, { status: 302, headers });
  }

  if (url.searchParams.has("error")) return redirect("discord_denied");

  if (!code || !state || !savedState || state !== savedState) {
    return redirect("invalid_state");
  }

  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET || !env.SESSION_SECRET) {
    return redirect("missing_server_configuration");
  }

  if (!env.DB) return redirect("database_unavailable");

  const redirectUri = new URL("/api/auth/discord/callback", url.origin).href;

  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID,
        client_secret: env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenRes.ok) return redirect("token_exchange_failed");

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return redirect("invalid_access_token");

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    if (!userRes.ok) return redirect("fetch_user_failed");

    const discordUser = await userRes.json();
    if (!discordUser.id || !discordUser.username) return redirect("invalid_discord_user");

    const userId = String(discordUser.id);
    const username = String(discordUser.global_name || discordUser.username);
    const avatar = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${userId}/${discordUser.avatar}.png`
      : "https://cdn.discordapp.com/embed/avatars/0.png";

    await env.DB.prepare(
      "INSERT INTO discord_users (user_id, username, avatar, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET username = excluded.username, avatar = excluded.avatar, updated_at = CURRENT_TIMESTAMP"
    ).bind(userId, username, avatar).run();

    const session = await createSession(
      { userId, username, avatar },
      env.SESSION_SECRET
    );

    headers.set(
      "Set-Cookie",
      `discord_session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`
    );

    headers.append(
      "Set-Cookie",
      "discord_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
    );

    headers.set("Location", "/?login=success");

    return new Response(null, { status: 302, headers });
  } catch {
    return redirect("authentication_failed");
  }
}
