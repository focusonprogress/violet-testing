# violet-testing

Testes manuais da [Violet Utilities](https://violetutilities.com) feitos **direto na Roblox**, sem mexer no site, no banco ou no login do Discord.

> ⚠️ Este repositório é **público**. Nunca coloque cookie, senha ou `.env` aqui. O script pede o cookie na hora e não salva nada.

## Criar Gamepass (`criar-gamepass.js`)

Testa a aba **Criar Gamepass** (PR `feat/criar-gamepass` do `violet-utilities`). O script **não tem uma cópia** da lógica: ele carrega o código da branch, que fica numa pasta ao lado. Se funcionar aqui, funciona no site.

O teste faz quatro coisas, em ordem:

1. Confere de qual conta é o cookie. O cookie nunca aparece na tela.
2. Lista as experiências da conta, que é o mesmo que a aba do site vai mostrar.
3. Mostra a **prévia** dos nomes e preços, sem criar nada.
4. Só com `--criar`: cria uma gamepass por vez, com intervalo entre elas, e mostra os links.

### Antes de começar (uma vez só)

Precisa do **Node 24** ou mais novo (`node -v`) e do **Git**.

Coloque os dois repositórios **na mesma pasta**:

```bash
git clone https://github.com/focusonprogress/violet-testing
```

```bash
git clone https://github.com/Lotus9024/violet-utilities
```

```bash
cd violet-utilities
```

```bash
git checkout feat/criar-gamepass
```

```bash
npm install --ignore-scripts
```

```bash
cd ../violet-testing
```

A estrutura fica assim:

```text
pasta/
├── violet-utilities/   (na branch feat/criar-gamepass)
└── violet-testing/
```

Se o `violet-utilities` estiver em outro lugar, use `--violet <pasta>`.

### Prepare um ambiente de teste seguro

- Use uma **conta alternativa**, não a conta principal.
- Na conta alternativa, crie no Creator Hub uma **experiência nova e vazia** só para teste.
- A Roblox **não deixa apagar gamepass**, só tirar da venda. Por isso use a experiência de teste.
- O preço padrão do script é **9999 Robux**, para ninguém comprar sem querer.

### Pegar o cookie da conta de teste

1. Entre na conta de teste em roblox.com, no navegador.
2. Aperte **F12**, vá em **Application** (Aplicativo), depois **Cookies** › `https://www.roblox.com`.
3. Copie o valor de `.ROBLOSECURITY`.

Esse cookie dá acesso total à conta. Não mande para ninguém e não cole em chat.

### Passo a passo do teste

**1. Ver a conta e as experiências.** O script pede o cookie: cole e aperte Enter (não aparece nada na tela, é normal).

```bash
node criar-gamepass.js
```

**2. Ver a prévia, sem criar nada.** Troque `123456` pelo ID que apareceu no passo 1. Também vale colar o link do jogo.

```bash
node criar-gamepass.js --experiencia 123456 --prefixo davizin --modo misto --quantidade 3
```

**3. Criar 1 gamepass de verdade.** O script pede para digitar `SIM` antes de criar.

```bash
node criar-gamepass.js --experiencia 123456 --prefixo davizin --quantidade 1 --criar
```

**4. Testar o lote, com intervalo e variação de nomes:**

```bash
node criar-gamepass.js --experiencia 123456 --prefixo davizin --modo misto --precos 9999,9998,9997 --intervalo 5 --descricao "Pass {nome} numero {n}" --criar
```

### O que conferir no Creator Hub

Abra a experiência de teste em **Monetização › Passes** e confira:

- [ ] O nome de cada gamepass bate com a prévia (ex.: `davizin1`, `davizin_2`, `davizin-3`).
- [ ] O preço está certo e a gamepass está **à venda**.
- [ ] A descrição apareceu, com `{nome}` e `{n}` trocados.
- [ ] O **preço regional** está **desligado**. Com `--regional`, deve estar ligado.
- [ ] O passo 1 listou as experiências da conta. Se veio vazio mas a conta tem jogos, avise: é o que a aba do site também mostraria.

Se algo der errado, o script para na hora e mostra a mesma mensagem que o site mostraria (cookie expirado, sem permissão, rate limit, nome recusado pelo filtro...), junto com o status HTTP da Roblox. Mande esse print para quem está desenvolvendo, **sem o cookie**.

### Todas as opções

```bash
node criar-gamepass.js --ajuda
```

| Opção | O que faz | Padrão |
| --- | --- | --- |
| `--experiencia` | ID da experiência, link do jogo ou link do Creator Hub | lista as experiências |
| `--prefixo` | prefixo dos nomes | obrigatório para a prévia |
| `--modo` | `sequencial`, `misto`, `aleatorio` ou `fixo` | `sequencial` |
| `--separador` | `nenhum`, `_`, `-`, `.` ou `espaco` | `_` |
| `--inicio` / `--digitos` | primeiro número e dígitos mínimos (1, 2 ou 3) | `1` / `1` |
| `--quantidade` / `--preco` | quantas (até 25) e o preço de todas | `1` / `9999` |
| `--precos` | um preço para cada, ex.: `100,200,500` | — |
| `--descricao` | descrição; `{nome}` e `{n}` são trocados | vazia |
| `--regional` | liga o preço regional | desligado |
| `--intervalo` | segundos entre criações (0 a 60) | `3` |
| `--criar` | cria de verdade | só prévia |
| `--sim` | não pede confirmação | pede `SIM` |

Em vez de colar o cookie toda vez, dá para usar a variável `VIOLET_ROBLOX_COOKIE`. Mas ela fica no histórico do terminal, então colar quando o script pedir é mais seguro.

## Testes do próprio script

```bash
npm test
```
