// Banco de pedidos da loja (Netlify Blobs — fica guardado no próprio Netlify).
// Cada pedido é um registro "pedidos/<ID>" com itens, cliente, valores, status e histórico.
import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";

const loja = () => getStore({ name: "pedidos", consistency: "strong" });

export const STATUS = {
  aguardando: "Aguardando pagamento",
  pago: "Pago",
  separando: "Separando",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
  recusado: "Pagamento recusado",
};

export async function salvarPedido(p) {
  await loja().setJSON(p.id, p);
  return p;
}

export async function lerPedido(id) {
  if (!/^KS[A-Z0-9]{6,30}$/.test(String(id || ""))) return null;
  return (await loja().get(id, { type: "json" })) || null;
}

// Atualiza com uma função; guarda histórico de cada mudança de status.
export async function atualizarPedido(id, fn) {
  const p = await lerPedido(id);
  if (!p) return null;
  const antes = p.status;
  const novo = (await fn(p)) || p;
  if (novo.status !== antes) {
    novo.historico = [...(novo.historico || []), { status: novo.status, em: new Date().toISOString() }];
  }
  novo.atualizadoEm = new Date().toISOString();
  await loja().setJSON(id, novo);
  return novo;
}

export async function listarPedidos(limite = 300) {
  const { blobs } = await loja().list();
  const ids = blobs.map(b => b.key).filter(k => k.startsWith("KS"));
  const lista = await Promise.all(ids.map(id => loja().get(id, { type: "json" })));
  return lista.filter(Boolean)
    .sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)))
    .slice(0, limite);
}

// Contador simples por chave (usado para limitar tentativas de login).
export async function contarTentativa(chave, janelaMin) {
  const st = getStore({ name: "seguranca", consistency: "strong" });
  const agora = Date.now();
  const r = (await st.get(chave, { type: "json" })) || { n: 0, desde: agora };
  if (agora - r.desde > janelaMin * 60000) { r.n = 0; r.desde = agora; }
  r.n += 1;
  await st.setJSON(chave, r);
  return r.n;
}

export async function zerarTentativas(chave) {
  const st = getStore({ name: "seguranca", consistency: "strong" });
  await st.delete(chave);
}

// Índice "pedidos por e-mail" (para a área do cliente listar os pedidos dela).
const chaveEmail = email => "email-" + createHash("sha256").update(String(email || "").trim().toLowerCase()).digest("hex").slice(0, 40);

export async function indexarPedido(email, id) {
  const st = getStore({ name: "indices", consistency: "strong" });
  const k = chaveEmail(email);
  const lista = (await st.get(k, { type: "json" })) || [];
  if (!lista.includes(id)) { lista.unshift(id); await st.setJSON(k, lista.slice(0, 200)); }
}

export async function pedidosDoEmail(email) {
  const st = getStore({ name: "indices", consistency: "strong" });
  const ids = (await st.get(chaveEmail(email), { type: "json" })) || [];
  const lista = await Promise.all(ids.map(id => lerPedido(id)));
  return lista.filter(Boolean);
}
