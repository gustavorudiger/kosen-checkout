// API do painel da loja (/admin). Senha na variável ADMIN_PASSWORD do Netlify.
// Login limitado a 5 tentativas erradas a cada 15 minutos por IP.
// A sessão dura 12 horas; trocar a senha no Netlify derruba todas as sessões.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { listarPedidos, lerPedido, atualizarPedido, contarTentativa, zerarTentativas, STATUS } from "../lib/pedidos.mjs";
import { buscarPagamentoDoPedido, aplicarPagamento } from "../lib/pagamento.mjs";
import { avisarEnvio } from "../lib/avisos.mjs";

const json = (obj, status = 200) => Response.json(obj, { status, headers: { "Cache-Control": "no-store" } });
const SESSAO_H = 12, MAX_ERROS = 5, JANELA_MIN = 15;

const senha = () => Netlify.env.get("ADMIN_PASSWORD") || "";
const chave = () => createHash("sha256").update("kosen-admin:" + senha()).digest();
const igual = (a, b) => { const x = createHash("sha256").update(String(a)).digest(), y = createHash("sha256").update(String(b)).digest(); return timingSafeEqual(x, y); };

function criarToken() {
  const exp = Date.now() + SESSAO_H * 3600000;
  const corpo = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  return corpo + "." + createHmac("sha256", chave()).update(corpo).digest("base64url");
}
function tokenValido(tok) {
  const [corpo, sig] = String(tok || "").split(".");
  if (!corpo || !sig) return false;
  const esperado = createHmac("sha256", chave()).update(corpo).digest("base64url");
  if (!igual(esperado, sig)) return false;
  try { return JSON.parse(Buffer.from(corpo, "base64url").toString()).exp > Date.now(); } catch { return false; }
}

export default async (req, context) => {
  if (req.method !== "POST") return json({ erro: "Método não permitido" }, 405);
  if (senha().length < 10) return json({ erro: "Painel desativado: defina ADMIN_PASSWORD (mínimo 10 caracteres) no Netlify." }, 503);

  let b = {};
  try { b = JSON.parse((await req.text()).slice(0, 10000) || "{}"); } catch { return json({ erro: "Pedido inválido" }, 400); }
  const ip = (context && context.ip) || req.headers.get("x-nf-client-connection-ip") || "sem-ip";

  if (b.acao === "login") {
    const chaveIp = "login:" + createHash("sha256").update(ip).digest("hex").slice(0, 24);
    const n = await contarTentativa(chaveIp, JANELA_MIN);
    if (n > MAX_ERROS) return json({ erro: `Muitas tentativas. Espere ${JANELA_MIN} minutos.` }, 429);
    if (!igual(b.senha || "", senha())) return json({ erro: "Senha incorreta" }, 401);
    await zerarTentativas(chaveIp);
    return json({ token: criarToken(), horas: SESSAO_H });
  }

  const tok = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!tokenValido(tok)) return json({ erro: "Sessão expirada. Entre de novo." }, 401);

  if (b.acao === "listar") {
    return json({ pedidos: await listarPedidos(), status: STATUS });
  }

  if (b.acao === "sincronizar") {
    const p = await lerPedido(b.id);
    if (!p) return json({ erro: "Pedido não encontrado" }, 404);
    try {
      const pg = await buscarPagamentoDoPedido(p.id);
      return json({ pedido: pg ? (await aplicarPagamento(pg)) || p : p, achou: !!pg });
    } catch (e) { return json({ erro: "Não consegui consultar o Mercado Pago agora." }, 502); }
  }

  if (b.acao === "atualizar") {
    const novo = String(b.status || "");
    if (novo && !STATUS[novo]) return json({ erro: "Status inválido" }, 400);
    let mandarRastreio = false;
    const p = await atualizarPedido(b.id, p => {
      if (novo) p.status = novo;
      if (typeof b.rastreio === "string") {
        const r = b.rastreio.trim().slice(0, 60);
        if (r && r !== p.rastreio) mandarRastreio = true;
        p.rastreio = r;
      }
      if (typeof b.nota === "string") p.nota = b.nota.slice(0, 1000);
      return p;
    });
    if (!p) return json({ erro: "Pedido não encontrado" }, 404);
    if (mandarRastreio && ["enviado", "entregue"].includes(p.status)) await avisarEnvio(p);
    return json({ pedido: p, emailRastreio: mandarRastreio && p.status === "enviado" });
  }

  return json({ erro: "Ação desconhecida" }, 400);
};

export const config = {
  path: "/api/admin",
  method: "POST",
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
