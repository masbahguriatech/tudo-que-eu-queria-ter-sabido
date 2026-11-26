// Fliperama: telas, rotas e eventos.

import { CONTENT } from './content.js';
import { h } from './dom.js';
import { renderBlocks } from './render.js';
import * as save from './save.js';
import * as game from './game.js';

deepFreeze(CONTENT);

const CAT = game.catalog();
let state = save.load(CAT);

const app = document.getElementById('app');
const hud = document.getElementById('hud');
const toasts = document.getElementById('toasts');

let pageObserver = null;
let uidCounter = 0;
const uid = (p) => `${p}-${++uidCounter}`;

// ---------------------------------------------------------------------------
// Estado: toda mudança passa por aqui
// ---------------------------------------------------------------------------

function commit(change, { silent = false } = {}) {
  const before = game.levelFor(game.computeXP(state));
  change(state);
  const fresh = game.evaluateAchievements(state);
  const saved = save.persist(state);
  const after = game.levelFor(game.computeXP(state));
  if (!silent) {
    for (const a of fresh) toast(`${a.icone} CONQUISTA DESBLOQUEADA: ${a.nome} (+${game.XP.conquista} XP)`, 'conquista');
    if (after.nivel > before.nivel) toast(`⬆️ LEVEL UP! Nível ${after.nivel}: ${after.titulo}`, 'nivel');
  }
  if (!saved && save.isStorageAvailable()) toast('⚠️ Não deu pra salvar o progresso neste navegador.', 'alerta');
  applyPrefs();
  renderHud();
}

function applyPrefs() {
  document.documentElement.classList.toggle('sem-efeitos', !state.fx);
}

// ---------------------------------------------------------------------------
// Componentes
// ---------------------------------------------------------------------------

function toast(texto, tipo = 'info') {
  const el = h('div', { class: `toast toast--${tipo}` }, texto);
  toasts.append(el);
  while (toasts.children.length > 4) toasts.firstElementChild.remove();
  window.setTimeout(() => el.classList.add('toast--saindo'), 3200);
  window.setTimeout(() => el.remove(), 3700);
}

function tooltip(rotulo, texto) {
  const id = uid('tip');
  const wrap = h('span', { class: 'tip' });
  const close = () => { wrap.classList.remove('tip--aberta'); btn.setAttribute('aria-expanded', 'false'); };
  const btn = h('button', {
    type: 'button',
    class: 'tip__btn',
    'aria-describedby': id,
    'aria-expanded': 'false',
    onClick: () => {
      const open = wrap.classList.toggle('tip--aberta');
      btn.setAttribute('aria-expanded', String(open));
    },
    onKeydown: (ev) => { if (ev.key === 'Escape') close(); },
    onBlur: close,
  }, rotulo);
  wrap.append(btn, h('span', { role: 'tooltip', id, class: 'tip__bolha' }, texto));
  return wrap;
}

function barra(progress, rotulo) {
  const fill = h('span', { class: 'barra__fill' });
  fill.style.setProperty('--p', String(Math.round(progress * 100)));
  return h('span', {
    class: 'barra',
    role: 'progressbar',
    'aria-label': rotulo,
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-valuenow': Math.round(progress * 100),
  }, fill);
}

function pad(n, size = 6) {
  return String(n).padStart(size, '0');
}

function playerName() {
  return state.nickname || 'JOGADOR 1';
}

