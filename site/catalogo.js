/* ============================================================
   CATÁLOGO DA KOSEN — fonte única de preços.
   O site e o checkout (servidor) leem ESTE arquivo.
   Mudou preço, produto ou estoque aqui → publique de novo.
   ============================================================ */
/* ============================================================
   CONFIGURAÇÃO DA LOJA — troque aqui
   ============================================================ */
export const LOJA = {
  nome: "Kosen Sneakers",
  whatsapp: "5546999368728",          // 55 + DDD + número que recebe os pedidos
  whatsappTexto: "(46) 9 9936-8728",
  freteSempreGratis: true,            // true = frete grátis em TODOS os pedidos (o Melhor Envio só mostra o prazo)
  freteGratisAcima: 399.90,           // só vale se freteSempreGratis for false
  descontoPix: 0.05,
  parcelas: 6,
  // FRETE (Melhor Envio) — CEP de onde o fornecedor despacha. Deixe "" para usar a estimativa fixa.
  cepOrigem: "01021-200",   // fornecedor: Rua 25 de Março, 821, box 6 — São Paulo/SP
  caixa: { largura: 22, altura: 13, comprimento: 33, peso: 1.0 },   // caixa de tênis embalada (cm / kg)
  diasPostagem: 1,                                                   // dias até o fornecedor postar
  transportadoras: ["PAC", "SEDEX", ".Package", "J&T", "Loggi Express"], // quais aparecem no site
  levePares: 2, descontoPares: 0.10,  // leve 2 pares = 10% OFF
  avisos: [
    "<b>FRETE GRÁTIS</b> para todo o Brasil",
    "<b>6x SEM JUROS</b> no cartão",
    "<b>5% OFF</b> pagando no PIX",
    "<b>LEVE 2 PARES</b> e ganhe 10% OFF",
    "Primeira <b>TROCA GRÁTIS</b>",
    "Envio em até <b>24h úteis</b>"
  ]
};

/* ============================================================
   PRODUTOS — quando chegarem as fotos, use  img: "nome-da-foto.jpg"
   g: "F" feminino | "M" masculino
   estilo: "Casual" | "Plataforma" | "Esportivo" | "Slip-on"
   tags: "new" lançamento · "best" mais vendido · "outlet" · "pre" pré-venda
   ============================================================ */
export const FEM = [33,34,35,36,37,38,39,40], MASC = [37,38,39,40,41,42,43,44];
export const PRODUTOS = [
  {id:1, nome:"Tênis Plataforma Cloud Off White", g:"F", estilo:"Plataforma", cor:"#f4f1ea", det:"#d8cfbf", sola:"#ffffff", preco:299.90, de:null,  tags:["new","best"], tam:FEM, esgotado:[33]},
  {id:2, nome:"Tênis Casual Nude Couro",          g:"F", estilo:"Casual",     cor:"#e2c9b3", det:"#c9a88c", sola:"#f7f3ec", preco:269.90, de:null,  tags:["best"], tam:FEM, esgotado:[]},
  {id:3, nome:"Tênis Chunky Areia",               g:"F", estilo:"Plataforma", cor:"#d6cbb6", det:"#191919", sola:"#efe8db", preco:329.90, de:379.90,tags:["outlet"], tam:FEM, esgotado:[39,40]},
  {id:4, nome:"Tênis Slip-on Preto Knit",         g:"F", estilo:"Slip-on",    cor:"#1f1f1f", det:"#3a3a3a", sola:"#ffffff", preco:219.90, de:null,  tags:["new"], tam:FEM, esgotado:[]},
  {id:5, nome:"Tênis Runner Rosé",                g:"F", estilo:"Esportivo",  cor:"#e7c6c2", det:"#ffffff", sola:"#f6f2ee", preco:289.90, de:null,  tags:["pre"], pre:"10/12", tam:FEM, esgotado:[]},
  {id:6, nome:"Tênis Plataforma Preto e Branco",  g:"F", estilo:"Plataforma", cor:"#ffffff", det:"#191919", sola:"#191919", preco:309.90, de:null,  tags:["new"], tam:FEM, esgotado:[]},
  {id:7, nome:"Tênis Casual Verde Oliva",         g:"F", estilo:"Casual",     cor:"#8f9775", det:"#f2efe7", sola:"#f2efe7", preco:249.90, de:289.90,tags:["outlet"], tam:FEM, esgotado:[34]},
  {id:8, nome:"Tênis Retrô Bege e Marrom",        g:"F", estilo:"Casual",     cor:"#efe6d6", det:"#7a5a43", sola:"#e5d7bd", preco:279.90, de:null,  tags:["best"], tam:FEM, esgotado:[]},
  {id:9, nome:"Tênis Slip-on Caramelo Camurça",   g:"F", estilo:"Slip-on",    cor:"#b98656", det:"#9a6c43", sola:"#f4efe6", preco:199.90, de:239.90,tags:["outlet","best"], tam:FEM, esgotado:[]},
  {id:10,nome:"Tênis Runner Branco Gelo",         g:"F", estilo:"Esportivo",  cor:"#f3f3f1", det:"#bfc6c9", sola:"#ffffff", preco:259.90, de:null,  tags:["new"], tam:FEM, esgotado:[]},
  {id:11,nome:"Tênis Plataforma Bordô",           g:"F", estilo:"Plataforma", cor:"#6e2a30", det:"#f2ece2", sola:"#f2ece2", preco:319.90, de:null,  tags:["new"], tam:FEM, esgotado:[]},
  {id:12,nome:"Tênis Casual Preto Total",         g:"F", estilo:"Casual",     cor:"#191919", det:"#191919", sola:"#2a2a2a", preco:259.90, de:null,  tags:[], tam:FEM, esgotado:[]},
  {id:13,nome:"Tênis Casual Masculino Off White", g:"M", estilo:"Casual",     cor:"#efebe3", det:"#191919", sola:"#ffffff", preco:289.90, de:null,  tags:["new"], tam:MASC, esgotado:[]},
  {id:14,nome:"Tênis Runner Masculino Grafite",   g:"M", estilo:"Esportivo",  cor:"#4a4b4d", det:"#e8e4db", sola:"#e8e4db", preco:319.90, de:null,  tags:["best"], tam:MASC, esgotado:[44]},
  {id:15,nome:"Tênis Couro Masculino Preto",      g:"M", estilo:"Casual",     cor:"#1d1d1d", det:"#e8e4db", sola:"#e8e4db", preco:299.90, de:349.90,tags:["outlet"], tam:MASC, esgotado:[]},
  {id:16,nome:"Tênis Slip-on Masculino Areia",    g:"M", estilo:"Slip-on",    cor:"#cbbfa7", det:"#a6977c", sola:"#ffffff", preco:229.90, de:null,  tags:[], tam:MASC, esgotado:[]},
];

