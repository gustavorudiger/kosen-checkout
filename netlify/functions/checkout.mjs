// Cria o pagamento no Mercado Pago (Checkout Pro), SALVA o pedido e devolve o link.
// Os PREÇOS vêm do catálogo do servidor, nunca do navegador do cliente.
// O Access Token fica só na variável MP_ACCESS_TOKEN do Netlify.
// A confirmação do pagamento chega pelo webhook (mp-webhook.mjs), não pelo endereço da página.
import { randomBytes } from "node:crypto";
import { LOJA, calcPedido } from "../../site/catalogo.js";
import { cotarFrete } from "../lib/frete.mjs";
import { salvarPedido, indexarPedido } from "../lib/pedidos.mjs";

const limpa = (v, max = 120) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);
const json = (obj, status = 200) => Response.json(obj, { status, headers: { "Cache-Control": "no-store" } });

export default async (req) => {
  if (req.method !== "POST") return json({ erro: "Método não permitido" }, 405);

  const token = Netlify.env.get("MP_ACCESS_TOKEN");
  if (!token) return json({ erro: "Pagamento ainda não configurado na loja." }, 503);

  let body;
  try {
    const txt = await req.text();
    if (txt.length > 20000) return json({ erro: "Pedido grande demais" }, 413);
    body = JSON.parse(txt);
  } catch {
    return json({ erro: "Pedido inválido" }, 400);
  }

  const metodo = body.metodo === "pix" ? "pix" : "cartao";
  const c = body.cliente || {};
  const cliente = {
    nome: limpa(c.nome, 80), email: limpa(c.email, 120).toLowerCase(), fone: limpa(c.fone, 20).replace(/\D/g, ""),
    cep: limpa(c.cep, 9).replace(/\D/g, ""), rua: limpa(c.rua), numero: limpa(c.numero, 10),
    comp: limpa(c.comp, 60), bairro: limpa(c.bairro, 60), cidade: limpa(c.cidade, 60), uf: limpa(c.uf, 2).toUpperCase(),
  };
  const faltando = ["nome", "email", "fone", "cep", "rua", "numero", "bairro", "cidade", "uf"].filter(k => !cliente[k]);
  if (faltando.length) return json({ erro: "Preencha todos os dados de entrega." }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cliente.email)) return json({ erro: "E-mail inválido" }, 400);
  if (cliente.cep.length !== 8) return json({ erro: "CEP inválido" }, 400);
  if (cliente.fone.length < 10) return json({ erro: "WhatsApp inválido" }, 400);

  let ped;
  try {
    const itens = Array.isArray(body.itens) ? body.itens.slice(0, 30) : [];
    const soTeste = itens.length && itens.every(i => Number(i.id) === 999);
    const opcoes = soTeste ? [] : await cotarFrete(cliente.cep, itens);   // frete recalculado aqui
    ped = calcPedido(itens, opcoes, limpa(body.frete, 40), metodo);
  } catch (e) {
    // calcPedido só gera mensagens pensadas para a cliente (produto/numeração indisponível etc.)
    return json({ erro: String(e.message || "Não foi possível montar o pedido").slice(0, 120) }, 400);
  }

  const site = (Netlify.env.get("URL") || new URL(req.url).origin).replace(/\/$/, "");
  const pedidoId = "KS" + Date.now().toString(36).toUpperCase() + randomBytes(4).toString("hex").toUpperCase();

  const items = ped.itens.map(l => ({
    id: String(l.p.id), title: `${l.p.nome} - Nº ${l.t}`.slice(0, 250), quantity: l.q,
    unit_price: l.unit, currency_id: "BRL", category_id: "fashion",
  }));
  if (ped.frete && ped.frete.valor > 0) {
    items.push({ id: "frete", title: `Frete ${ped.frete.nome}`.slice(0, 120), quantity: 1, unit_price: ped.frete.valor, currency_id: "BRL" });
  }

  // 1) salva o pedido ANTES de ir para o Mercado Pago
  const agora = new Date().toISOString();
  await salvarPedido({
    id: pedidoId, criadoEm: agora, atualizadoEm: agora, status: "aguardando", metodo,
    cliente, total: ped.total, sub: ped.sub, pares: ped.pares,
    frete: ped.frete ? { nome: ped.frete.nome, valor: ped.frete.valor, prazo: ped.frete.prazo || "" } : null,
    itens: ped.itens.map(l => ({ id: l.p.id, nome: l.p.nome, t: l.t, q: l.q, unit: l.unit })),
    pagamento: null, rastreio: "", nota: "", avisado: false,
    historico: [{ status: "aguardando", em: agora }],
  });
  await indexarPedido(cliente.email, pedidoId);

  // 2) cria o pagamento
  const [primeiro, ...resto] = cliente.nome.split(" ");
  const preference = {
    items,
    external_reference: pedidoId,
    statement_descriptor: "KOSEN",
    payer: {
      name: primeiro, surname: resto.join(" "), email: cliente.email,
      phone: { area_code: cliente.fone.slice(0, 2), number: cliente.fone.slice(2) },
      address: { zip_code: cliente.cep, street_name: cliente.rua, street_number: cliente.numero },
    },
    shipments: {
      receiver_address: {
        zip_code: cliente.cep, street_name: cliente.rua, street_number: cliente.numero,
        apartment: cliente.comp, city_name: cliente.cidade, state_name: cliente.uf,
      },
    },
    payment_methods: metodo === "pix"
      ? { excluded_payment_types: [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }, { id: "prepaid_card" }], installments: 1 }
      : { excluded_payment_types: [{ id: "ticket" }, { id: "bank_transfer" }, { id: "atm" }], installments: LOJA.parcelas },
    back_urls: {
      success: `${site}/?pedido=${pedidoId}`,
      pending: `${site}/?pedido=${pedidoId}`,
      failure: `${site}/?pedido=${pedidoId}`,
    },
    auto_return: "approved",
    metadata: { pedido: pedidoId, metodo },
  };

  let data = {}, r;
  try {
    r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Idempotency-Key": pedidoId },
      body: JSON.stringify(preference),
      signal: AbortSignal.timeout(15000),
    });
    data = await r.json().catch(() => ({}));
  } catch (e) {
    console.error("Mercado Pago indisponível:", e.message);
  }
  if (!r || !r.ok || !data.init_point) {
    console.error("Mercado Pago recusou:", r && r.status, JSON.stringify(data).slice(0, 500));
    return json({ erro: "Não foi possível abrir o pagamento agora. Tente de novo ou chame no WhatsApp." }, 502);
  }

  console.log("Pedido criado", pedidoId, metodo, ped.total);
  return json({ url: data.init_point, pedido: pedidoId, total: ped.total });
};

export const config = {
  path: "/api/checkout",
  method: "POST",
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