function renderHud() {
  const xp = game.computeXP(state);
  const lv = game.levelFor(xp);
  const zeradas = game.FASES.filter((f) => game.isPhaseComplete(state, f)).length;
  const hash = location.hash || '#/';
  const ativo = (rota) => (hash === rota || (rota === '#/mapa' && hash.startsWith('#/fase/')) ? 'page' : null);
  const dicaXp = lv.proximo
    ? `faltam ${lv.proximo - xp} XP pro nível ${lv.nivel + 1}`
    : 'nível máximo! 🏆';

  const item = (rota, icone, texto, extra = '') => h('a', { href: rota, class: 'hud__link', 'aria-current': ativo(rota) },
    h('span', { class: 'hud__link-icone', 'aria-hidden': 'true' }, icone),
    h('span', {}, texto, extra ? h('span', { class: 'hud__link-extra' }, extra) : null));

  const stat = (rotulo, valor, extra = null, cls = '') => h('div', { class: `stat ${cls}` },
    h('dt', { class: 'stat__rotulo' }, rotulo),
    h('dd', { class: 'stat__valor' }, valor, extra));

  hud.replaceChildren(
    h('div', { class: 'hud__topo' },
      h('a', { href: '#/', class: 'hud__marca', title: 'Voltar pra tela inicial' },
        h('span', { class: 'hud__bah', 'aria-hidden': 'true' }, 'bah'),
        h('span', { class: 'hud__textos' },
          h('span', { class: 'hud__titulo' }, 'tudo que eu gostaria de ter ', h('em', {}, '"sabido"'), ' quando saí do ensino médio'),
          h('span', { class: 'hud__subtitulo' }, 'dicas com a tia @masbahguriatech'))),
      h('nav', { class: 'hud__nav', 'aria-label': 'Menu principal' },
        item('#/mapa', '🗺️', 'Mapa', ' das fases'),
        item('#/manual', '📖', 'Manual'),
        item('#/opcoes', '⚙️', 'Opções'))),
    h('section', { class: 'hud__painel', 'aria-label': 'Teu progresso' },
      h('dl', { class: 'hud__stats' },
        stat('Quem joga', playerName(),
          h('a', { href: '#/opcoes', class: 'stat__editar' }, 'trocar', h('span', { class: 'sr-only' }, ' apelido')), 'stat--jogador'),
        stat('Nível', `${lv.nivel} · ${lv.titulo}`),
        stat('Experiência', `${xp} XP`,
          h('span', { class: 'stat__xp' },
            barra(lv.progress, lv.proximo ? `Progresso até o nível ${lv.nivel + 1}` : 'Nível máximo'),
            h('span', { class: 'stat__dica' }, dicaXp)), 'stat--xp'),
        stat('Fases zeradas', `${zeradas} de ${game.FASES.length}`))),
  );
}

function titulo(texto, cls = '') {
  return h('h1', { class: cls, tabindex: -1 }, texto);
}

// ---------------------------------------------------------------------------
// Telas
// ---------------------------------------------------------------------------

function telaInicial() {
  const temSave = state.opened.size > 0;
  return h('section', { class: 'tela-inicial' },
    h('p', { class: 'kicker' }, 'masbahguriatech apresenta'),
    h('h1', { class: 'logo', tabindex: -1 },
      h('span', { class: 'logo__linha logo__linha--1' }, 'MODO'),
      h('span', { class: 'logo__linha logo__linha--2' }, 'MULTIPLAYER')),
    h('p', { class: 'subtitulo' },
      'coisas que eu gostaria de ter ', h('em', {}, 'sabido'), ' quando me formei no ensino médio'),
    h('a', { href: '#/mapa', class: 'btn btn--start' }, temSave ? '▶ CONTINUAR' : '▶ PRESS START'),
    h('nav', { class: 'menu-inicial', 'aria-label': 'Menu inicial' },
      h('a', { href: '#/manual', class: 'btn btn--ghost' }, 'MANUAL'),
      h('a', { href: '#/opcoes', class: 'btn btn--ghost' }, 'OPÇÕES')),
    h('p', { class: 'ficha' }, 'FICHA GRÁTIS · NINGUÉM ZERA TECH NO MODO SOLO'),
  );
}

function statusCartucho(id) {
  if (state.completed.has(id)) return { cls: 'zerada', txt: '★ ZERADA', btn: 'REJOGAR' };
  if (state.opened.has(id)) return { cls: 'andamento', txt: 'EM ANDAMENTO', btn: 'CONTINUAR' };
  return { cls: 'nova', txt: 'NOVA', btn: 'JOGAR' };
}

