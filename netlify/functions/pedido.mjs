// Status público de um pedido (usado quando a cliente volta do Mercado Pago).
// Não devolve endereço, e-mail nem telefone. Se o pedido ainda está aguardando,
// pergunta direto à API do Mercado Pago — nunca confia no que vem no endereço da página.
import { lerPedido, STATUS } from "../lib/pedidos.mjs";
import { buscarPagamentoDoPedido, aplicarPagamento } from "../lib/pagamento.mjs";

const json = (obj, status = 200) => Response.json(obj, { status, headers: { "Cache-Control": "no-store" } });

export default async (req) => {
  const id = new URL(req.url).searchParams.get("id") || "";
  let p = await lerPedido(id);
  if (!p) return json({ erro: "Pedido não encontrado" }, 404);

  const recente = Date.now() - Date.parse(p.criadoEm) < 3 * 86400000;
  if (["aguardando", "recusado"].includes(p.status) && recente && Netlify.env.get("MP_ACCESS_TOKEN")) {
    try {
      const pg = await buscarPagamentoDoPedido(p.id);
      if (pg) p = (await aplicarPagamento(pg)) || p;
    } catch (e) { console.error("Sincronização falhou:", e.message); }
  }

  return json({
    id: p.id, status: p.status, statusTexto: STATUS[p.status] || p.status, metodo: p.metodo, total: p.total,
    itens: (p.itens || []).map(i => ({ nome: i.nome, t: i.t, q: i.q })), rastreio: p.rastreio || "",
  });
};

export const config = {
  path: "/api/pedido",
  method: "GET",
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
