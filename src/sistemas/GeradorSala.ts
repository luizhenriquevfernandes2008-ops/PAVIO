import Phaser from 'phaser';
import { D, InimigoDef, infoAndar } from '../dados';
import type { Dir } from './Masmorra';

// Gera salas de combate por algoritmo:
// 1. escolhe um ESTILO e desenha obstáculos num quarto da sala;
// 2. espelha (horizontal e/ou vertical) para ficar simétrico e bonito;
// 3. limpa a frente das portas e confere que todas se ligam (busca em largura);
// 4. distribui inimigos por um ORÇAMENTO que cresce a cada andar.

const W = 20;
const H = 12;
type RND = Phaser.Math.RandomDataGenerator;

const ENTRADA: Record<Dir, [number, number]> = { n: [1, 9], s: [10, 9], o: [5, 1], l: [5, 18] }; // [linha, coluna] logo dentro da porta

const ESTILOS: [string, number][] = [
  ['arena', 1], ['colunas', 2], ['ilhas', 3], ['corredor', 2], ['cruz', 1.5],
  ['anel', 1.5], ['espinhos', 1.5], ['labirinto', 1.5], ['xadrez', 1],
];

function sortear<T>(rnd: RND, lista: [T, number][]): T {
  const total = lista.reduce((s, [, p]) => s + p, 0);
  let r = rnd.frac() * total;
  for (const [v, p] of lista) if ((r -= p) <= 0) return v;
  return lista[0][0];
}

export interface SalaGerada {
  mapa: string[];
  inimigos: [string, number, number][];
  estilo: string;
}

/**
 * intensidade: 1 = normal, 0.5 = tranquila (poucos monstros), 1.35 = intensa, 0 = sala de descanso (sem monstros, com baú).
 */
export function gerarSalaCombate(rnd: RND, andar: number, portas: Dir[], intensidade = 1): SalaGerada {
  for (let tentativa = 0; tentativa < 12; tentativa++) {
    const estilo = tentativa < 10 ? sortear(rnd, ESTILOS) : 'arena';
    const g = desenhar(rnd, estilo, andar);
    limparPortas(g, portas);
    const alcancaveis = conectar(g, portas);
    if (!alcancaveis) continue;
    if (intensidade === 0) colocarBau(rnd, g, alcancaveis);
    const inimigos = intensidade > 0 ? povoar(rnd, g, andar, portas, alcancaveis, intensidade) : [];
    return { mapa: g.map((l) => l.join('')), inimigos, estilo };
  }
  const g = base();
  const alc = conectar(g, portas)!;
  if (intensidade === 0) colocarBau(rnd, g, alc);
  return { mapa: g.map((l) => l.join('')), inimigos: intensidade > 0 ? povoar(rnd, g, andar, portas, alc, intensidade) : [], estilo: 'arena' };
}

function base(): string[][] {
  return Array.from({ length: H }, (_, r) => Array.from({ length: W }, (_, c) => (r === 0 || r === H - 1 || c === 0 || c === W - 1 ? '#' : '.')));
}

/** Desenha num quarto (colunas 1-9, linhas 1-5) e espelha. */
function desenhar(rnd: RND, estilo: string, andar: number): string[][] {
  const g = base();
  const espelharY = estilo !== 'labirinto' || rnd.frac() < 0.5;
  const por = (c: number, r: number, ch: string) => {
    if (c < 1 || c > 9 || r < 1 || r > 5) return;
    const pontos: [number, number][] = [[c, r], [W - 1 - c, r]];
    if (espelharY) pontos.push([c, H - 1 - r], [W - 1 - c, H - 1 - r]);
    for (const [x, y] of pontos) g[y][x] = ch;
  };
  const entre = (a: number, b: number) => rnd.between(a, b);

  switch (estilo) {
    case 'arena':
      for (let i = entre(1, 3); i > 0; i--) por(entre(2, 8), entre(2, 4), 'o');
      break;
    case 'colunas': {
      const linha = entre(2, 3);
      for (let c = entre(2, 3); c <= 9; c += entre(3, 4)) por(c, linha, 'p');
      if (rnd.frac() < 0.5) por(entre(4, 7), 5, 'o');
      break;
    }
    case 'ilhas':
      for (let i = entre(1, 3); i > 0; i--) {
        const c = entre(2, 7);
        const r = entre(2, 4);
        const formas = [[[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0]], [[0, 0], [0, 1]], [[0, 0], [1, 0], [0, 1]]];
        const ch = rnd.frac() < 0.75 ? 'o' : 'p';
        for (const [dx, dy] of rnd.pick(formas)) por(c + dx, r + dy, ch);
      }
      break;
    case 'corredor': {
      const r = entre(3, 4);
      const vao = entre(4, 7);
      for (let c = 2; c <= 9; c++) if (c !== vao && c !== vao + 1) por(c, r, '#');
      por(entre(2, 3), r - 2, 'o');
      break;
    }
    case 'cruz':
      for (let r = 3; r <= 5; r++) por(9, r, 'p');
      for (let c = 6; c <= 9; c++) por(c, 5, 'p');
      if (rnd.frac() < 0.6) por(3, 2, 'o');
      break;
    case 'anel':
      for (let c = 5; c <= 8; c++) por(c, 3, 'o');
      for (let r = 3; r <= 4; r++) por(5, r, 'o');
      break;
    case 'espinhos':
      for (let c = entre(2, 3); c <= 8; c++) por(c, 3, '^');
      if (rnd.frac() < 0.5) for (let c = 6; c <= 9; c++) por(c, 5, '^');
      por(entre(2, 4), 5, 'o');
      break;
    case 'labirinto':
      for (let i = entre(3, 4); i > 0; i--) {
        const horizontal = rnd.frac() < 0.5;
        const c = entre(2, 8);
        const r = entre(2, 5);
        const tam = entre(2, 3);
        for (let k = 0; k < tam; k++) por(horizontal ? c + k : c, horizontal ? r : r + k, rnd.frac() < 0.3 ? 'o' : '#');
      }
      break;
    case 'xadrez':
      for (let c = 3; c <= 8; c += 2) for (let r = 2; r <= 4; r += 2) if (rnd.frac() < 0.6) por(c, r, 'p');
      break;
  }
  // tempero: espinhos e caixotes extras nos andares fundos
  if (andar >= 2 && estilo !== 'espinhos' && rnd.frac() < 0.35) por(entre(2, 8), entre(2, 4), '^');
  if (rnd.frac() < 0.5) por(entre(2, 8), entre(1, 5), 'o');
  return g;
}