function telaMapa() {
  const zeradas = game.FASES.filter((f) => game.isPhaseComplete(state, f)).length;
  const missoesFeitas = [...CAT.ids].reduce((a, id) => a + game.missionsDone(state, id), 0);
  const missoesTotal = [...CAT.missionCount.values()].reduce((a, b) => a + b, 0);

  const cards = game.FASES.map((fase, i) => {
    const liberada = game.isUnlocked(state, i);
    const completa = game.isPhaseComplete(state, fase);
    const cls = ['card', !liberada && 'card--bloqueada', completa && 'card--zerada'].filter(Boolean).join(' ');
    const badge = !liberada ? '🔒 BLOQUEADA' : completa ? '★ ZERADA' : `${fase.cartuchos.length > 1 ? '2 CARTUCHOS' : 'LIBERADA'}`;

    const corpo = !liberada
      ? h('p', { class: 'card__aviso' }, `Zera a fase ${i} pra desbloquear. Ou liga o modo livre em Opções.`)
      : h('div', { class: 'card__cartuchos' }, fase.cartuchos.map((c) => {
        const st = statusCartucho(c.id);
        const total = game.DOCS[c.id].missoes;
        const feitas = game.missionsDone(state, c.id);
        return h('div', { class: `cartucho cartucho--${st.cls}` },
          h('div', { class: 'cartucho__linha' },
            h('span', { class: 'cartucho__nome' }, c.rotulo ? `Cartucho ${c.rotulo}` : 'Missões'),
            h('span', { class: 'cartucho__conta' }, `${feitas}/${total}`)),
          barra(total ? feitas / total : 0, `Missões feitas: ${feitas} de ${total}`),
          h('a', { href: `#/fase/${c.id}`, class: 'btn btn--card' },
            `${st.btn}${c.rotulo ? ` · ${c.rotulo.toUpperCase()}` : ''}`,
            h('span', { class: 'sr-only' }, ` a fase ${fase.numero}, ${fase.nome}`)));
      }));

    return h('li', { class: cls },
      h('div', { class: 'card__topo' },
        h('span', { class: 'card__num' }, `FASE ${String(fase.numero).padStart(2, '0')}`),
        h('span', { class: 'card__badge' }, badge)),
      h('span', { class: 'card__icone', 'aria-hidden': 'true' }, fase.icone),
      h('h2', { class: 'card__nome' }, fase.nome),
      h('p', { class: 'card__resumo' }, fase.resumo),
      corpo);
  });

  const trofeus = game.ACHIEVEMENTS.map((a) => {
    const ok = state.achievements.has(a.id);
    return h('li', { class: `trofeu ${ok ? 'trofeu--ok' : ''}` },
      h('span', { class: 'trofeu__icone', 'aria-hidden': 'true' }, ok ? a.icone : '?'),
      h('span', { class: 'trofeu__nome' }, ok ? a.nome : '???'),
      h('span', { class: 'trofeu__desc' }, ok ? a.desc : 'Conquista secreta'));
  });

  return h('section', { class: 'tela-mapa' },
    titulo('MAPA DAS FASES', 'tela__titulo'),
    h('p', { class: 'tela__sub' },
      `${zeradas} de ${game.FASES.length} fases zeradas · ${missoesFeitas} de ${missoesTotal} missões`),
    game.allComplete(state)
      ? h('a', { href: '#/fim', class: 'banner-fim' }, '🏆 Tu zerou o jogo! Ver a tela final ▶')
      : null,
    h('ol', { class: 'fases' }, cards),
    h('section', { class: 'trofeus', 'aria-labelledby': 'trofeus-titulo' },
      h('h2', { id: 'trofeus-titulo', class: 'tela__titulo tela__titulo--menor' }, 'SALA DE TROFÉUS'),
      h('ul', { class: 'trofeus__lista' }, trofeus)),
  );
}

