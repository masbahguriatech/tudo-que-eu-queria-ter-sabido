# 📖 Manual do fliperama

> Tudo sobre como esse projeto funciona por dentro: como jogar, o que fica salvo, como ele foi construído e como ele se protege.

---

## 🎮 Como jogar

O fliperama transforma os conteúdos do repositório em **fases**. Tu começa na fase 1 e, quando zera uma fase, a próxima é desbloqueada. Se preferir jogar fora de ordem, liga o **modo livre** em Opções.

### Como ganhar XP

| Ação | XP |
|---|---|
| Abrir uma fase pela primeira vez | +10 |
| Completar uma missão (os quadradinhos das listas de missões) | +15 |
| Zerar uma fase (ler até o fim e apertar o botão) | +100 |
| Desbloquear uma conquista | +50 |

A fase 3 tem dois cartuchos (gurias e guris). Zerar qualquer um deles conta como fase zerada, e jogar os dois desbloqueia uma conquista bônus.

### Níveis

| Nível | XP | Título |
|---|---|---|
| 1 | 0 | Primeiro spawn |
| 2 | 100 | Explorando o mapa |
| 3 | 300 | Formando a party |
| 4 | 600 | Missão em andamento |
| 5 | 1000 | Subindo de nível |
| 6 | 1500 | Modo multiplayer |
| 7 | 1900 | Lenda do fliperama |

---

## 💾 O que fica salvo

O progresso fica salvo no **localStorage** do teu navegador, que é um espacinho de memória que cada site tem no teu computador ou celular. Nada sai dali: não tem servidor, não tem conta, não tem cookie e não tem rastreamento.

O save guarda só isto:

- quais fases tu abriu e zerou
- quais missões tu marcou
- quais conquistas tu desbloqueou
- o apelido que tu escolheu (opcional, e só aparece pra ti)
- tuas preferências (modo livre e efeitos de tela)

O XP **não é salvo**: ele é calculado na hora a partir do que tu fez. Na tela de **Opções** dá pra ver exatamente o que tá salvo e apagar tudo com um clique.

> 💡 Como o save mora no navegador, ele não vai junto se tu trocar de navegador ou de aparelho. E se tu limpar os dados do site, o progresso volta pro zero.

---

## 🏗️ Arquitetura

O projeto é um **site estático**: só HTML, CSS e JavaScript, sem framework, sem dependências externas e sem backend.

```
.
├── conteudos/            ← fonte da verdade: as fases em markdown
├── docs/PROJETO.md       ← este manual
├── scripts/build.py      ← compila os .md em dados seguros
└── site/
    ├── index.html        ← casca da página + política de segurança (CSP)
    ├── sw.js             ← service worker: guarda os arquivos pra funcionar offline
    ├── favicon.svg
    ├── css/arcade.css    ← visual do fliperama
    └── js/
        ├── content.js    ← GERADO pelo build (não editar à mão)
        ├── app.js        ← telas, rotas e eventos
        ├── game.js       ← regras do jogo: XP, níveis, desbloqueios, conquistas
        ├── save.js       ← leitura, validação e gravação do save
        ├── render.js     ← transforma a árvore de conteúdo em elementos da página
        └── dom.js        ← criador de elementos com lista de atributos permitidos
```

### Como o conteúdo chega na tela

```
conteudos/*.md
      │   python3 scripts/build.py
      ▼
árvore JSON (só tipos permitidos, links validados)
      │   site/js/content.js
      ▼
render.js monta os elementos com APIs do DOM
      │   (texto sempre como texto, nunca como HTML)
      ▼
tela do fliperama
```

O markdown **não é interpretado no navegador**. O build lê os arquivos, entende só um conjunto pequeno de formatações (títulos, parágrafos, negrito, itálico, links, listas, missões, tabelas, citações, blocos de código e separadores) e gera uma árvore de dados. Qualquer coisa fora disso vira texto comum. Se aparecer um link que não seja `https` ou um link interno pra outra fase, o build falha.

### Rotas

A navegação usa o endereço depois do `#`, e só rotas conhecidas são aceitas:

| Rota | Tela |
|---|---|
| `#/` | Tela inicial |
| `#/mapa` | Mapa das fases |
| `#/fase/01` … `#/fase/05` | Uma fase (a 3 é `#/fase/03-gurias` ou `#/fase/03-guris`) |
| `#/manual` | Este manual |
| `#/opcoes` | Opções e save |
| `#/fim` | Tela de jogo zerado |

---

## 🔒 Segurança

Mesmo sendo um site simples, ele foi feito pra ser seguro desde o começo.

### 1. Nada de terceiros
Zero CDN, zero fonte externa, zero analytics, zero pacote do npm em produção. Tudo que roda no navegador está neste repositório e pode ser lido.

### 2. Política de Segurança de Conteúdo (CSP)
O `index.html` declara uma CSP bem fechada:

