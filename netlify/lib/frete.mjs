// Cotação de frete no Melhor Envio (usado pelas funções frete e checkout).
// Token: variável MELHOR_ENVIO_TOKEN no Netlify. Sem token, sem CEP de origem
// ou se o Melhor Envio falhar, usa a estimativa fixa do catalogo.js.
import { LOJA, PRODUTOS, opcoesFrete } from "../../site/catalogo.js";

const API = "https://melhorenvio.com.br/api/v2/me/shipment/calculate";

export async function cotarFrete(cepDestino, itens) {
  const cep = String(cepDestino || "").replace(/\D/g, "");
  if (cep.length !== 8) throw new Error("CEP inválido");
  const token = Netlify.env.get("MELHOR_ENVIO_TOKEN");
  const origem = String(LOJA.cepOrigem || "").replace(/\D/g, "");
  const estimativa = () => opcoesFrete(cep).map(o => ({ ...o, id: o.nome, estimado: true }));
  if (!token || origem.length !== 8) return estimativa();

  const products = [];
  for (const i of itens || []) {
    const p = PRODUTOS.find(x => x.id === Number(i.id));
    if (!p || p.teste) continue;
    const cx = { ...LOJA.caixa, ...(p.caixa || {}) };
    products.push({ id: String(p.id), width: cx.largura, height: cx.altura, length: cx.comprimento, weight: cx.peso,
      insurance_value: p.preco, quantity: Math.max(1, Math.min(10, Math.floor(Number(i.q)) || 1)) });
  }
  if (!products.length) {
    const cx = LOJA.caixa;
    products.push({ id: "1", width: cx.largura, height: cx.altura, length: cx.comprimento, weight: cx.peso, insurance_value: 100, quantity: 1 });
  }

  try {
    const r = await fetch(API, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}`,
        "User-Agent": `Kosen Sneakers (${LOJA.emailTecnico || "kosen-checkout.netlify.app"})` },
      body: JSON.stringify({ from: { postal_code: origem }, to: { postal_code: cep }, products,
        options: { receipt: false, own_hand: false } }),
      signal: AbortSignal.timeout(9000),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok || !Array.isArray(data)) {
      console.error("Melhor Envio:", r.status, JSON.stringify(data).slice(0, 300));
      return estimativa();
    }
    const filtros = (LOJA.transportadoras || []).map(s => s.toLowerCase());
    const ops = data
      .filter(s => !s.error && (s.custom_price || s.price))
      .map(s => {
        const empresa = s.company?.name || "";
        const nome = empresa && !String(s.name).toLowerCase().includes(empresa.toLowerCase()) ? `${empresa} ${s.name}` : String(s.name);
        const dias = Number(s.custom_delivery_time ?? s.delivery_time) + (LOJA.diasPostagem || 0);
        return { id: String(s.id), nome, valor: Math.round(Number(s.custom_price || s.price) * 100) / 100,
          prazo: dias ? `${dias} dia${dias > 1 ? "s" : ""} úteis` : "" };
      })
      .filter(o => !filtros.length || filtros.some(f => o.nome.toLowerCase().includes(f)))
      .sort((a, b) => a.valor - b.valor);
    return ops.length ? ops : estimativa();
  } catch (e) {
    console.error("Melhor Envio falhou:", e.message);
    return estimativa();
  }
}