function telaFase(id) {
  const found = game.findPhase(id);
  if (!found) return null;
  const { index, fase, cartucho } = found;
  if (!game.isUnlocked(state, index)) {
    toast(`🔒 A fase ${fase.numero} ainda tá bloqueada.`, 'alerta');
    location.hash = '#/mapa';
    return null;
  }
  const doc = game.DOCS[id];

  if (!state.opened.has(id)) {
    commit((s) => { s.opened.add(id); s.last = id; });
    toast(`🕹️ Fase ${fase.numero} iniciada! +${game.XP.abrir} XP`, 'xp');
  }

  const contador = h('span', { class: 'fase__contador' });
  const atualizarContador = () => {
    contador.textContent = `MISSÕES ${game.missionsDone(state, id)}/${doc.missoes}`;
  };
  atualizarContador();

  const conteudo = renderBlocks(doc.blocos, {
    prefix: `m-${id}`,
    isDone: (n) => state.missions.get(id)?.has(n) ?? false,
    onToggle: (n, done) => {
      commit((s) => {
        const set = s.missions.get(id) ?? new Set();
        if (done) set.add(n); else set.delete(n);
        s.missions.set(id, set);
      });
      if (done) toast(`✅ Missão cumprida! +${game.XP.missao} XP`, 'xp');
      atualizarContador();
    },
  });

  const fim = h('div', { class: 'fim-fase' });
  const desenharFim = (liberado) => {
    const proxima = game.FASES[index + 1];
    const zerada = state.completed.has(id);
    const proximaLink = proxima && game.isUnlocked(state, index + 1)
      ? h('a', { href: `#/fase/${proxima.cartuchos[0].id}`, class: 'btn btn--start' },
        proxima.cartuchos.length > 1 ? `PRÓXIMA FASE: ${proxima.nome} ▶` : `PRÓXIMA FASE ▶`)
      : null;
    if (zerada) {
      fim.replaceChildren(
        h('p', { class: 'fim-fase__titulo', tabindex: -1 }, '★ FASE ZERADA ★'),
        h('div', { class: 'fim-fase__acoes' },
          proximaLink ?? (game.allComplete(state)
            ? h('a', { href: '#/fim', class: 'btn btn--start' }, 'VER TELA FINAL 🏆')
            : null),
          h('a', { href: '#/mapa', class: 'btn btn--ghost-escuro' }, 'VOLTAR PRO MAPA')));
      return;
    }
    const botao = h('button', {
      type: 'button',
      class: 'btn btn--start',
      disabled: !liberado,
      onClick: () => {
        commit((s) => { s.completed.add(id); });
        toast(`🏁 FASE ZERADA! +${game.XP.zerar} XP`, 'xp');
        desenharFim(true);
        fim.querySelector('.fim-fase__titulo')?.focus();
      },
    }, `ZERAR FASE · +${game.XP.zerar} XP`);
    fim.replaceChildren(
      h('p', { class: 'fim-fase__titulo', tabindex: -1 }, liberado ? 'Chegou no fim! 🎉' : 'Lê até aqui embaixo pra liberar o botão ⬇️'),
      h('div', { class: 'fim-fase__acoes' }, botao,
        h('a', { href: '#/mapa', class: 'btn btn--ghost-escuro' }, 'VOLTAR PRO MAPA')));
  };
  desenharFim(false);

  const sentinela = h('div', { class: 'sentinela', 'aria-hidden': 'true' });
  if ('IntersectionObserver' in window) {
    pageObserver = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        pageObserver?.disconnect();
        if (!state.completed.has(id)) desenharFim(true);
      }
    });
    queueMicrotask(() => pageObserver?.observe(sentinela));
  } else {
    desenharFim(true);
  }

  const rotuloFase = `FASE ${String(fase.numero).padStart(2, '0')}${cartucho.rotulo ? ` · CARTUCHO ${cartucho.rotulo.toUpperCase()}` : ''}`;

  return h('article', { class: 'tela-fase' },
    h('header', { class: 'fase__cabecalho' },
      h('p', { class: 'fase__num' }, rotuloFase),
      titulo(doc.titulo, 'fase__titulo'),
      h('div', { class: 'fase__meta' },
        contador,
        h('span', { class: 'fase__xp' }, `+${game.XP.missao} XP por missão`),
        tooltip('ⓘ REVISÃO', fase.revisao))),
    h('div', { class: 'papel' }, conteudo, sentinela, fim),
  );
}

