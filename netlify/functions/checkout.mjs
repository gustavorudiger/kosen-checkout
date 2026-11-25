// Cria o pagamento no Mercado Pago (Checkout Pro) e devolve o link.
// Os PREÇOS vêm do catálogo do servidor, nunca do navegador do cliente.
// O Access Token fica só na variável de ambiente MP_ACCESS_TOKEN do Netlify.
import { LOJA, calcPedido } from "../../site/catalogo.js";

const limpa = (v, max = 120) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);
const json = (obj, status = 200) => Response.json(obj, { status });

export default async (req, context) => {
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
    nome: limpa(c.nome, 80), email: limpa(c.email, 120), fone: limpa(c.fone, 20).replace(/\D/g, ""),
    cep: limpa(c.cep, 9).replace(/\D/g, ""), rua: limpa(c.rua), numero: limpa(c.numero, 10),
    comp: limpa(c.comp, 60), bairro: limpa(c.bairro, 60), cidade: limpa(c.cidade, 60), uf: limpa(c.uf, 2).toUpperCase(),
  };
  const faltando = ["nome", "email", "fone", "cep", "rua", "numero", "bairro", "cidade", "uf"].filter(k => !cliente[k]);
  if (faltando.length) return json({ erro: "Preencha todos os dados de entrega." }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cliente.email)) return json({ erro: "E-mail inválido" }, 400);
  if (cliente.cep.length !== 8) return json({ erro: "CEP inválido" }, 400);

  let ped;
  try {
    ped = calcPedido(body.itens, cliente.cep, limpa(body.frete, 10), metodo);
  } catch (e) {
    return json({ erro: e.message }, 400);
  }

  const site = (Netlify.env.get("URL") || new URL(req.url).origin).replace(/\/$/, "");
  const pedidoId = "KS" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();

  const items = ped.itens.map(l => ({
    id: String(l.p.id),
    title: `${l.p.nome} - Nº ${l.t}`,
    quantity: l.q,
    unit_price: l.unit,
    currency_id: "BRL",
    category_id: "fashion",
  }));
  if (ped.frete && ped.frete.valor > 0) {
    items.push({ id: "frete", title: `Frete ${ped.frete.nome}`, quantity: 1, unit_price: ped.frete.valor, currency_id: "BRL" });
  }

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
      success: `${site}/?pagamento=aprovado&pedido=${pedidoId}`,
      pending: `${site}/?pagamento=pendente&pedido=${pedidoId}`,
      failure: `${site}/?pagamento=recusado&pedido=${pedidoId}`,
    },
    auto_return: "approved",
    metadata: {
      pedido: pedidoId, metodo, frete: ped.frete ? `${ped.frete.nome} ${ped.frete.valor}` : "",
      cliente: `${cliente.nome} | ${cliente.fone} | ${cliente.rua}, ${cliente.numero} ${cliente.comp} - ${cliente.bairro} - ${cliente.cidade}/${cliente.uf} - CEP ${cliente.cep}`,
    },
  };

  const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Idempotency-Key": pedidoId },
    body: JSON.stringify(preference),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.init_point) {
    console.error("Mercado Pago recusou:", r.status, JSON.stringify(data).slice(0, 500));
    return json({ erro: "Não foi possível abrir o pagamento agora. Tente de novo ou chame no WhatsApp." }, 502);
  }

  console.log("Pedido criado", pedidoId, metodo, ped.total);
  return json({ url: data.init_point, pedido: pedidoId, total: ped.total });
};

export const config = { path: "/api/checkout", method: "POST" };
