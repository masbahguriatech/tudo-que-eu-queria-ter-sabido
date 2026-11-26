// Regras do jogo. Funções puras: recebem o estado e devolvem resultados.
// O XP nunca é salvo: é sempre calculado a partir do que a pessoa fez.

import { CONTENT } from './content.js';

export const XP = Object.freeze({ abrir: 10, missao: 15, zerar: 100, conquista: 50 });

export const LEVELS = Object.freeze([
  { xp: 0, titulo: 'Primeiro spawn' },
  { xp: 100, titulo: 'Explorando o mapa' },
  { xp: 300, titulo: 'Formando a party' },
  { xp: 600, titulo: 'Missão em andamento' },
  { xp: 1000, titulo: 'Subindo de nível' },
  { xp: 1500, titulo: 'Modo multiplayer' },
  { xp: 1900, titulo: 'Lenda do fliperama' },
]);

export const FASES = CONTENT.fases;
export const DOCS = CONTENT.docs;

const ALL_IDS = FASES.flatMap((f) => f.cartuchos.map((c) => c.id));
const TOTAL_MISSIONS = ALL_IDS.reduce((acc, id) => acc + (DOCS[id]?.missoes ?? 0), 0);

const doneCount = (s) => [...s.missions.values()].reduce((a, set) => a + set.size, 0);

export const ACHIEVEMENTS = Object.freeze([
  { id: 'primeiro-spawn', icone: '🕹️', nome: 'Primeiro spawn', desc: 'Abriu a primeira fase.', test: (s) => s.opened.size >= 1 },
  { id: 'missao-aceita', icone: '✅', nome: 'Missão aceita', desc: 'Completou a primeira missão.', test: (s) => doneCount(s) >= 1 },
  { id: 'personagem-criado', icone: '🪪', nome: 'Personagem criado', desc: 'Zerou a fase do perfil.', test: (s) => s.completed.has('01') },
  { id: 'mao-na-massa', icone: '🛠️', nome: 'Mão na massa', desc: 'Completou 10 missões.', test: (s) => doneCount(s) >= 10 },
  { id: 'leitura-em-dobro', icone: '💸', nome: 'Leitura em dobro', desc: 'Zerou os dois cartuchos da fase 3.', test: (s) => s.completed.has('03-gurias') && s.completed.has('03-guris') },
  { id: 'zerou', icone: '🏆', nome: 'Zerou o jogo', desc: 'Zerou as cinco fases.', test: (s) => FASES.every((f) => isPhaseComplete(s, f)) },
  { id: 'cem-por-cento', icone: '⭐', nome: '100% das missões', desc: 'Completou todas as missões.', test: (s) => doneCount(s) >= TOTAL_MISSIONS },
]);

export function catalog() {
  return {
    ids: new Set(ALL_IDS),
    missionCount: new Map(ALL_IDS.map((id) => [id, DOCS[id]?.missoes ?? 0])),
    achievementIds: new Set(ACHIEVEMENTS.map((a) => a.id)),
  };
}

export function computeXP(s) {
  return s.opened.size * XP.abrir
    + doneCount(s) * XP.missao
    + s.completed.size * XP.zerar
    + s.achievements.size * XP.conquista;
}

export function maxXP() {
  return ALL_IDS.length * (XP.abrir + XP.zerar) + TOTAL_MISSIONS * XP.missao + ACHIEVEMENTS.length * XP.conquista;
}

export function levelFor(xp) {
  let idx = 0;
  LEVELS.forEach((l, i) => { if (xp >= l.xp) idx = i; });
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1] ?? null;
  const progress = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
  return { nivel: idx + 1, titulo: cur.titulo, proximo: next?.xp ?? null, progress: Math.min(Math.max(progress, 0), 1) };
}

export function isPhaseComplete(s, fase) {
  return fase.cartuchos.some((c) => s.completed.has(c.id));
}

export function isUnlocked(s, faseIndex) {
  if (s.freePlay || faseIndex === 0) return true;
  return isPhaseComplete(s, FASES[faseIndex - 1]);
}

export function findPhase(cartuchoId) {
  const index = FASES.findIndex((f) => f.cartuchos.some((c) => c.id === cartuchoId));
  if (index < 0) return null;
  const fase = FASES[index];
  return { index, fase, cartucho: fase.cartuchos.find((c) => c.id === cartuchoId) };
}

export function missionsDone(s, id) {
  return s.missions.get(id)?.size ?? 0;
}

export function allComplete(s) {
  return FASES.every((f) => isPhaseComplete(s, f));
}

/** Marca conquistas novas. Devolve a lista das que acabaram de ser desbloqueadas. */
export function evaluateAchievements(s) {
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (!s.achievements.has(a.id) && a.test(s)) {
      s.achievements.add(a.id);
      fresh.push(a);
    }
  }
  return fresh;
}
