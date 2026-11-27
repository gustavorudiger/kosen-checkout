// Devolve as opções de frete para o CEP do cliente.
import { cotarFrete } from "../lib/frete.mjs";

export default async (req) => {
  if (req.method !== "POST") return Response.json({ erro: "Método não permitido" }, { status: 405 });
  let b;
  try { b = JSON.parse((await req.text()).slice(0, 20000)); } catch { return Response.json({ erro: "Pedido inválido" }, { status: 400 }); }
  try {
    const opcoes = await cotarFrete(b.cep, Array.isArray(b.itens) ? b.itens.slice(0, 30) : []);
    return Response.json({ opcoes });
  } catch (e) {
    return Response.json({ erro: e.message }, { status: 400 });
  }
};

export const config = { path: "/api/frete", method: "POST" };
