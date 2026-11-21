async function carregarStatus() {
  const listEl = document.getElementById("recordsList");
  const loginLink = document.getElementById("discordLoginLink");
  const userText = document.getElementById("discordUserText");
  const sendBtn = document.getElementById("sendBtn");
  const statusEl = document.getElementById("statusMessage");

  try {
    const res = await fetch("/api/status", { cache: "no-store" });
    const data = await res.json();

    if (data.sessionUser) {
      userText.textContent = "Discord: " + data.sessionUser.username;
      loginLink.removeAttribute("href");
      sendBtn.disabled = false;
      statusEl.textContent = "Você está autenticado pelo Discord.";
    } else {
      userText.textContent = "Entrar com Discord OAuth2";
      loginLink.href = "/api/auth/discord";
      sendBtn.disabled = true;
      statusEl.textContent = "Entre com Discord para registrar informações.";
    }

    listEl.replaceChildren();

    const items = Array.isArray(data.ultimosRegistros)
      ? data.ultimosRegistros
      : [];

    if (items.length === 0) {
      const li = document.createElement("li");
      li.textContent = data.d1Connected
        ? "D1 conectado. Nenhum registro gravado ainda."
        : "API respondeu, mas o D1 ainda não está conectado.";
      listEl.appendChild(li);
      return;
    }

    items.forEach(item => {
      const li = document.createElement("li");
      li.textContent =
        "[" + (item.created_at || "agora") + "] " +
        item.username + ": " + item.conteudo;
      listEl.appendChild(li);
    });
  } catch {
    listEl.textContent = "";
    const li = document.createElement("li");
    li.textContent = "Não foi possível consultar a API. Verifique o deploy.";
    listEl.appendChild(li);
  }
}

document.getElementById("sendBtn")?.addEventListener("click", async () => {
  const input = document.getElementById("recordInput");
  const statusEl = document.getElementById("statusMessage");
  const sendBtn = document.getElementById("sendBtn");
  const conteudo = input.value.trim();

  if (!conteudo) {
    statusEl.textContent = "Digite um registro antes de enviar.";
    return;
  }

  sendBtn.disabled = true;
  statusEl.textContent = "Enviando para o Cloudflare D1...";

  try {
    const res = await fetch("/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conteudo })
    });

    const data = await res.json();

    if (res.ok) {
      input.value = "";
      statusEl.textContent = "Registro salvo com sucesso!";
      await carregarStatus();
    } else {
      statusEl.textContent = data.error || "Não foi possível registrar.";
    }
  } catch {
    statusEl.textContent = "Falha de comunicação com a API.";
  } finally {
    sendBtn.disabled = false;
  }
});

carregarStatus();
