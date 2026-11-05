#!/usr/bin/env node
// Testa a criacao de gamepasses direto na Roblox usando o MESMO codigo do site
// (branch feat/criar-gamepass do violet-utilities), sem site, banco ou login Discord.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const { pathToFileURL } = require("node:url");

const { AJUDA, lerArgumentos, montarLote, normalizarOpcoes } = require("./lib/opcoes");

// O gerador de nomes do site e um .ts sem "type": "module"; o Node avisa ao carregar. So ruido aqui.
process.removeAllListeners("warning");
process.on("warning", (aviso) => {
  if (aviso.code === "MODULE_TYPELESS_PACKAGE_JSON" || aviso.name === "ExperimentalWarning") return;
  console.warn(aviso);
});

function sair(mensagem) {
  console.error(`\n✖ ${mensagem}\n`);
  process.exit(1);
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function perguntar(texto, { oculto = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (oculto) {
      // Nao ecoa o que e digitado/colado (o cookie nunca aparece na tela).
      rl._writeToOutput = (s) => {
        if (s.includes(texto)) rl.output.write(texto);
      };
    }
    rl.question(texto, (resposta) => {
      rl.close();
      if (oculto) process.stdout.write("\n");
      resolve(resposta.trim());
    });
  });
}

async function carregarViolet(pastaInformada) {
  if (!process.features.typescript) {
    sair(`Use Node 24 ou mais novo (voce esta no ${process.version}).`);
  }

  const pasta = path.resolve(pastaInformada || process.env.VIOLET_DIR || path.join(__dirname, "..", "violet-utilities"));
  const criarPath = path.join(pasta, "backend/src/gamepass/gamepass-create.js");
  const nomesPath = path.join(pasta, "frontend/src/features/gamepass-create/name-variations.ts");

  if (!fs.existsSync(path.join(pasta, "package.json"))) {
    sair(`Nao achei o violet-utilities em ${pasta}. Use --violet <pasta> ou VIOLET_DIR.`);
  }
  if (!fs.existsSync(criarPath) || !fs.existsSync(nomesPath)) {
    sair(`O violet-utilities em ${pasta} nao tem a aba Criar Gamepass. Rode la: git checkout feat/criar-gamepass`);
  }
  if (!fs.existsSync(path.join(pasta, "node_modules"))) {
    sair(`Faltam as dependencias do violet-utilities. Rode em ${pasta}: npm install --ignore-scripts`);
  }

  const criar = require(criarPath);
  const { robloxRequest } = require(path.join(pasta, "backend/src/roblox/client.js"));
  const { publicError } = require(path.join(pasta, "backend/src/utils/security.js"));
  const nomes = await import(pathToFileURL(nomesPath).href);
  return { pasta, criar, robloxRequest, publicError, nomes };
}

async function lerCookie() {
  const doAmbiente = process.env.VIOLET_ROBLOX_COOKIE;
  if (doAmbiente) return doAmbiente.trim();
  const cookie = await perguntar("Cole o cookie .ROBLOSECURITY da conta de TESTE (nao aparece na tela): ", { oculto: true });
  if (!cookie) sair("Cookie vazio.");
  return cookie;
}

function mensagemDeErro(erro, publicError) {
  try {
    return publicError(erro);
  } catch {
    return erro?.message || String(erro);
  }
}

