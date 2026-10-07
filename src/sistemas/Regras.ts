import Phaser from 'phaser';
import type { Run } from '../estado';
import { Opcoes } from '../opcoes';

// Regras que mudam a partida: maldições de andar, desafios, sementes e a maestria das armas.

// ===================== Maldições =====================

export interface Maldicao {
  nome: string;
  desc: string;
}

/** Cada andar pode vir amaldiçoado. Em troca, a cera cai em dobro naquele andar. */
export const MALDICOES: Record<string, Maldicao> = {
  labirinto: { nome: 'Maldição do Labirinto', desc: 'O andar é bem maior.' },
  cegueira: { nome: 'Maldição da Cegueira', desc: 'Os itens viram "?" até você pegar.' },
  pavio: { nome: 'Maldição do Pavio Curto', desc: 'A chama queima 2x mais rápido.' },
  trevas: { nome: 'Maldição das Trevas', desc: 'Todas as salas são escuras.' },
  perdido: { nome: 'Maldição do Perdido', desc: 'O mapa some.' },
  fragil: { nome: 'Maldição da Cera Mole', desc: 'Você leva 50% mais dano.' },
};

export const RECOMPENSA_MALDICAO = 'Em troca: cera em dobro neste andar.';

/** Sorteia (ou não) a maldição do andar. No desafio "Amaldiçoado" todo andar tem uma. */
export function sortearMaldicao(run: Run): string | null {
  if (run.modo === 'tutorial' || run.estudio || run.andar < 2) return run.desafio === 'amaldicoado' ? escolher() : null;
  if (run.desafio === 'amaldicoado' || Math.random() < 0.22) return escolher();
  return null;
}

function escolher() {
  const ids = Object.keys(MALDICOES);
  return ids[Math.floor(Math.random() * ids.length)];
}

// ===================== Desafios =====================

export interface Desafio {
  id: string;
  nome: string;
  desc: string;
  premio: number; // cera dourada ao vencer
}

/** Partidas com regras fixas. Vence quem derrotar O Apagador. */
export const DESAFIOS: Desafio[] = [
  { id: 'so_tete', nome: 'Só a TETE', desc: 'Você começa com a TETE e nunca pega outra arma (as do chão viram cera).', premio: 60 },
  { id: 'vidro', nome: 'Vela de Vidro', desc: 'Qualquer golpe apaga a sua chama. Qualquer um.', premio: 120 },
  { id: 'pacifista', nome: 'Pacifista', desc: 'Você não atira. A TETE, a NIX e a YUUMI lutam por você (bem mais fortes).', premio: 90 },
  { id: 'chefoes', nome: 'Chefões em Sequência', desc: 'Cada andar é só um baú, uma loja e o chefe.', premio: 80 },
  { id: 'amaldicoado', nome: 'Amaldiçoado', desc: 'Todo andar tem uma maldição.', premio: 80 },
  { id: 'sem_esquiva', nome: 'Pés de Chumbo', desc: 'Sem esquiva. Em troca, +30% de dano.', premio: 70 },
  { id: 'pavio_curto', nome: 'Pavio Curto', desc: 'A chama queima 2x, mas você começa com 3 itens raros.', premio: 70 },
  { id: 'relogio', nome: 'Contra o Relógio', desc: 'Vença O Apagador em 20 minutos ou a chama apaga.', premio: 100 },
];

export function desafio(id?: string) {
  return DESAFIOS.find((d) => d.id === id);
}

export const LIMITE_RELOGIO = 20 * 60;

// ===================== Sementes =====================

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O e 1/I para ninguém confundir
const LETRAS_SEMENTE = 6;

export function novaSemente() {
  return Math.floor(Math.random() * ALFABETO.length ** LETRAS_SEMENTE);
}

/** 123456789 → "DQ7K-2M" (6 letras, com um tracinho no meio para ler em voz alta). */
export function codigoSemente(n: number) {
  let s = '';
  let v = Math.max(0, Math.floor(n));
  for (let i = 0; i < LETRAS_SEMENTE; i++) {
    s = ALFABETO[v % ALFABETO.length] + s;
    v = Math.floor(v / ALFABETO.length);
  }
  return `${s.slice(0, 3)}-${s.slice(3)}`;
}

/** "dq7k2m", "DQ7-K2M"... → número (ou null se tiver letra inválida). */
export function lerSemente(texto: string): number | null {
  const limpo = texto.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/O/g, '0').replace(/I/g, '1');
  if (limpo.length !== LETRAS_SEMENTE) return null;
  let n = 0;
  for (const ch of limpo) {
    const i = ALFABETO.indexOf(ch);
    if (i < 0) return null;
    n = n * ALFABETO.length + i;
  }
  return n;
}

export const ALFABETO_SEMENTE = ALFABETO;

// ===================== Maestria e skins =====================

export interface Skin {
  id: string;
  nome: string;
  abates: number; // abates com a arma para liberar
}

export const SKINS: Skin[] = [
  { id: 'normal', nome: 'NORMAL', abates: 0 },
  { id: 'bronze', nome: 'BRONZE', abates: 25 },
  { id: 'dourada', nome: 'DOURADA', abates: 100 },
  { id: 'sombria', nome: 'SOMBRIA', abates: 250 },
  { id: 'arcoiris', nome: 'ARCO-ÍRIS', abates: 500 },
];

export function nivelMaestria(abates: number) {
  let n = 0;
  SKINS.forEach((sk, i) => {
    if (abates >= sk.abates) n = i;
  });
  return n;
}

export function skinLiberada(skin: Skin, abates: number) {
  return Opcoes.dev || abates >= skin.abates;
}

/** Tinta da skin (multiplica as cores da arma). Arco-íris muda com o tempo. */
export function tintaSkin(skin: string | undefined, tempo: number): number | null {
  switch (skin) {
    case 'bronze':
      return 0xe0a070;
    case 'dourada':
      return 0xffd84a;
    case 'sombria':
      return 0x8a6ab8;
    case 'arcoiris':
      return Phaser.Display.Color.HSVToRGB((tempo * 0.4) % 1, 0.55, 1).color;
    default:
      return null;
  }
}

/** Para o 3D: troca a cor de um cubinho pela da skin (mantendo o claro/escuro). */
export function corSkin(skin: string | undefined, cor: number, x: number, tempo: number): number {
  if (!skin || skin === 'normal') return cor;
  const r = (cor >> 16) & 255;
  const g = (cor >> 8) & 255;
  const b = cor & 255;
  const l = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
  const pinta = (cr: number, cg: number, cb: number, ganho = 1.25) => {
    const f = Math.min(1.3, l * ganho);
    return (Math.min(255, cr * f) << 16) | (Math.min(255, cg * f) << 8) | Math.min(255, cb * f);
  };
  switch (skin) {
    case 'bronze':
      return pinta(214, 140, 80);
    case 'dourada':
      return pinta(255, 212, 70, 1.45);
    case 'sombria':
      return pinta(120, 80, 170, 1.1);
    case 'arcoiris': {
      const c = Phaser.Display.Color.HSVToRGB((x * 0.05 + tempo * 0.35) % 1, 0.7, Math.min(1, 0.25 + l)) as Phaser.Types.Display.ColorObject;
      return (c.r << 16) | (c.g << 8) | c.b;
    }
  }
  return cor;
}
