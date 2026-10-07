import Phaser from 'phaser';
import { D, PersonagemDef2 } from '../dados';
import { desenharChama, animarPersonagem } from './aparencia';
import { Atlas } from './atlas';
import { GENTE, Gente } from './gente';

// Sprites dos personagens jogáveis.
// - "vela": a vela de sempre (textura "player").
// - "chama": corpo próprio com a chama e os pés da vela (fósforo, lamparina, isqueiro...).
// - "humano": gente (Luiz, Ana, Henrique), desenhada aqui com retângulos, 16x20, 6 quadros.
// - "pack": um herói do pack 0x72.

const prontos = new Set<string>(['vela']);

/** O personagem tem desenho? (sem o pack, os heróis dele não existem) */
export function personagemPronto(id: string) {
  return prontos.has(id);
}

/** Um personagem que dá para usar (cai para a vela se não tiver desenho). */
export function personagemValido(id: string) {
  return D.personagens.some((p) => p.id === id) && prontos.has(id) ? id : 'vela';
}

export function texturaPersonagem(id: string) {
  const def = D.personagens.find((p) => p.id === id);
  if (!def || def.tipo === 'vela') return 'player';
  return def.tipo === 'pack' ? `heroi_${id}` : `pers_${id}`;
}

export function gerarPersonagens(scene: Phaser.Scene) {
  for (const def of D.personagens) {
    if (def.tipo === 'vela') continue;
    if (def.tipo === 'pack') {
      if (Atlas.herois.has(def.id)) prontos.add(def.id);
      continue;
    }
    const chave = `pers_${def.id}`;
    if (def.tipo === 'chama') {
      desenharChama(scene, chave, { chama: def.chama ?? 'padrao', chamas: def.chamas ?? 1, acessorios: def.acessorios ?? [], alpha: 1 }, { id: def.id, corpo: def.corpo, cores: def.cores });
      animarPersonagem(scene, def.id, chave);
    } else if (def.tipo === 'humano' && GENTE[def.id]) {
      desenharGente(scene, chave, GENTE[def.id]);
      animarPersonagem(scene, def.id, chave);
    } else if (def.tipo === 'humano' && def.humano) {
      desenharHumano(scene, chave, def);
      animarPersonagem(scene, def.id, chave);
    }
    if (scene.textures.exists(chave)) prontos.add(def.id);
  }
}

// ---------------- gente desenhada à mão (gente.ts) ----------------

/**
 * 6 quadros de 20x28: 0-1 parado (respirando: o tronco desce 1 pixel), 2-5 andando
 * (levanta a perna esquerda, respira, levanta a direita, respira).
 */
function desenharGente(scene: Phaser.Scene, chave: string, g: Gente) {
  const w = g.grade[0].length;
  const h = g.grade.length;
  const cintura = h - 6; // as 6 últimas linhas são as pernas
  const quadros: [number, number][] = [[0, 0], [1, 0], [0, -1], [1, 0], [0, 1], [1, 0]]; // [respiração, perna levantada]
  if (scene.textures.exists(chave)) scene.textures.remove(chave);
  const tex = scene.textures.createCanvas(chave, w * quadros.length, h);
  if (!tex) return;
  const ctx = tex.getContext();
  quadros.forEach(([bob, perna], q) => {
    const ox = q * w;
    const pinta = (x: number, y: number, ch: string) => {
      const cor = g.paleta[ch];
      if (!cor) return;
      ctx.fillStyle = cor;
      ctx.fillRect(ox + x, y, 1, 1);
    };
    // pernas primeiro (o tronco fica por cima quando a perna sobe)
    for (let y = cintura; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const esquerda = x < w / 2;
        const sobe = (perna < 0 && esquerda) || (perna > 0 && !esquerda) ? 1 : 0;
        pinta(x, y - sobe, g.grade[y][x]);
      }
    }
    for (let y = 0; y < cintura; y++) for (let x = 0; x < w; x++) pinta(x, y + bob, g.grade[y][x]);
    tex.add(q, 0, ox, 0, w, h);
  });
  tex.refresh();
}

// ---------------- gente gerada por código (reserva) ----------------

const W = 16;
const H = 20;

function escurecer(hex: string, f: number) {
  const c = Phaser.Display.Color.HexStringToColor(hex);
  return Phaser.Display.Color.RGBToString(Math.round(c.red * f), Math.round(c.green * f), Math.round(c.blue * f));
}

/**
 * Desenha uma pessoa de frente: cabelo, rosto, roupa, braços e pernas.
 * Quadros: 0-1 parado (respirando), 2-5 andando (pernas e braços alternando).
 */
