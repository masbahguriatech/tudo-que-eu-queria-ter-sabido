// Save local. O que vem do localStorage é tratado como dado NÃO confiável:
// o estado é sempre reconstruído do zero, copiando só o que é conhecido e válido.

export const SAVE_KEY = 'modo-multiplayer:save';
export const SAVE_VERSION = 2;
const MAX_RAW_LENGTH = 20_000;
const NICK_MAX = 16;

let storageOk = true;

/** Estado vazio. Mapas sem protótipo evitam prototype pollution. */
export function emptyState() {
  return {
    v: SAVE_VERSION,
    opened: new Set(),
    completed: new Set(),
    missions: new Map(),
    read: new Map(),
    achievements: new Set(),
    nickname: '',
    freePlay: false,
    fx: true,
    last: null,
  };
}

export function cleanNickname(value) {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFC')
    .replace(/[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NICK_MAX);
}

/**
 * @param {object} catalog { ids: Set<string>, missionCount: Map<string, number>, achievementIds: Set<string> }
 */
export function load(catalog) {
  let raw = null;
  try {
    raw = window.localStorage.getItem(SAVE_KEY);
  } catch {
    storageOk = false;
    return emptyState();
  }
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_RAW_LENGTH) return emptyState();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return emptyState();
  }
  return validate(data, catalog);
}

export function validate(data, catalog) {
  const state = emptyState();
  if (!data || typeof data !== 'object' || Array.isArray(data)) return state;
  if (data.v === 1) data = migrarV1(data);
  if (data.v !== SAVE_VERSION) return state;

  const ids = catalog.ids;
  const pickIds = (arr) => (Array.isArray(arr)
    ? arr.filter((x) => typeof x === 'string' && ids.has(x)).slice(0, ids.size)
    : []);

  state.opened = new Set(pickIds(data.opened));
  state.completed = new Set(pickIds(data.completed));

  state.missions = pickIndexMap(data.missions, ids, catalog.missionCount);
  state.read = pickIndexMap(data.read, ids, catalog.telaCount);

  if (Array.isArray(data.achievements)) {
    state.achievements = new Set(
      data.achievements.filter((x) => typeof x === 'string' && catalog.achievementIds.has(x)),
    );
  }

  state.nickname = cleanNickname(data.nickname);
  state.freePlay = data.freePlay === true;
  state.fx = data.fx !== false;
  state.last = typeof data.last === 'string' && ids.has(data.last) ? data.last : null;
  return state;
}

/**
 * Save da versão 1: a fase de comunidades era a "05" e virou "06"
 * quando entrou a fase de IA. Renomeia sem perder o progresso.
 */
function migrarV1(old) {
  const ren = (x) => (x === '05' ? '06' : x);
  const arr = (a) => (Array.isArray(a) ? a.map(ren) : []);
  const missions = Object.create(null);
  if (old.missions && typeof old.missions === 'object' && !Array.isArray(old.missions)) {
    for (const k of Object.keys(old.missions)) missions[ren(k)] = old.missions[k];
  }
  return {
    ...old,
    v: 2,
    opened: arr(old.opened),
    completed: arr(old.completed),
    missions,
    last: typeof old.last === 'string' ? ren(old.last) : null,
  };
}

/** Lê um mapa { idDaFase: [números] } só com fases e números que existem. */
function pickIndexMap(raw, ids, counts) {
  const out = new Map();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const id of ids) {
    if (!Object.prototype.hasOwnProperty.call(raw, id)) continue;
    const list = raw[id];
    const max = counts.get(id) ?? 0;
    if (!Array.isArray(list)) continue;
    const valid = list.filter((n) => Number.isInteger(n) && n >= 0 && n < max);
    if (valid.length) out.set(id, new Set(valid));
  }
  return out;
}

function mapToObject(map) {
  const obj = Object.create(null);
  for (const [id, set] of map) {
    if (set.size) obj[id] = [...set].sort((a, b) => a - b);
  }
  return obj;
}

export function serialize(state) {
  const missions = mapToObject(state.missions);
  const read = mapToObject(state.read);
  return {
    v: SAVE_VERSION,
    opened: [...state.opened],
    completed: [...state.completed],
    missions,
    read,
    achievements: [...state.achievements],
    nickname: state.nickname,
    freePlay: state.freePlay,
    fx: state.fx,
    last: state.last,
  };
}

/** @returns {boolean} true se conseguiu salvar */
export function persist(state) {
  if (!storageOk) return false;
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(serialize(state)));
    return true;
  } catch {
    return false;
  }
}

export function wipe() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function isStorageAvailable() {
  return storageOk;
}
