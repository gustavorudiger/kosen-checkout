// Aplica ao pedido o que a API OFICIAL do Mercado Pago diz sobre um pagamento.
// Usado pelo webhook e pela consulta de status (quando a cliente volta ao site).
import { atualizarPedido, lerPedido } from "./pedidos.mjs";
import { avisarVendaPaga } from "./avisos.mjs";

const MAPA = { approved: "pago", authorized: "pago", pending: "aguardando", in_process: "aguardando", in_mediation: "aguardando",
  rejected: "recusado", cancelled: "cancelado", refunded: "cancelado", charged_back: "cancelado" };

const mpGet = async (caminho) => {
  const r = await fetch(`https://api.mercadopago.com${caminho}`, {
    headers: { Authorization: `Bearer ${Netlify.env.get("MP_ACCESS_TOKEN")}` }, signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`Mercado Pago ${r.status}`);
  return r.json();
};

export const buscarPagamento = id => mpGet(`/v1/payments/${encodeURIComponent(id)}`);

// Procura o pagamento mais recente de um pedido (external_reference).
export async function buscarPagamentoDoPedido(pedidoId) {
  const d = await mpGet(`/v1/payments/search?external_reference=${encodeURIComponent(pedidoId)}&sort=date_created&criteria=desc&limit=5`);
  const lista = d.results || [];
  return lista.find(p => p.status === "approved") || lista[0] || null;
}

export async function aplicarPagamento(pg) {
  const pedidoId = String(pg?.external_reference || "");
  const pedido = await lerPedido(pedidoId);
  if (!pedido) return null;

  let novoStatus = MAPA[pg.status] || pedido.status;
  if (novoStatus === "pago" && Number(pg.transaction_amount) + 0.01 < Number(pedido.total)) {
    console.error("Valor pago menor que o pedido!", pedidoId, pg.transaction_amount, pedido.total);
    novoStatus = "aguardando";
  }

  let avisar = false;
  const atualizado = await atualizarPedido(pedidoId, p => {
    const andou = ["separando", "enviado", "entregue"].includes(p.status);
    // um pedido já pago não volta para "recusado/aguardando" por causa de uma tentativa antiga
    const regrediria = p.status === "pago" && ["aguardando", "recusado"].includes(novoStatus);
    if ((!andou && !regrediria) || novoStatus === "cancelado") p.status = novoStatus;
    if (!(regrediria && p.pagamento)) {
      p.pagamento = { id: String(pg.id), status: pg.status, detalhe: pg.status_detail, valor: pg.transaction_amount,
        metodo: pg.payment_method_id, parcelas: pg.installments, em: pg.date_approved || pg.date_last_updated };
    }
    if (p.status === "pago" && !p.avisado) { p.avisado = true; avisar = true; }
    return p;
  });

  if (avisar) await avisarVendaPaga(atualizado);
  return atualizado;
}
