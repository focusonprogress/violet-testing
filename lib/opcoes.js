// Leitura das opcoes da linha de comando e montagem do lote, sem falar com a Roblox.
"use strict";

const MODOS = {
  sequencial: "sequential",
  misto: "mixed",
  aleatorio: "random",
  fixo: "fixed",
};

const SEPARADORES = {
  nenhum: "",
  "": "",
  _: "_",
  "-": "-",
  ".": ".",
  espaco: " ",
};

const MAX_LOTE = 25;

const AJUDA = `
Uso: node criar-gamepass.js [opcoes]

Sem --experiencia: mostra a conta do cookie e lista as experiencias dela.
Sem --criar: so mostra o que seria criado (nada e enviado para a Roblox).

  --violet <pasta>          pasta do violet-utilities (padrao: ../violet-utilities)
  --experiencia <id|link>   ID da experiencia, link do jogo ou link do Creator Hub
  --prefixo <texto>         prefixo dos nomes (ex.: davizin)
  --modo <modo>             sequencial | misto | aleatorio | fixo (padrao: sequencial)
  --separador <sep>         nenhum | _ | - | . | espaco (padrao: _)
  --inicio <n>              primeiro numero (padrao: 1)
  --digitos <n>             1, 2 ou 3 digitos minimos (padrao: 1)
  --quantidade <n>          quantas gamepasses, ate ${MAX_LOTE} (padrao: 1)
  --preco <robux>           preco de todas (padrao: 9999)
  --precos <lista>          um preco para cada, ex.: 100,200,500 (ignora --quantidade/--preco)
  --descricao <texto>       descricao; {nome} e {n} sao trocados
  --regional                liga o preco regional (padrao: desligado)
  --intervalo <segundos>    tempo entre criacoes, 0 a 60 (padrao: 3)
  --criar                   cria de verdade na Roblox
  --sim                     nao pede confirmacao antes de criar
  --ajuda                   mostra esta ajuda
`;

const FLAGS_SEM_VALOR = new Set(["criar", "sim", "regional", "ajuda"]);

function lerArgumentos(argv) {
  const brutos = {};
  for (let i = 0; i < argv.length; i += 1) {
    const atual = argv[i];
    if (!atual.startsWith("--")) throw new Error(`Argumento inesperado: ${atual}`);
    const [chave, valorInline] = atual.slice(2).split(/=(.*)/s, 2);
    if (FLAGS_SEM_VALOR.has(chave)) {
      brutos[chave] = true;
      continue;
    }
    const valor = valorInline ?? argv[i + 1];
    if (valorInline === undefined) i += 1;
    if (valor === undefined) throw new Error(`Falta o valor de --${chave}`);
    brutos[chave] = valor;
  }
  return brutos;
}

function inteiro(valor, nome, min, max, padrao) {
  if (valor === undefined) return padrao;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < min || numero > max) {
    throw new Error(`--${nome} deve ser um numero inteiro entre ${min} e ${max}.`);
  }
  return numero;
}

function normalizarOpcoes(brutos) {
  const conhecidas = new Set([
    "violet", "experiencia", "prefixo", "modo", "separador", "inicio", "digitos",
    "quantidade", "preco", "precos", "descricao", "regional", "intervalo", "criar", "sim", "ajuda",
  ]);
  for (const chave of Object.keys(brutos)) {
    if (!conhecidas.has(chave)) throw new Error(`Opcao desconhecida: --${chave}`);
  }

  const modoTexto = String(brutos.modo || "sequencial").toLowerCase();
  if (!MODOS[modoTexto]) throw new Error("--modo deve ser sequencial, misto, aleatorio ou fixo.");

  const separadorTexto = brutos.separador === undefined ? "_" : String(brutos.separador).toLowerCase();
  if (!(separadorTexto in SEPARADORES)) throw new Error("--separador deve ser nenhum, _, -, . ou espaco.");

  return {
    violet: brutos.violet,
    experiencia: brutos.experiencia,
    prefixo: brutos.prefixo,
    modo: MODOS[modoTexto],
    separador: SEPARADORES[separadorTexto],
    inicio: inteiro(brutos.inicio, "inicio", 0, 1_000_000, 1),
    digitos: inteiro(brutos.digitos, "digitos", 1, 3, 1),
    quantidade: inteiro(brutos.quantidade, "quantidade", 1, MAX_LOTE, 1),
    preco: inteiro(brutos.preco, "preco", 1, 1_000_000_000, 9999),
    precos: brutos.precos,
    descricao: brutos.descricao === undefined ? "" : String(brutos.descricao),
    regional: brutos.regional === true,
    intervalo: inteiro(brutos.intervalo, "intervalo", 0, 60, 3),
    criar: brutos.criar === true,
    sim: brutos.sim === true,
    ajuda: brutos.ajuda === true,
  };
}

// nomes: modulo name-variations.ts do violet-utilities (o mesmo que o site usa).
function montarLote(opcoes, nomes) {
  if (!opcoes.prefixo || !String(opcoes.prefixo).trim()) {
    throw new Error("Informe --prefixo (ex.: --prefixo davizin).");
  }

  let precos;
  if (opcoes.precos !== undefined) {
    const { prices, invalid } = nomes.parsePriceList(String(opcoes.precos));
    if (invalid.length) throw new Error(`Precos invalidos em --precos: ${invalid.join(", ")}`);
    if (prices.length === 0) throw new Error("--precos esta vazio.");
    if (prices.length > MAX_LOTE) throw new Error(`--precos aceita no maximo ${MAX_LOTE} valores.`);
    precos = prices;
  } else {
    precos = Array.from({ length: opcoes.quantidade }, () => opcoes.preco);
  }

  const lista = nomes.generateGamepassNames({
    prefix: String(opcoes.prefixo),
    count: precos.length,
    mode: opcoes.modo,
    separator: opcoes.separador,
    start: opcoes.inicio,
    padding: opcoes.digitos,
  });

  return lista.map((nome, indice) => ({
    name: nome,
    price: precos[indice],
    description: nomes.renderDescription(opcoes.descricao, nome, indice + 1),
  }));
}

module.exports = { AJUDA, MAX_LOTE, lerArgumentos, montarLote, normalizarOpcoes };
