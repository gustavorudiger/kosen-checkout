// Webhook do Mercado Pago: é ASSIM que o site sabe que um pedido foi pago.
// 1) confere a assinatura secreta (MP_WEBHOOK_SECRET) — barra avisos falsos;
// 2) consulta o pagamento direto na API do Mercado Pago (fonte oficial);
// 3) confere valor e pedido, atualiza o status e manda os avisos (uma vez só).
import { createHmac, timingSafeEqual } from "node:crypto";
import { buscarPagamento, aplicarPagamento } from "../lib/pagamento.mjs";

const ok = (msg = "ok", status = 200) => new Response(msg, { status });

function assinaturaValida(req, dataId) {
  const segredo = Netlify.env.get("MP_WEBHOOK_SECRET");
  if (!segredo) return false;
  const sig = req.headers.get("x-signature") || "";
  const reqId = req.headers.get("x-request-id") || "";
  const partes = Object.fromEntries(sig.split(",").map(p => p.trim().split("=").map(s => s.trim())));
  if (!partes.ts || !partes.v1) return false;
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  let manifest = "";
  if (id) manifest += `id:${id};`;
  if (reqId) manifest += `request-id:${reqId};`;
  manifest += `ts:${partes.ts};`;
  const esperado = createHmac("sha256", segredo).update(manifest).digest("hex");
  const a = Buffer.from(esperado), b = Buffer.from(String(partes.v1));
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async (req) => {
  if (req.method !== "POST") return ok("método não permitido", 405);
  const url = new URL(req.url);
  let body = {};
  try { body = JSON.parse((await req.text()).slice(0, 20000) || "{}"); } catch {}

  const tipo = url.searchParams.get("type") || body.type || "";
  const dataId = String(url.searchParams.get("data.id") || body?.data?.id || "");
  if (tipo !== "payment" || !dataId) return ok("ignorado");           // outros avisos não interessam

  // Só aceita aviso assinado pelo Mercado Pago (segredo MP_WEBHOOK_SECRET do painel de Webhooks).
  if (!assinaturaValida(req, dataId)) {
    console.warn("Webhook com assinatura inválida — ignorado", dataId);
    return ok("assinatura inválida", 401);
  }

  let pg;
  try { pg = await buscarPagamento(dataId); }
  catch (e) { console.error("Consulta do pagamento falhou:", e.message); return ok("erro consulta", 502); }  // o MP tenta de novo

  const atualizado = await aplicarPagamento(pg);
  if (!atualizado) { console.warn("Pagamento sem pedido conhecido", dataId, pg.external_reference); return ok("pedido desconhecido"); }
  console.log("Webhook", atualizado.id, pg.status, "→", atualizado.status);
  return ok("ok");
};

export const config = { path: "/api/mp-webhook" };