- `default-src 'none'`: tudo é proibido por padrão
- `script-src 'self'` e `style-src 'self'`: só scripts e estilos do próprio site, nada inline
- `connect-src 'none'`: o site não faz nenhuma requisição de rede pelo JavaScript
- `img-src 'self' data:`, `worker-src 'self'`, `base-uri 'none'`, `form-action 'none'`, `object-src 'none'`
- `require-trusted-types-for 'script'`: o navegador bloqueia qualquer tentativa de jogar texto como HTML ou script

### 3. Trusted Types
Com a CSP acima, o navegador recusa `innerHTML`, `eval` e afins. A única exceção é uma política chamada `mm-sw`, que só aceita um valor: o endereço do próprio service worker (`./sw.js`).

### 4. Renderização segura
O `render.js` cria cada elemento com `document.createElement` e coloca texto com `textContent`. O `dom.js` só aceita uma lista fechada de atributos, e links externos são validados de novo no navegador (precisam ser `https`) e abrem com `rel="noopener noreferrer"`.

### 5. Save à prova de bagunça
O save é tratado como dado não confiável, porque qualquer pessoa pode editar o localStorage. Ao carregar, o `save.js`:

- limita o tamanho do texto salvo
- lê o JSON dentro de `try/catch`
- reconstrói o estado do zero, copiando só campos conhecidos, com tipos e limites conferidos
- descarta fases, missões e conquistas que não existem
- usa objetos sem protótipo, pra evitar *prototype pollution*
- limpa o apelido (tamanho máximo e sem caracteres de controle)

Se o navegador bloquear o armazenamento (por exemplo, em navegação privada), o jogo continua funcionando, só não salva.

### 6. Service worker com escopo curto
O `sw.js` só lida com requisições `GET` do próprio site, guarda uma lista fixa de arquivos e apaga caches antigos quando o build muda a versão.

### 7. Privacidade
`<meta name="referrer" content="no-referrer">` evita que outros sites saibam de onde a pessoa veio. Não existe nenhum dado pessoal obrigatório.

### 8. Publicação
O GitHub Actions publica no GitHub Pages com permissões mínimas por etapa, sem segredos, e o Dependabot avisa quando as ações tiverem versão nova.

### Limites conhecidos
- O GitHub Pages não deixa configurar cabeçalhos HTTP, então algumas proteções (como `frame-ancestors`, contra o site ser colocado dentro de outro) não estão disponíveis. Como o site não tem login nem dado sensível, o risco é baixo.
- O save pode ser editado por quem tem acesso ao navegador. Isso é esperado: o XP é só pra diversão.

---

## 🛠️ Rodando localmente

Precisa só de Python 3.

```bash
python3 scripts/build.py
python3 -m http.server 8000 --directory site
```

Depois abre `http://localhost:8000` no navegador.

> ⚠️ Abrir o `index.html` direto (clicando duas vezes no arquivo) não funciona, porque o navegador bloqueia módulos JavaScript fora de um servidor. Usa sempre o comando acima.

---

## 🚀 Publicando no GitHub Pages

1. No repositório, vai em **Settings → Pages**
2. Em **Source**, escolhe **GitHub Actions**
3. Faz um push na branch `main`

O workflow roda o build e publica a pasta `site/`. Depois é só colocar o link no campo **Website** do repositório.

---

## ✍️ Editando o conteúdo

1. Edita o arquivo em `conteudos/`
2. Roda `python3 scripts/build.py`
3. Confere no servidor local
4. Faz o commit dos `.md` e do `site/js/content.js` gerado

Formatações que o fliperama entende:

| Markdown | Vira |
|---|---|
| `#`, `##`, `###`, `####` | Títulos (o `#` vira o nome da fase) |
| `**texto**` e `*texto*` | Negrito e itálico |
| `[texto](https://...)` | Link externo |
| `[texto](./02-linkedin-conteudo.md)` | Link pra outra fase |
| `- [ ] missão` | Missão que vale XP |
| `> 💡`, `> ⚠️`, `> 🗓️` no começo da citação | Caixas de dica, alerta e save point |
| `\` no fim da linha | Quebra de linha |

### Adicionando uma fase nova

1. Cria o arquivo em `conteudos/` seguindo o padrão `06-nome-da-fase.md`
2. Adiciona a fase na lista `PHASES` em `scripts/build.py`
3. Roda o build e testa

---

## ♿ Acessibilidade

- Dá pra jogar só com teclado, com foco sempre visível
- Avisos de XP e conquistas são lidos por leitores de tela
- Respeita a preferência de **movimento reduzido** do sistema, e os efeitos de tela podem ser desligados em Opções
- Cores com contraste conferido entre texto e fundo

---

## ✅ Checklist pra quem for contribuir

- [ ] Não usei `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval` nem `new Function`
- [ ] Não adicionei script, estilo, fonte ou imagem de outro domínio
- [ ] Links novos são `https` ou apontam pra outra fase
- [ ] Rodei o build e testei no servidor local
- [ ] Se mudei os arquivos do site, conferi a lista de arquivos no `sw.js`

---

*Ninguém zera tech no modo solo. Esse fliperama também é multiplayer: bora construir junto.* 💜