async function main() {
  let opcoes;
  try {
    opcoes = normalizarOpcoes(lerArgumentos(process.argv.slice(2)));
  } catch (erro) {
    console.log(AJUDA);
    sair(erro.message);
  }
  if (opcoes.ajuda) {
    console.log(AJUDA);
    return;
  }

  const violet = await carregarViolet(opcoes.violet);
  console.log(`Usando o codigo de: ${violet.pasta}`);

  const cookie = await lerCookie();

  // 1. De quem e o cookie
  let conta;
  try {
    conta = await violet.robloxRequest("https://users.roblox.com/v1/users/authenticated", { method: "GET" }, cookie);
  } catch (erro) {
    sair(erro?.status === 401 ? "Cookie invalido ou expirado." : `A Roblox recusou o cookie: ${mensagemDeErro(erro, violet.publicError)}`);
  }
  console.log(`\nConta: ${conta.name} (ID ${conta.id})`);

  // 2. Sem experiencia: lista as experiencias e para
  if (!opcoes.experiencia) {
    let experiencias = [];
    try {
      experiencias = await violet.criar.listAccountUniverses({ robloxUserId: conta.id, robloxCookie: cookie });
    } catch (erro) {
      sair(`Nao consegui listar as experiencias: ${mensagemDeErro(erro, violet.publicError)}`);
    }
    if (experiencias.length === 0) {
      console.log("Nenhuma experiencia encontrada nesta conta (isso e o que a aba do site tambem mostraria).");
    } else {
      console.log(`\nExperiencias da conta (${experiencias.length}) — e o que a aba do site vai listar:`);
      for (const exp of experiencias) console.log(`  • ${exp.name}  →  --experiencia ${exp.universeId}`);
    }
    console.log("\nProximo passo: rode de novo com --experiencia <ID> --prefixo <nome> para ver a previa.\n");
    return;
  }

  // 3. Resolve a experiencia (ID, link do jogo ou link do Creator Hub)
  let experiencia;
  try {
    experiencia = await violet.criar.resolveUniverse(opcoes.experiencia);
  } catch (erro) {
    sair(mensagemDeErro(erro, violet.publicError));
  }
  console.log(`Experiencia: ${experiencia.name} (ID ${experiencia.universeId})${experiencia.creatorName ? ` — dono: ${experiencia.creatorName}` : ""}`);

  // 4. Monta e valida o lote com as mesmas regras do backend
  let lote;
  try {
    lote = montarLote(opcoes, violet.nomes).map((item) => ({
      ...item,
      ...violet.criar.normalizeCreatePayload({
        universeId: experiencia.universeId,
        name: item.name,
        description: item.description,
        price: item.price,
        regionalPricing: opcoes.regional,
      }),
    }));
  } catch (erro) {
    sair(mensagemDeErro(erro, violet.publicError));
  }

  const total = lote.reduce((soma, item) => soma + item.price, 0);
  console.log(`\nPrevia: ${lote.length} gamepass(es), ${total} Robux no total, preco regional ${opcoes.regional ? "LIGADO" : "desligado"}, intervalo ${opcoes.intervalo}s`);
  lote.forEach((item, i) => console.log(`  ${String(i + 1).padStart(2)}. ${item.name.padEnd(30)} ${item.price} R$${item.description ? `  — "${item.description}"` : ""}`));

  if (!opcoes.criar) {
    console.log("\nNada foi criado. Para criar de verdade, repita o comando com --criar.\n");
    return;
  }

  if (!opcoes.sim) {
    const resposta = await perguntar(`\nCriar ${lote.length} gamepass(es) de verdade em "${experiencia.name}"? Digite SIM: `);
    if (resposta.toUpperCase() !== "SIM") sair("Cancelado. Nada foi criado.");
  }

  // 5. Cria uma por vez, como a aba do site faz
  const criadas = [];
  for (let i = 0; i < lote.length; i += 1) {
    const item = lote[i];
    process.stdout.write(`  [${i + 1}/${lote.length}] ${item.name} ... `);
    try {
      const gamepass = await violet.criar.createGamePassForAccount(
        {
          universeId: experiencia.universeId,
          name: item.name,
          description: item.description,
          price: item.price,
          regionalPricing: opcoes.regional,
        },
        { robloxCookie: cookie },
      );
      criadas.push(gamepass);
      console.log(`OK  ID ${gamepass.gamePassId}  ${gamepass.url}`);
    } catch (erro) {
      console.log("ERRO");
      console.error(`\n✖ Parou aqui: ${mensagemDeErro(erro, violet.publicError)}`);
      if (erro?.status) console.error(`  (status HTTP da Roblox: ${erro.status})`);
      break;
    }
    if (opcoes.intervalo > 0 && i < lote.length - 1) await esperar(opcoes.intervalo * 1000);
  }

  console.log(`\n${criadas.length} de ${lote.length} criada(s).`);
  if (criadas.length) {
    console.log("Links:");
    for (const gamepass of criadas) console.log(`  ${gamepass.url}`);
    console.log("\nConfira no Creator Hub: nome, preco, descricao e se o preco regional ficou como esperado.\n");
  }
  if (criadas.length < lote.length) process.exitCode = 1;
}

main().catch((erro) => sair(erro?.message || String(erro)));
