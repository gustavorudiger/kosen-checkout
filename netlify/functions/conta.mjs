// Área do cliente: cadastro (com código no e-mail), login, esqueci a senha, meus pedidos, meus dados.
// Senhas guardadas só como hash (scrypt). Sessão assinada, válida por 30 dias.
// Login: 8 tentativas erradas a cada 15 min por e-mail+IP. Códigos: 15 min, 5 tentativas.
import { createHash, createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { pedidosDoEmail, contarTentativa, zerarTentativas, STATUS } from "../lib/pedidos.mjs";
import { enviarEmail, modeloEmail, RODAPE_TEXTO } from "../lib/avisos.mjs";

const json = (obj, status = 200) => Response.json(obj, { status, headers: { "Cache-Control": "no-store" } });
const contas = () => getStore({ name: "contas", consistency: "strong" });
const limpa = (v, max = 120) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);
const normEmail = e => limpa(e, 120).toLowerCase();
const emailOk = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
const kConta = e => "c-" + createHash("sha256").update(e).digest("hex").slice(0, 40);
const SESSAO_DIAS = 30;

const segredo = () => {
  const s = Netlify.env.get("SESSION_SECRET") || Netlify.env.get("ADMIN_PASSWORD") || Netlify.env.get("MP_WEBHOOK_SECRET") || "";
  return createHash("sha256").update("kosen-cliente:" + s).digest();
};
const hashSenha = (senha, sal = randomBytes(16).toString("hex")) => ({ sal, hash: scryptSync(senha, sal, 64).toString("hex") });
const confere = (senha, c) => {
  if (!c || !c.sal) return false;
  const a = Buffer.from(scryptSync(senha, c.sal, 64).toString("hex")), b = Buffer.from(c.hash);
  return a.length === b.length && timingSafeEqual(a, b);
};
const hashCodigo = cod => createHash("sha256").update("cod:" + cod).digest("hex");

function criarToken(email) {
  const corpo = Buffer.from(JSON.stringify({ e: email, exp: Date.now() + SESSAO_DIAS * 86400000 })).toString("base64url");
  return corpo + "." + createHmac("sha256", segredo()).update(corpo).digest("base64url");
}
function lerToken(tok) {
  const [corpo, sig] = String(tok || "").split(".");
  if (!corpo || !sig) return null;
  const a = Buffer.from(createHmac("sha256", segredo()).update(corpo).digest("base64url")), b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try { const d = JSON.parse(Buffer.from(corpo, "base64url").toString()); return d.exp > Date.now() ? d.e : null; } catch { return null; }
}

async function mandarCodigo(email, nome, motivo) {
  const cod = String(randomInt(100000, 1000000));
  const ok = await enviarEmail({
    para: email,
    assunto: `${cod} é o seu código da Kosen Sneakers`,
    texto: `Oi${nome ? ", " + nome.split(" ")[0] : ""}!\n\nSeu código para ${motivo} na Kosen Sneakers é: ${cod}\n\nDigite esse código no site para continuar. Ele vale por 15 minutos.\n\nSe você não pediu este código, pode ignorar este e-mail: nada muda na sua conta.\n\n${RODAPE_TEXTO}`,
    html: modeloEmail("Seu código de confirmação", `<p>Oi${nome ? ", " + String(nome.split(" ")[0]).replace(/[&<>"]/g, "") : ""}!</p><p>Use o código abaixo para ${motivo} na Kosen Sneakers:</p><p style="text-align:center;margin:22px 0"><span style="display:inline-block;background:#f5f2ec;border-radius:10px;padding:14px 22px;font-size:28px;font-weight:bold;letter-spacing:6px">${cod}</span></p><p>Digite esse código no site para continuar. Ele vale por <b>15 minutos</b>.</p><p style="color:#7a756c;font-size:13px">Se você não pediu este código, pode ignorar este e-mail: nada muda na sua conta.</p>`),
  });
  return ok ? { hash: hashCodigo(cod), exp: Date.now() + 15 * 60000, tent: 0 } : null;
}
function codigoValido(c, cod) {
  if (!c.codigo || c.codigo.exp < Date.now() || c.codigo.tent >= 5) return false;
  c.codigo.tent += 1;
  const a = Buffer.from(c.codigo.hash), b = Buffer.from(hashCodigo(String(cod || "").trim()));
  return a.length === b.length && timingSafeEqual(a, b);
}
const publico = c => ({ nome: c.nome, email: c.email, fone: c.fone || "", endereco: c.endereco || {} });