function telaManual() {
  return h('article', { class: 'tela-fase' },
    h('header', { class: 'fase__cabecalho' },
      h('p', { class: 'fase__num' }, 'MANUAL DO FLIPERAMA'),
      titulo(CONTENT.manual.titulo, 'fase__titulo')),
    h('div', { class: 'papel papel--manual' }, renderBlocks(CONTENT.manual.blocos)));
}

function telaOpcoes() {
  const nickId = uid('nick');
  const nick = h('input', {
    id: nickId, type: 'text', class: 'campo', maxlength: 16, autocomplete: 'off',
    spellcheck: 'false', value: state.nickname, placeholder: 'JOGADOR 1',
  });
  const salvarNick = () => {
    const limpo = save.cleanNickname(nick.value);
    commit((s) => { s.nickname = limpo; }, { silent: true });
    nick.value = limpo;
    toast(limpo ? `👾 Agora tu é ${limpo}!` : '👾 Apelido apagado.', 'info');
  };
  nick.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') salvarNick(); });

  const toggle = (label, desc, checked, onChange) => {
    const id = uid('opt');
    return h('div', { class: 'opcao' },
      h('input', { id, type: 'checkbox', class: 'opcao__check', checked, onChange: (ev) => onChange(ev.target.checked) }),
      h('label', { for: id, class: 'opcao__label' }, h('strong', {}, label), h('span', {}, desc)));
  };

  const saveView = h('pre', { class: 'save-json', tabindex: 0, 'aria-label': 'Conteúdo do save' });
  const atualizarSaveView = () => { saveView.textContent = JSON.stringify(save.serialize(state), null, 2); };
  atualizarSaveView();

  const zona = h('div', { class: 'zona-perigo' });
  const desenharZona = (confirmando) => {
    zona.replaceChildren(confirmando
      ? h('div', { class: 'confirma', role: 'alert' },
        h('p', {}, 'Certeza? Isso apaga fases, missões e conquistas. Não tem volta.'),
        h('div', { class: 'confirma__acoes' },
          h('button', {
            type: 'button', class: 'btn btn--perigo',
            onClick: () => {
              save.wipe();
              state = save.emptyState();
              applyPrefs();
              renderHud();
              toast('🧹 Save apagado. Bora começar de novo!', 'info');
              location.hash = '#/';
            },
          }, 'SIM, APAGAR'),
          h('button', { type: 'button', class: 'btn btn--ghost-escuro', onClick: () => desenharZona(false) }, 'CANCELAR')))
      : h('button', { type: 'button', class: 'btn btn--perigo', onClick: () => desenharZona(true) }, 'APAGAR SAVE'));
  };
  desenharZona(false);

  return h('section', { class: 'tela-fase' },
    h('header', { class: 'fase__cabecalho' },
      h('p', { class: 'fase__num' }, 'CONFIGURAÇÕES'),
      titulo('OPÇÕES', 'fase__titulo')),
    h('div', { class: 'papel' },
      save.isStorageAvailable() ? null
        : h('blockquote', { class: 'callout callout--warn' },
          h('p', {}, 'Este navegador bloqueou o armazenamento local, então o progresso não vai ficar salvo quando tu fechar a página.')),
      h('h2', {}, '👾 Apelido'),
      h('p', {}, 'Aparece só pra ti, no placar lá em cima. Até 16 caracteres.'),
      h('div', { class: 'linha-campo' },
        h('label', { for: nickId, class: 'sr-only' }, 'Apelido'),
        nick,
        h('button', { type: 'button', class: 'btn btn--start', onClick: salvarNick }, 'SALVAR')),
      h('h2', {}, '🎛️ Jogo'),
      toggle('Modo livre', 'Destrava todas as fases, pra jogar na ordem que quiser.', state.freePlay, (v) => {
        commit((s) => { s.freePlay = v; }, { silent: true });
        atualizarSaveView();
        toast(v ? '🔓 Modo livre ligado: todas as fases liberadas.' : '🔒 Modo livre desligado.', 'info');
      }),
      toggle('Efeitos de tela', 'Linhas de fliperama e animações. Desliga se preferir uma tela mais calma.', state.fx, (v) => {
        commit((s) => { s.fx = v; }, { silent: true });
        atualizarSaveView();
      }),
      h('h2', {}, '💾 O que tá salvo agora'),
      h('p', {}, 'Isto é tudo que o fliperama guarda, e fica só no teu navegador. O XP não aparece aqui porque ele é calculado na hora.'),
      saveView,
      h('h2', {}, '🧹 Recomeçar'),
      zona),
  );
}