/* ITEM DE TESTE — R$ 10, sem frete e sem desconto.
   Só aparece no site abrindo o endereço com ?teste  (ex.: kosen-checkout.netlify.app/?teste)
   Para tirar: apague as 4 linhas abaixo e publique de novo. */
const ITEM_TESTE = {id:999,nome:"Item de teste (pagamento R$ 10)", g:"F", estilo:"Casual", cor:"#e8e4db", det:"#191919", sola:"#ffffff", preco:10.00, de:null, tags:["new"], tam:[36], esgotado:[], teste:true};
const verTeste = typeof location === "undefined" || /[?&]teste/.test(location.search);
if (verTeste) PRODUTOS.push(ITEM_TESTE);
export const ESTILOS = ["Casual","Plataforma","Esportivo","Slip-on"];

/* ============================================================
   FRETE — estimativa por região (Sul/Sudeste x demais).
   Trocar por Melhor Envio/Correios quando houver contrato.
   ============================================================ */
export function opcoesFrete(cep){
  const c = String(cep||"").replace(/\D/g,"");
  if(c.length!==8) return null;
  const ss = [0,1,2,3,8,9].includes(+c[0]);
  return [
    {nome:"PAC",   valor: ss?24.90:39.90, prazo: ss?"5 a 8 dias úteis":"8 a 12 dias úteis"},
    {nome:"SEDEX", valor: ss?39.90:64.90, prazo: ss?"2 a 4 dias úteis":"4 a 7 dias úteis"}
  ];
}

const r2 = v => Math.round(v*100)/100;

/* Calcula o pedido. itens = [{id, t, q}], opcoes = lista de fretes (da cotação),
   freteId = opção escolhida, metodo = "pix" | "cartao".
   Usado no site (para mostrar) e no servidor (para cobrar).
   Com LOJA.freteSempreGratis, o frete é sempre R$ 0 (só a opção mais barata, para mostrar o prazo).
   Senão, frete grátis acima de LOJA.freteGratisAcima vale para a opção mais barata. */
export function calcPedido(itens, opcoes, freteId, metodo){
  const linhas = [];
  for(const i of (itens||[])){
    const p = PRODUTOS.find(x=>x.id===Number(i.id));
    const t = Number(i.t), q = Math.floor(Number(i.q));
    if(!p) throw new Error("Produto não encontrado");
    if(!p.tam.includes(t) || p.esgotado.includes(t)) throw new Error(`${p.nome} nº ${t} indisponível`);
    if(!(q>=1 && q<=10)) throw new Error("Quantidade inválida");
    linhas.push({p, t, q});
  }
  if(!linhas.length) throw new Error("Sacola vazia");
  if(linhas.every(l=>l.p.teste)){
    const total = r2(linhas.reduce((s,l)=>s+l.p.preco*l.q,0));
    return { itens:linhas.map(l=>({...l, unit:l.p.preco})), pares:linhas.reduce((s,l)=>s+l.q,0), sub:total, base:total, gratis:true, frete:{id:"teste",nome:"Teste",valor:0,prazo:""}, opcoes:[], total };
  }
  if(linhas.some(l=>l.p.teste)) throw new Error("O item de teste deve ser comprado sozinho");
  const pares = linhas.reduce((s,l)=>s+l.q,0);
  const fator = (pares>=LOJA.levePares ? 1-LOJA.descontoPares : 1) * (metodo==="pix" ? 1-LOJA.descontoPix : 1);
  const itensCobrados = linhas.map(l=>({...l, unit:r2(l.p.preco*fator)}));
  const sub = r2(linhas.reduce((s,l)=>s+l.p.preco*l.q,0));
  const base = r2(sub*(pares>=LOJA.levePares ? 1-LOJA.descontoPares : 1));
  const gratis = LOJA.freteSempreGratis || base>=LOJA.freteGratisAcima;
  let ops = (opcoes||[]).slice().sort((a,b)=>a.valor-b.valor);
  if(LOJA.freteSempreGratis) ops = ops.slice(0,1);
  ops = ops.map((o,k)=>({...o, valor: (gratis && k===0) ? 0 : r2(o.valor)}));
  const op = ops.find(o=>String(o.id)===String(freteId)) || ops[0] || null;
  const produtos = r2(itensCobrados.reduce((s,l)=>s+l.unit*l.q,0));
  return { itens:itensCobrados, pares, sub, base, gratis, frete:op, opcoes:ops, total:r2(produtos+(op?op.valor:0)) };
}
