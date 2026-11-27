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
  {
    "id": 101,
    "nome": "On Cloudsurfer Max - Off-Amêndoa",
    "g": "F",
    "estilo": "Esportivo",
    "cor": "#eeeeee",
    "det": "#222222",
    "sola": "#ffffff",
    "preco": 301.52,
    "de": null,
    "tags": [
      "new"
    ],
    "tam": [
      33,
      34,
      35,
      36,
      37,
      38,
      39,
      40,
      41,
      42,
      43,
      44
    ],
    "esgotado": [],
    "img": "fotos/off-amendoa-1.webp",
    "imgs": [
      "fotos/off-amendoa-1.webp",
      "fotos/off-amendoa-2.webp",
      "fotos/off-amendoa-3.webp",
      "fotos/off-amendoa-4.webp",
      "fotos/off-amendoa-5.webp"
    ]
  },
  {
    "id": 102,
    "nome": "On Cloudsurfer Max - Gelo-Preto",
    "g": "F",
    "estilo": "Esportivo",
    "cor": "#eeeeee",
    "det": "#222222",
    "sola": "#ffffff",
    "preco": 301.52,
    "de": null,
    "tags": [
      "new"
    ],
    "tam": [
      33,
      34,
      35,
      36,
      37,
      38,
      39,
      40,
      41,
      42,
      43,
      44
    ],
    "esgotado": [],
    "img": "fotos/gelo-preto-1.webp",
    "imgs": [
      "fotos/gelo-preto-1.webp",
      "fotos/gelo-preto-2.webp",
      "fotos/gelo-preto-3.webp",
      "fotos/gelo-preto-4.webp",
      "fotos/gelo-preto-5.webp",
      "fotos/gelo-preto-6.webp"
    ]
  }
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