function telaFim() {
  if (!game.allComplete(state)) {
    location.hash = '#/mapa';
    return null;
  }
  const xp = game.computeXP(state);
  return h('section', { class: 'tela-inicial tela-fim' },
    h('p', { class: 'kicker' }, 'GAME COMPLETE'),
    h('h1', { class: 'logo', tabindex: -1 },
      h('span', { class: 'logo__linha logo__linha--1' }, 'TU'),
      h('span', { class: 'logo__linha logo__linha--2' }, 'ZEROU!')),
    h('p', { class: 'subtitulo' }, `${playerName()} · ${pad(xp)} XP · ${state.achievements.size}/${game.ACHIEVEMENTS.length} conquistas`),
    h('p', { class: 'texto-fim' },
      'Mas olha só: ninguém zera tech no modo solo. Agora é tua vez de chamar mais gente pra party. Manda esse fliperama pra tua turma e, quando tiver alguns níveis a mais, estende a mão pra quem tá chegando. 💜'),
    h('a', { href: '#/mapa', class: 'btn btn--start' }, '▶ VOLTAR PRO MAPA'),
    h('p', { class: 'ficha' }, 'FEITO COM 💜 POR MASBAHGURIATECH'),
  );
}

// ---------------------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------------------

function route() {
  pageObserver?.disconnect();
  pageObserver = null;

  const hash = location.hash || '#/';
  let view = null;
  let comHud = true;

  if (hash === '#/' || hash === '#') { view = telaInicial(); comHud = false; }
  else if (hash === '#/mapa') view = telaMapa();
  else if (hash === '#/manual') view = telaManual();
  else if (hash === '#/opcoes') view = telaOpcoes();
  else if (hash === '#/fim') { view = telaFim(); comHud = false; }
  else {
    const m = /^#\/fase\/([0-9a-z-]{2,20})$/.exec(hash);
    if (m && CAT.ids.has(m[1])) view = telaFase(m[1]);
    else { location.hash = '#/'; return; }
  }
  if (!view) return;

  hud.hidden = !comHud;
  if (comHud) renderHud();
  document.body.classList.toggle('modo-tela-cheia', !comHud);
  app.replaceChildren(view);
  window.scrollTo(0, 0);
  app.querySelector('h1')?.focus({ preventScroll: true });
}

// ---------------------------------------------------------------------------
// Início
// ---------------------------------------------------------------------------

function registrarServiceWorker() {
  const seguro = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!('serviceWorker' in navigator) || !seguro) return;
  let url = './sw.js';
  if (window.trustedTypes?.createPolicy) {
    const policy = window.trustedTypes.createPolicy('mm-sw', {
      createScriptURL: (u) => {
        if (u === './sw.js') return u;
        throw new TypeError('URL de service worker não permitida');
      },
    });
    url = policy.createScriptURL('./sw.js');
  }
  navigator.serviceWorker.register(url).catch(() => { /* offline é bônus, não obrigação */ });
}

function deepFreeze(obj) {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const v of Object.values(obj)) deepFreeze(v);
  }
  return obj;
}

window.addEventListener('hashchange', route);
window.addEventListener('storage', (ev) => {
  // Outra aba mudou o save: atualiza o placar sem redesenhar a tela
  // (redesenhar poderia fazer as abas ficarem salvando uma por cima da outra).
  if (ev.key === save.SAVE_KEY) {
    state = save.load(CAT);
    applyPrefs();
    renderHud();
  }
});

game.evaluateAchievements(state);
applyPrefs();
renderHud();
route();
registrarServiceWorker();
