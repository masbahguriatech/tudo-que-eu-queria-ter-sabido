// Transforma a árvore gerada pelo build em elementos da página.
// Só tipos conhecidos são desenhados; o resto é ignorado.

import { h, safeHref } from './dom.js';

const CALLOUT_LABEL = { tip: 'Dica', warn: 'Atenção', save: 'Save point' };

export function inline(nodes = []) {
  return nodes.map((n) => {
    switch (n?.t) {
      case 'text': return document.createTextNode(String(n.v));
      case 'br': return h('br');
      case 'code': return h('code', {}, String(n.v));
      case 'b': return h('strong', {}, inline(n.c));
      case 'i': return h('em', {}, inline(n.c));
      case 'a': return link(n);
      default: return null;
    }
  });
}

function link(n) {
  if (n.k === 'int' && typeof n.to === 'string' && /^[0-9a-z-]+$/.test(n.to)) {
    return h('a', { href: `#/fase/${n.to}`, class: 'link-fase' }, inline(n.c));
  }
  const href = n.k === 'ext' ? safeHref(n.href) : null;
  if (!href) return h('span', {}, inline(n.c));
  return h(
    'a',
    { href, target: '_blank', rel: 'noopener noreferrer', class: 'link-ext' },
    inline(n.c),
    h('span', { class: 'sr-only' }, ' (abre em nova aba)'),
  );
}

/**
 * @param {Array} blocks árvore do build
 * @param {object} opts
 * @param {(index:number)=>boolean} [opts.isDone] missão marcada?
 * @param {(index:number, done:boolean)=>void} [opts.onToggle] clique numa missão
 * @param {string} [opts.prefix] prefixo pra ids únicos
 */
export function renderBlocks(blocks = [], opts = {}) {
  return blocks.map((b) => block(b, opts));
}

function block(b, opts) {
  switch (b?.t) {
    case 'h': {
      const level = Math.min(Math.max(Number(b.l) || 2, 2), 4);
      return h(`h${level}`, {}, inline(b.c));
    }
    case 'p': return h('p', {}, inline(b.c));
    case 'hr': return h('hr', { class: 'divisor' });
    case 'pre': {
      const texto = String(b.v);
      const pre = h('pre', { tabindex: 0 }, h('code', {}, texto));
      if (!opts.copiar) return pre;
      const status = h('span', { class: 'copiar__status', role: 'status' });
      const botao = h('button', {
        type: 'button',
        class: 'copiar__btn',
        onClick: async () => {
          try {
            await navigator.clipboard.writeText(texto);
            status.textContent = 'Copiado! ✓';
          } catch {
            status.textContent = 'Não deu pra copiar: seleciona o texto e copia manualmente.';
          }
          window.setTimeout(() => { status.textContent = ''; }, 2500);
        },
      }, '📋 Copiar');
      return h('div', { class: 'copiar' }, pre, h('div', { class: 'copiar__barra' }, botao, status));
    }
    case 'quote': {
      const kind = ['tip', 'warn', 'save'].includes(b.k) ? b.k : 'quote';
      return h(
        'blockquote',
        { class: `callout callout--${kind}` },
        kind !== 'quote' ? h('span', { class: 'sr-only' }, `${CALLOUT_LABEL[kind]}: `) : null,
        renderBlocks(b.c, opts),
      );
    }
    case 'ul':
    case 'ol': return list(b, opts);
    case 'table': return table(b);
    default: return null;
  }
}

function list(b, opts) {
  const isMissionList = b.items.some((it) => it.task);
  const el = h(b.t, { class: isMissionList ? 'missoes' : null });
  for (const it of b.items) {
    const subs = (it.sub ?? []).map((s) => block(s, opts));
    if (it.task && Number.isInteger(it.m) && opts.onToggle) {
      const id = `${opts.prefix ?? 'm'}-${it.m}`;
      const done = Boolean(opts.isDone?.(it.m));
      const input = h('input', {
        type: 'checkbox',
        id,
        class: 'missao__check',
        checked: done,
        onChange: (ev) => opts.onToggle(it.m, ev.target.checked, ev.target),
      });
      el.append(h('li', { class: 'missao' },
        input,
        h('label', { for: id, class: 'missao__texto' }, inline(it.c)),
        h('span', { class: 'missao__xp', 'aria-hidden': 'true' }, '+15 XP'),
        subs));
    } else if (it.task) {
      el.append(h('li', { class: 'missao missao--estatica' },
        h('span', { class: 'missao__caixa', 'aria-hidden': 'true' }), h('span', {}, inline(it.c)), subs));
    } else {
      el.append(h('li', {}, inline(it.c), subs));
    }
  }
  return el;
}

function table(b) {
  const head = h('thead', {}, h('tr', {}, b.head.map((c) => h('th', { scope: 'col' }, inline(c)))));
  const body = h('tbody', {}, b.rows.map((r) => h('tr', {}, r.map((c) => h('td', {}, inline(c))))));
  return h('div', { class: 'tabela', tabindex: 0, role: 'region', 'aria-label': 'Tabela' },
    h('table', {}, head, body));
}