/** Abre um "hall" na frente de cada porta (raio 2). */
function limparPortas(g: string[][], portas: Dir[]) {
  for (const d of portas) {
    const [r0, c0] = ENTRADA[d];
    for (let r = r0 - 2; r <= r0 + 2; r++) {
      for (let c = c0 - 2; c <= c0 + 2; c++) {
        if (r >= 1 && r <= H - 2 && c >= 1 && c <= W - 2) g[r][c] = '.';
      }
    }
  }
}

/** Busca em largura a partir de uma porta. Devolve as casas alcançáveis, ou null se alguma porta ficou isolada. */
function conectar(g: string[][], portas: Dir[]): Set<string> | null {
  const passa = (r: number, c: number) => g[r]?.[c] === '.' || g[r]?.[c] === '^';
  const inicio = portas.length ? ENTRADA[portas[0]] : [5, 9];
  const visto = new Set<string>([`${inicio[0]},${inicio[1]}`]);
  const fila: [number, number][] = [inicio as [number, number]];
  while (fila.length) {
    const [r, c] = fila.shift()!;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${r + dr},${c + dc}`;
      if (!visto.has(k) && passa(r + dr, c + dc)) {
        visto.add(k);
        fila.push([r + dr, c + dc]);
      }
    }
  }
  for (const d of portas) if (!visto.has(`${ENTRADA[d][0]},${ENTRADA[d][1]}`)) return null;
  return visto.size > 60 ? visto : null;
}

/** Sala de descanso: um baú no chão livre mais perto do centro. */
function colocarBau(rnd: RND, g: string[][], alcancaveis: Set<string>) {
  const livres = [...alcancaveis].map((k) => k.split(',').map(Number) as [number, number]).filter(([r, c]) => g[r][c] === '.');
  livres.sort((a, b) => Math.abs(a[0] - 5.5) + Math.abs(a[1] - 9.5) - (Math.abs(b[0] - 5.5) + Math.abs(b[1] - 9.5)));
  const [r, c] = livres[Math.min(livres.length - 1, rnd.between(0, 3))];
  g[r][c] = 'T';
}

/**
 * Monstros que podem aparecer num andar. Em "O Outro Lado" (7-11) só os exclusivos daquele andar;
 * no resto, os comuns (no infinito entram todos, inclusive os exclusivos).
 */
export function poolDoAndar(andar: number): [string, InimigoDef][] {
  const todos = (Object.entries(D.inimigos) as [string, InimigoDef][]).filter(([, d]) => d.custo > 0 && !d.chefe);
  const cap = infoAndar(andar).capitulo;
  if (cap === 3) return todos.filter(([, d]) => d.andares?.includes(andar));
  if (cap === 4) return todos;
  return todos.filter(([, d]) => !d.andares && d.andarMin <= andar);
}

/** Escolhe e posiciona inimigos pelo orçamento do andar, longe das portas. */
function povoar(rnd: RND, g: string[][], andar: number, portas: Dir[], alcancaveis: Set<string>, intensidade: number): [string, number, number][] {
  const o = D.config.orcamento;
  // no modo infinito o orçamento para de crescer: os monstros ficam mais fortes (vida e elites), não mais numerosos
  const nivel = Math.min(andar, D.config.infinito.orcamentoMaxAndar);
  let orcamento = Math.max(2, Math.round((o.base + (nivel - 1) * o.porAndar + rnd.between(0, o.variacao)) * intensidade));
  const pool = poolDoAndar(andar);
  const longeDasPortas = (r: number, c: number) =>
    portas.every((d) => Math.abs(ENTRADA[d][0] - r) + Math.abs(ENTRADA[d][1] - c) >= 6);
  let livres = [...alcancaveis]
    .map((k) => k.split(',').map(Number) as [number, number])
    .filter(([r, c]) => g[r][c] === '.' && longeDasPortas(r, c));
  const saida: [string, number, number][] = [];
  const ocupar = (r: number, c: number) => {
    livres = livres.filter(([rr, cc]) => Math.abs(rr - r) + Math.abs(cc - c) > 1);
  };

  while (orcamento > 0 && livres.length) {
    const cabem = pool.filter(([, d]) => d.custo * (d.grupo ?? 1) <= orcamento + 1);
    if (!cabem.length) break;
    // os mais caros aparecem menos, mas aparecem
    const [tipo, def] = sortear(rnd, cabem.map((e) => [e, 4 / (e[1].custo + 1)] as [[string, InimigoDef], number]));
    const n = def.grupo ?? 1;
    const [r0, c0] = rnd.pick(livres);
    for (let i = 0; i < n && livres.length; i++) {
      const perto = livres.filter(([r, c]) => Math.abs(r - r0) + Math.abs(c - c0) <= 3);
      const [r, c] = perto.length ? rnd.pick(perto) : rnd.pick(livres);
      saida.push([tipo, c, r]);
      ocupar(r, c);
    }
    orcamento -= def.custo * n;
  }
  return saida;
}
