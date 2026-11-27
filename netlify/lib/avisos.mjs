// Avisos de venda: e-mail (Gmail com "senha de app") e WhatsApp (CallMeBot).
// Chaves no Netlify (Environment variables):
//   GMAIL_USER          = usekosen@gmail.com
//   GMAIL_APP_PASSWORD  = senha de app de 16 letras gerada no Google
//   AVISO_EMAIL         = e-mail que recebe os avisos (se vazio, usa GMAIL_USER)
//   CALLMEBOT_PHONE     = 5546999368728   (número que recebe o aviso no WhatsApp)
//   CALLMEBOT_APIKEY    = chave que o CallMeBot manda por WhatsApp
// Se alguma chave faltar, aquele aviso é só pulado — a venda nunca quebra por causa disso.

const env = k => (globalThis.Netlify ? Netlify.env.get(k) : process.env[k]) || "";
const brl = v => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Modelo de e-mail com a marca da loja (HTML simples + rodapé com os dados da empresa).
// E-mails com marca, texto completo e dados de contato caem menos no spam do que mensagens curtas só com código.
export const RODAPE_TEXTO = "Kosen Sneakers · CNPJ 66.966.835/0001-09\nWhatsApp (46) 99936-8728 · usekosen@gmail.com\nhttps://usekosen.com.br";
export function modeloEmail(titulo, corpoHtml) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:0;background:#f5f2ec">
<div style="max-width:520px;margin:0 auto;padding:24px 16px;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
  <div style="text-align:center;padding:8px 0 18px;font-size:20px;font-weight:bold;letter-spacing:2px">KOSEN SNEAKERS</div>
  <div style="background:#ffffff;border-radius:12px;padding:24px 22px;font-size:15px;line-height:1.6">
    <h1 style="font-size:18px;margin:0 0 14px">${esc(titulo)}</h1>
    ${corpoHtml}
  </div>
  <div style="text-align:center;font-size:12px;color:#7a756c;line-height:1.6;padding:18px 8px 0">
    Kosen Sneakers · CNPJ 66.966.835/0001-09<br>
    WhatsApp (46) 99936-8728 · <a href="mailto:usekosen@gmail.com" style="color:#7a756c">usekosen@gmail.com</a><br>
    <a href="https://usekosen.com.br" style="color:#7a756c">usekosen.com.br</a>
  </div>
</div></body></html>`;
}

export function resumoTexto(p) {
  const itens = (p.itens || []).map(i => `• ${i.q}x ${i.nome} — Nº ${i.t} — ${brl(i.unit * i.q)}`).join("\n");
  const c = p.cliente || {};
  return `Pedido ${p.id} (${p.metodo === "pix" ? "PIX" : "Cartão"})\n${itens}\nTotal: ${brl(p.total)}\n\n` +
    `Cliente: ${c.nome}\nWhatsApp: ${c.fone}\nE-mail: ${c.email}\n` +
    `Entrega: ${c.rua}, ${c.numero} ${c.comp || ""} — ${c.bairro} — ${c.cidade}/${c.uf} — CEP ${c.cep}\n` +
    `Frete: ${p.frete ? `${p.frete.nome} ${p.frete.prazo || ""}` : "-"}`;
}

export async function enviarEmail({ para, assunto, texto, html }) {
  const user = env("GMAIL_USER"), pass = env("GMAIL_APP_PASSWORD");
  if (!user || !pass || !para) return false;
  try {
    const nodemailer = (await import("nodemailer")).default;
    const t = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
    await t.sendMail({ from: `"Kosen Sneakers" <${user}>`, replyTo: user, to: para, subject: assunto, text: texto, html });
    return true;
  } catch (e) {
    console.error("E-mail falhou:", e.message);
    return false;
  }
}

export async function enviarWhats(texto) {
  const phone = env("CALLMEBOT_PHONE"), key = env("CALLMEBOT_APIKEY");
  if (!phone || !key) return false;
  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&apikey=${encodeURIComponent(key)}&text=${encodeURIComponent(texto.slice(0, 1500))}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    return r.ok;
  } catch (e) {
    console.error("WhatsApp falhou:", e.message);
    return false;
  }
}

// Venda aprovada: avisa a loja (e-mail + WhatsApp) e confirma para a cliente (e-mail).
export async function avisarVendaPaga(p) {
  const txt = resumoTexto(p);
  const lojaMail = env("AVISO_EMAIL") || env("GMAIL_USER");
  await Promise.all([
    enviarEmail({ para: lojaMail, assunto: `💰 Venda paga ${p.id} — ${brl(p.total)}`, texto: txt }),
    enviarWhats(`💰 *VENDA PAGA* na Kosen\n\n${txt}`),
    enviarEmail({
      para: p.cliente?.email,
      assunto: `Kosen Sneakers — pedido ${p.id} confirmado`,
      texto: `Oi, ${(p.cliente?.nome || "").split(" ")[0]}! Recebemos o pagamento do seu pedido ${p.id}.\n\n${(p.itens || []).map(i => `• ${i.q}x ${i.nome} — Nº ${i.t}`).join("\n")}\n\nTotal: ${brl(p.total)}\n\nAssim que for postado, mandamos o código de rastreio. Qualquer dúvida, é só responder este e-mail.\n\n${RODAPE_TEXTO}`,
      html: modeloEmail("Pagamento confirmado", `<p>Oi, ${esc((p.cliente?.nome || "").split(" ")[0])}! Recebemos o pagamento do seu pedido <b>${esc(p.id)}</b>. Obrigada por comprar com a gente!</p><ul>${(p.itens || []).map(i => `<li>${i.q}x ${esc(i.nome)} — Nº ${i.t}</li>`).join("")}</ul><p>Total: <b>${brl(p.total)}</b></p><p>Assim que o pedido for postado, mandamos o código de rastreio por aqui. Você também acompanha tudo em <b>Minha conta → Meus pedidos</b> no site.</p><p>Qualquer dúvida, é só responder este e-mail ou chamar no WhatsApp.</p>`),
    }),
  ]);
}

export async function avisarEnvio(p) {
  if (!p.rastreio) return;
  const nome = (p.cliente?.nome || "").split(" ")[0];
  await enviarEmail({
    para: p.cliente?.email,
    assunto: `Kosen Sneakers — seu pedido ${p.id} foi enviado`,
    texto: `Oi, ${nome}! Seu pedido ${p.id} foi postado.\nCódigo de rastreio: ${p.rastreio}\nPara acompanhar, cole o código em https://www.melhorrastreio.com.br\n\n${RODAPE_TEXTO}`,
    html: modeloEmail("Seu pedido foi enviado", `<p>Oi, ${esc(nome)}! Seu pedido <b>${esc(p.id)}</b> foi postado.</p><p>Código de rastreio:<br><b style="font-size:20px;letter-spacing:1px">${esc(p.rastreio)}</b></p><p>Para acompanhar, cole o código em <a href="https://www.melhorrastreio.com.br">melhorrastreio.com.br</a>. Você também vê o rastreio em <b>Minha conta → Meus pedidos</b> no site.</p><p>Qualquer dúvida, é só responder este e-mail ou chamar no WhatsApp.</p>`),
  });
}
