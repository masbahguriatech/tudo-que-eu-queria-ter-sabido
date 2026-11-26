<h1 align="center">🕹️ tudo que eu gostaria de ter <em>"sabido"</em> quando saí do ensino médio</h1>

<p align="center">
  <strong>Feito pela <a href="https://github.com/masbahguriatech">@masbahguriatech</a> pra galera xovem começar a vida adulta com hack.</strong> 💜
</p>

<p align="center">
  🪪 LinkedIn · 📣 Postar sem vergonha · 💸 Dim dim · 🎓 Faculdade · 🤖 IA · 🎮 Comunidades tech · ⭐ Prompts
</p>

---

## 👋 Bah, oi!

Aqui tem tudo que eu queria ter "sabido" antes, mas que só a vida me ensinou (e as quedas).

Quando eu terminei o ensino médio, ninguém me explicou como montar um LinkedIn, como guardar dinheiro sem sofrer, como escolher um curso ou o que raios era uma comunidade tech. Fui descobrindo tudo na marra, tropeçando aqui e ali.

Esse repositório é o atalho que eu não tive. São os *hacks* da vida adulta que eu queria que alguém tivesse me passado. Ele complementa a palestra **[Modo Multiplayer: ninguém zera tech no modo solo](https://github.com/masbahguriatech/talk-modomultiplayer)** e foi pensado pra quem tá terminando o ensino médio ou o técnico e quer dar os primeiros passos na tecnologia com mais leveza.

Cada conteúdo é uma **fase**: tem texto, missões fáceis e um roadmap pra tu seguir no teu ritmo.

---

## 🎮 Joga no fliperama

Tem uma versão jogável desse repositório! Cada fase vira uma tela de jogo: tu lê, aperta **OK** pra avançar, marca as missões que fez na vida real, ganha XP, sobe de nível e desbloqueia conquistas. O progresso fica salvo **só no teu navegador**: nada é enviado pra lugar nenhum.

👉 **[Jogar agora](https://masbahguriatech.github.io/tudo-que-eu-queria-ter-sabido/)**

Prefere ler direto aqui no GitHub? Tranquilo, é só seguir as fases abaixo.

---

## 🗺️ As fases

| Fase | Conteúdo | Do que fala |
|---|---|---|
| 1 | [🪪 LinkedIn: deixando teu perfil pronto pro jogo](./conteudos/01-linkedin-perfil.md) | Foto, título, "Sobre", experiência e os erros que fazem o perfil parecer abandonado |
| 2 | [📣 LinkedIn: fazendo teu perfil ganhar XP](./conteudos/02-linkedin-conteudo.md) | Como transformar projeto e vivência em post, sem vergonha |
| 3 | [💸 Meus pilas (versão gurias)](./conteudos/03-meus-pilas-gurias.md) · [💸 Meus pilas (versão guris)](./conteudos/03-meus-pilas-guris.md) | Como organizar teu dim dim de um jeito leve e por que guardar dinheiro é liberdade |
| 4 | [🎓 Faculdade, who?](./conteudos/04-faculdade-who.md) | Áreas da tecnologia, cursos, testes vocacionais e como entrar na faculdade |
| 5 | [🤖 IA, who?](./conteudos/05-ia-who.md) | O que é IA, como funciona, pra que serve cada ferramenta (ChatGPT, Gemini, Claude, Codex...) e como usar sem cair em cilada |
| 6 | [🎮 Comunidades tech](./conteudos/06-comunidades-tech.md) | O que são, onde vivem, do que se alimentam, e como montar a tua party |
| ⭐ | [Fase bônus: prompts](./conteudos/07-bonus-prompts.md) | Prompts prontos pra aprofundar cada fase com a ajuda de uma IA |

> 💡 **Sobre a fase 3:** ela tem duas versões, uma com mais foco em liberdade financeira pras gurias e outra pros guris. Escolhe a que fizer mais sentido pra ti, ou lê as duas. Não precisa se encaixar em caixinha nenhuma pra aproveitar qualquer uma delas.

> 🗓️ **Save point:** os conteúdos foram revisados em novembro de 2026. Valores, datas, regras e comunidades mudam com o tempo, então confere sempre nas fontes oficiais.

---

## 🧭 Pra quem é

- Pra galera que tá terminando o ensino médio ou o técnico em TI
- Pra quem tá curtindo tecnologia mas ainda não sabe por onde começar
- Pra professoras, professores e comunidades que querem usar esse material com suas turmas (pode usar e compartilhar à vontade!)

---

## 🛠️ Rodando o fliperama no teu computador

Precisa só de Python 3 instalado. Nada de instalar pacote.

```bash
# 1. gera o conteúdo do site a partir dos arquivos .md
python3 scripts/build.py

# 2. sobe um servidor local
python3 -m http.server 8000 --directory site

# 3. abre no navegador
# http://localhost:8000
```

Quer entender como o projeto funciona por dentro (arquitetura, segurança, como adicionar uma fase)? Tá tudo no **[Manual do fliperama](./docs/PROJETO.md)**, que também aparece dentro do próprio jogo.

---

## 📁 Estrutura

```
.
├── conteudos/          # as fases, em markdown (a fonte de tudo)
├── docs/PROJETO.md     # manual do projeto (arquitetura, segurança, como contribuir)
├── scripts/build.py    # transforma os .md em dados seguros pro site
├── site/               # o fliperama (HTML, CSS e JavaScript, sem dependências)
├── SECURITY.md         # como reportar uma falha de segurança
└── .github/            # publicação automática no GitHub Pages
```

---

## 🤝 Bora construir junto

Conhece uma comunidade que devia estar na fase 5? Achou um link quebrado? Tem uma dica que tu gostaria de ter sabido antes?

Abre uma **issue** ou manda um **pull request**. Esse repositório também é multiplayer. 💜

Achou uma falha de segurança? Dá uma olhada no [SECURITY.md](./SECURITY.md) antes de abrir issue pública.

---

## 🔒 Privacidade

O fliperama não tem login, cookie, anúncio nem rastreamento. Teu progresso fica guardado só no teu navegador, e tu pode ver e apagar tudo na tela de **Opções**.

---

<p align="center"><strong>Ninguém zera tech no modo solo.</strong><br>Feito com 💜 por masbahguriatech</p>