export default async (req, context) => {
  if (req.method !== "POST") return json({ erro: "Método não permitido" }, 405);
  let b = {};
  try { b = JSON.parse((await req.text()).slice(0, 10000) || "{}"); } catch { return json({ erro: "Pedido inválido" }, 400); }
  const ip = (context && context.ip) || "sem-ip";
  const email = normEmail(b.email);
  const st = contas();

  if (b.acao === "cadastrar") {
    const nome = limpa(b.nome, 80), senha = String(b.senha || "");
    if (nome.split(" ").filter(Boolean).length < 2) return json({ erro: "Informe nome e sobrenome." }, 400);
    if (!emailOk(email)) return json({ erro: "E-mail inválido." }, 400);
    if (senha.length < 8) return json({ erro: "A senha precisa ter pelo menos 8 caracteres." }, 400);
    if ((await contarTentativa("cad:" + createHash("sha256").update(ip).digest("hex").slice(0, 24), 60)) > 10)
      return json({ erro: "Muitos cadastros seguidos. Tente mais tarde." }, 429);
    const antiga = await st.get(kConta(email), { type: "json" });
    if (antiga && antiga.verificado) return json({ erro: "Este e-mail já tem conta. Use “Entrar” ou “Esqueci a senha”." }, 409);
    const codigo = await mandarCodigo(email, nome, "confirmar seu cadastro");
    if (!codigo) return json({ erro: "Não consegui enviar o e-mail agora. Tente de novo em instantes." }, 503);
    await st.setJSON(kConta(email), { email, nome, senha: hashSenha(senha), verificado: false, codigo, criadoEm: new Date().toISOString() });
    return json({ ok: true, msg: "Enviamos um código de 6 números para o seu e-mail." });
  }

  if (b.acao === "confirmar") {
    const c = await st.get(kConta(email), { type: "json" });
    if (!c) return json({ erro: "Cadastro não encontrado." }, 404);
    const ok = codigoValido(c, b.codigo);
    if (!ok) { await st.setJSON(kConta(email), c); return json({ erro: "Código inválido ou vencido." }, 400); }
    c.verificado = true; delete c.codigo;
    if (c.novaSenha) { c.senha = c.novaSenha; delete c.novaSenha; }
    await st.setJSON(kConta(email), c);
    return json({ token: criarToken(email), conta: publico(c) });
  }

  if (b.acao === "entrar") {
    const chave = "ent:" + createHash("sha256").update(email + "|" + ip).digest("hex").slice(0, 24);
    if ((await contarTentativa(chave, 15)) > 8) return json({ erro: "Muitas tentativas. Espere 15 minutos ou use “Esqueci a senha”." }, 429);
    const c = await st.get(kConta(email), { type: "json" });
    if (!c || !c.verificado || !confere(String(b.senha || ""), c.senha)) return json({ erro: "E-mail ou senha incorretos." }, 401);
    await zerarTentativas(chave);
    return json({ token: criarToken(email), conta: publico(c) });
  }

  if (b.acao === "esqueci") {
    const c = await st.get(kConta(email), { type: "json" });
    if (c && c.verificado) {
      if ((await contarTentativa("esq:" + kConta(email), 60)) <= 5) {
        const codigo = await mandarCodigo(email, c.nome, "criar uma nova senha");
        if (codigo) { c.codigo = codigo; await st.setJSON(kConta(email), c); }
      }
    }
    // resposta igual sempre, para não revelar quais e-mails têm conta
    return json({ ok: true, msg: "Se este e-mail tiver conta, enviamos um código para ele." });
  }

  if (b.acao === "redefinir") {
    const senha = String(b.senha || "");
    if (senha.length < 8) return json({ erro: "A senha precisa ter pelo menos 8 caracteres." }, 400);
    const c = await st.get(kConta(email), { type: "json" });
    if (!c || !c.verificado) return json({ erro: "Código inválido ou vencido." }, 400);
    const ok = codigoValido(c, b.codigo);
    if (!ok) { await st.setJSON(kConta(email), c); return json({ erro: "Código inválido ou vencido." }, 400); }
    c.senha = hashSenha(senha); delete c.codigo;
    await st.setJSON(kConta(email), c);
    return json({ token: criarToken(email), conta: publico(c) });
  }

  // ---- daqui pra baixo precisa estar logada ----
  const logado = lerToken((req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""));
  if (!logado) return json({ erro: "Sessão expirada. Entre de novo." }, 401);
  const c = await st.get(kConta(logado), { type: "json" });
  if (!c || !c.verificado) return json({ erro: "Sessão expirada. Entre de novo." }, 401);

  if (b.acao === "eu") {
    const peds = (await pedidosDoEmail(logado)).map(p => ({
      id: p.id, criadoEm: p.criadoEm, status: p.status, statusTexto: STATUS[p.status] || p.status, metodo: p.metodo,
      total: p.total, frete: p.frete, rastreio: p.rastreio || "", itens: p.itens,
      entrega: p.cliente ? { rua: p.cliente.rua, numero: p.cliente.numero, comp: p.cliente.comp, bairro: p.cliente.bairro, cidade: p.cliente.cidade, uf: p.cliente.uf, cep: p.cliente.cep } : null,
      historico: (p.historico || []).map(h => ({ status: STATUS[h.status] || h.status, em: h.em })),
    }));
    return json({ conta: publico(c), pedidos: peds });
  }

  if (b.acao === "salvar") {
    const e = b.endereco || {};
    c.nome = limpa(b.nome, 80) || c.nome;
    c.fone = limpa(b.fone, 20).replace(/\D/g, "");
    c.endereco = { cep: limpa(e.cep, 9).replace(/\D/g, ""), rua: limpa(e.rua), numero: limpa(e.numero, 10), comp: limpa(e.comp, 60),
      bairro: limpa(e.bairro, 60), cidade: limpa(e.cidade, 60), uf: limpa(e.uf, 2).toUpperCase() };
    await st.setJSON(kConta(logado), c);
    return json({ conta: publico(c) });
  }

  if (b.acao === "trocarSenha") {
    if (!confere(String(b.atual || ""), c.senha)) return json({ erro: "Senha atual incorreta." }, 400);
    if (String(b.nova || "").length < 8) return json({ erro: "A nova senha precisa ter pelo menos 8 caracteres." }, 400);
    c.senha = hashSenha(String(b.nova)); await st.setJSON(kConta(logado), c);
    return json({ ok: true });
  }

  return json({ erro: "Ação desconhecida" }, 400);
};

export const config = {
  path: "/api/conta",
  method: "POST",
  rateLimit: { windowLimit: 40, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
