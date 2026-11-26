// Criador de elementos com lista fechada de atributos.
// Nada aqui aceita HTML em texto: filhos do tipo string viram nós de texto.

const ALLOWED_ATTRS = new Set([
  'class', 'id', 'href', 'type', 'role', 'tabindex', 'for', 'title', 'target',
  'rel', 'value', 'maxlength', 'autocomplete', 'name', 'placeholder',
  'spellcheck', 'lang', 'scope', 'inputmode', 'pattern', 'colspan', 'datetime',
]);

const BOOLEAN_ATTRS = new Set(['disabled', 'checked', 'hidden', 'readonly', 'required']);

/** Aceita só links internos (#/...) ou https. */
export function safeHref(href) {
  if (typeof href !== 'string') return null;
  if (/^#\/[a-z0-9/-]*$/i.test(href)) return href;
  try {
    const url = new URL(href);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch {
    // URL inválida: cai no return null
  }
  return null;
}

/**
 * h('button', { class: 'btn', onClick: fn, 'aria-label': 'x' }, 'texto', outroNo)
 * Eventos: chaves que começam com "on" seguidas de maiúscula viram addEventListener.
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === undefined || value === null || value === false) continue;
    if (/^on[A-Z]/.test(key) && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'href') {
      const href = safeHref(value);
      if (href) el.setAttribute('href', href);
    } else if (BOOLEAN_ATTRS.has(key)) {
      if (value) el.setAttribute(key, '');
    } else if (ALLOWED_ATTRS.has(key) || key.startsWith('aria-') || key.startsWith('data-')) {
      el.setAttribute(key, String(value));
    } else {
      throw new Error(`Atributo não permitido: ${key}`);
    }
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}