function desenharHumano(scene: Phaser.Scene, chave: string, def: PersonagemDef2) {
  const h = def.humano!;
  const K = '#1b1325';
  const pele = h.pele;
  const peleS = escurecer(pele, 0.82);
  const cab = h.cabelo;
  const roupa = h.roupa;
  const roupaS = escurecer(roupa, 0.75);
  const calca = h.calca;
  const largo = h.largo ? 1 : 0;
  const tex = scene.textures.createCanvas(chave, W * 6, H);
  if (!tex) return;
  const ctx = tex.getContext();

  for (let q = 0; q < 6; q++) {
    const ox = q * W;
    const px = (x: number, y: number, cor: string, w = 1, hh = 1) => {
      ctx.fillStyle = cor;
      ctx.fillRect(ox + x, y, w, hh);
    };
    const bob = q === 1 ? 1 : 0; // respiração
    const passo = q < 2 ? 0 : [1, 0, -1, 0][q - 2]; // -1 / 0 / 1: qual perna vai à frente

    // ---- pernas e pés ----
    const yP = 15;
    const pernaE = passo > 0 ? 1 : 0;
    const pernaD = passo < 0 ? 1 : 0;
    px(5 - largo, yP, K, 3 + largo, 4 - pernaE);
    px(6 - largo, yP, calca, 2 + largo, 3 - pernaE);
    px(8, yP, K, 3 + largo, 4 - pernaD);
    px(8, yP, calca, 2 + largo, 3 - pernaD);
    px(5 - largo, 19 - pernaE, K, 3 + largo, 1);
    px(8, 19 - pernaD, K, 3 + largo, 1);

    // ---- tronco e braços ----
    const yT = 9 + bob;
    px(3 - largo, yT, K, 10 + largo * 2, 7 - bob);
    px(4 - largo, yT, roupa, 8 + largo * 2, 6 - bob);
    px(4 - largo, yT + 4 - bob, roupaS, 8 + largo * 2, 2);
    if (h.gola) {
      // gola polo: um V na frente
      px(6, yT, peleS, 1, 1);
      px(9, yT, peleS, 1, 1);
      px(7, yT, pele, 2, 2);
      px(6, yT, '#ffffff', 1, 1);
      px(9, yT, '#ffffff', 1, 1);
    }
    if (h.cruz) {
      // a cruz branca do moletom
      px(9, yT + 1, '#ffffff', 1, 3);
      px(8, yT + 2, '#ffffff', 3, 1);
    }
    const braco = q < 2 ? 0 : passo;
    for (const [lado, dy] of [[-1, braco], [1, -braco]] as [number, number][]) {
      const bx = lado < 0 ? 2 - largo : 12 + largo;
      px(bx, yT + 1 + dy, K, 2, 5);
      px(bx + (lado < 0 ? 1 : 0), yT + 1 + dy, h.capuz ? roupa : pele, 1, 4);
      if (h.tatuagem) px(bx + (lado < 0 ? 1 : 0), yT + 2 + dy, '#3a3050', 1, 2);
      px(bx + (lado < 0 ? 1 : 0), yT + 5 + dy, pele, 1, 1);
    }

    // ---- cabeça ----
    const yC = 1 + bob;
    if (h.capuz) {
      // capuz de pelúcia em volta do rosto
      const pelo = h.capuz;
      const peloC = '#e8c894';
      px(2, yC - 1, K, 12, 11);
      px(3, yC, pelo, 10, 9);
      for (const [x, y] of [[3, 0], [6, 0], [10, 0], [12, 2], [3, 5], [12, 6], [4, 8], [11, 8]]) px(x, yC + y, peloC, 1, 1);
      // cantos arredondados
      for (const [x, y] of [[2, -1], [13, -1], [2, 9], [13, 9], [3, -1], [12, -1], [2, 0], [13, 0]]) ctx.clearRect(ox + x, yC + y, 1, 1);
      for (const [x, y] of [[3, 0], [12, 0], [3, 8], [12, 8]]) px(x, yC + y, K, 1, 1);
    }
    px(4, yC + 1, K, 8, 8);
    px(5, yC + 2, pele, 6, 6);
    px(5, yC + 6, peleS, 6, 1);
    // olhos e boca
    px(6, yC + 4, K, 1, 1);
    px(9, yC + 4, K, 1, 1);
    if (h.barba) {
      // bigode e cavanhaque
      px(6, yC + 6, h.barba, 4, 1);
      px(7, yC + 7, h.barba, 2, 2);
    } else {
      px(7, yC + 6, '#a04a4a', 2, 1); // sorriso
      if (h.gola) px(6, yC + 5, '#a04a4a', 1, 1), px(9, yC + 5, '#a04a4a', 1, 1);
    }
    // cabelo
    if (h.estilo === 'ondulado') {
      // topete ondulado
      px(4, yC, K, 8, 3);
      px(5, yC - 1, K, 6, 1);
      px(5, yC, cab, 6, 2);
      px(4, yC + 1, cab, 2, 2);
      px(10, yC + 1, cab, 2, 2);
      px(6, yC - 1, cab, 3, 1);
      px(7, yC + 1, '#3a3050', 2, 1);
    } else if (h.estilo === 'franja') {
      // franja reta e cabelo até o queixo
      px(4, yC + 1, cab, 8, 2);
      px(5, yC + 3, cab, 1, 1);
      px(7, yC + 3, cab, 3, 1);
      px(4, yC + 3, cab, 1, 5);
      px(11, yC + 3, cab, 1, 5);
    } else {
      // bagunçado, com mechas para cima
      px(4, yC, K, 8, 3);
      px(5, yC, cab, 6, 2);
      px(4, yC + 1, cab, 1, 3);
      px(11, yC + 1, cab, 1, 3);
      for (const x of [5, 8, 10]) px(x, yC - 1, cab, 1, 1);
      px(6, yC + 2, cab, 2, 1);
    }
  }
  for (let q = 0; q < 6; q++) tex.add(q, 0, q * W, 0, W, H);
  tex.refresh();
}
