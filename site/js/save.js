// Save local. O que vem do localStorage é tratado como dado NÃO confiável:
// o estado é sempre reconstruído do zero, copiando só o que é conhecido e válido.

export const SAVE_KEY = 'modo-multiplayer:save';
export const SAVE_VERSION = 1;
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
  if (data.v !== SAVE_VERSION) return state;

  const ids = catalog.ids;
  const pickIds = (arr) => (Array.isArray(arr)
    ? arr.filter((x) => typeof x === 'string' && ids.has(x)).slice(0, ids.size)
    : []);

  state.opened = new Set(pickIds(data.opened));
  state.completed = new Set(pickIds(data.completed));

  if (data.missions && typeof data.missions === 'object' && !Array.isArray(data.missions)) {
    for (const id of ids) {
      if (!Object.prototype.hasOwnProperty.call(data.missions, id)) continue;
      const list = data.missions[id];
      const max = catalog.missionCount.get(id) ?? 0;
      if (!Array.isArray(list)) continue;
      const valid = list.filter((n) => Number.isInteger(n) && n >= 0 && n < max);
      if (valid.length) state.missions.set(id, new Set(valid));
    }
  }

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

export function serialize(state) {
  const missions = Object.create(null);
  for (const [id, set] of state.missions) {
    if (set.size) missions[id] = [...set].sort((a, b) => a - b);
  }
  return {
    v: SAVE_VERSION,
    opened: [...state.opened],
    completed: [...state.completed],
    missions,
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
