
import { getCookie, verifySession } from "../_shared/session.js";

const CHAVE = "T26-2A-27FB-405C-10B3-6651";

export async function onRequest({ request, env }) {
  const method = request.method;

  if (!["GET", "POST"].includes(method)) {
    return Response.json(
      { ok: false, error: "Method not allowed" },
      { status: 405, headers: { Allow: "GET, POST" } }
    );
  }

  let sessionUser = null;
  const token = getCookie(request, "discord_session");

  if (token && env.SESSION_SECRET) {
    sessionUser = await verifySession(token, env.SESSION_SECRET);
  }

  if (method === "GET") {
    let d1Connected = false;
    let totalRegistros = 0;
    let ultimosRegistros = [];

    if (env.DB) {
      try {
        const count = await env.DB.prepare(
          "SELECT COUNT(*) AS total FROM project_records"
        ).first();

        const records = await env.DB.prepare(
          "SELECT id, user_id, username, conteudo, created_at FROM project_records ORDER BY id DESC LIMIT 10"
        ).all();

        totalRegistros = Number(count?.total || 0);
        ultimosRegistros = records.results || [];
        d1Connected = true;
      } catch {
        d1Connected = false;
      }
    }

    return Response.json({
      ok: true,
      chave: CHAVE,
      d1Connected,
      discordOAuthConfigured: Boolean(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET),
      sessionUser,
      totalRegistros,
      ultimosRegistros,
      serverTimestamp: new Date().toISOString()
    });
  }

  if (!sessionUser) {
    return Response.json(
      { ok: false, error: "Autenticação Discord necessária." },
      { status: 401 }
    );
  }

  if (!env.DB) {
    return Response.json(
      { ok: false, error: "Banco de dados indisponível." },
      { status: 503 }
    );
  }

  if (!request.headers.get("Content-Type")?.includes("application/json")) {
    return Response.json(
      { ok: false, error: "Envie dados em JSON." },
      { status: 415 }
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "JSON inválido." },
      { status: 400 }
    );
  }

  const conteudo = typeof body?.conteudo === "string" ? body.conteudo.trim() : "";

  if (!conteudo || conteudo.length > 500) {
    return Response.json(
      { ok: false, error: "O registro deve ter entre 1 e 500 caracteres." },
      { status: 400 }
    );
  }

  try {
    await env.DB.prepare(
      "INSERT INTO project_records (user_id, username, chave_projeto, conteudo) VALUES (?, ?, ?, ?)"
    ).bind(sessionUser.userId, sessionUser.username, CHAVE, conteudo).run();

    return Response.json({
      ok: true,
      saved: true,
      serverTimestamp: new Date().toISOString()
    }, { status: 201 });
  } catch {
    return Response.json(
      { ok: false, error: "Não foi possível salvar no banco de dados." },
      { status: 500 }
    );
  }
}
