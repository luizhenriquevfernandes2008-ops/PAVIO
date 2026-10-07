import Phaser from 'phaser';
import { PAL, CORPO, PES_PARADO, PES_A, PES_B, CHAMA_A, CHAMA_B, Grade } from './texturas';
import type { Aparencia } from '../sistemas/Itens';

// Monta a vela com a aparência dos itens: cor da cera, cor da chama,
// quantas chamas e acessórios (óculos, coroa, chapéu...). Gera uma textura nova
// e refaz as animações "heroi_vela_parado/andar".

const CHAMAS: Record<string, [string, string, string]> = {
  padrao: ['#ffe066', '#ff9a2e', '#e2452b'],
  azul: ['#bfe8ff', '#4f9dff', '#2a4fd0'],
  ciano: ['#e8ffff', '#7fe8ff', '#2aa8d0'],
  verde: ['#e8ffb0', '#7fe84f', '#2a9a3a'],
  roxa: ['#f0c8ff', '#b06bff', '#6a2ab0'],
  branca: ['#ffffff', '#e8f0ff', '#a8b8d0'],
  vermelha: ['#ffd0a0', '#ff4a2e', '#a01a10'],
  dourada: ['#fff4b0', '#ffd23f', '#c08a10'],
};

function escurecer(hex: string, f: number) {
  const c = Phaser.Display.Color.HexStringToColor(hex);
  return Phaser.Display.Color.RGBToString(Math.round(c.red * f), Math.round(c.green * f), Math.round(c.blue * f));
}

/** As 6 linhas de cima (chamas) para 1, 2, 3 ou 5 chamas. */
function zonaChama(qtd: number, quadro: 'A' | 'B'): Grade {
  if (qtd <= 1) return quadro === 'A' ? CHAMA_A : CHAMA_B;
  const g = Array.from({ length: 6 }, () => [...'................']);
  const pinta = (x: number, y: number, ch: string) => {
    if (x >= 0 && x < 16 && y >= 0 && y < 6) g[y][x] = ch;
  };
  const mini = (c: number, desloc: number) => {
    pinta(c, 1 + desloc, 'y');
    pinta(c - 1, 2 + desloc, 'y');
    pinta(c, 2 + desloc, 'o');
    pinta(c + 1, 2 + desloc, 'y');
    pinta(c, 3 + desloc, 'r');
    pinta(c, 4, 'o');
    pinta(c, 5, 'k');
  };
  const fina = (c: number, desloc: number) => {
    pinta(c, 2 + desloc, 'y');
    pinta(c, 3 + desloc, 'o');
    pinta(c, 4, 'o');
    pinta(c, 5, 'k');
  };
  const b = quadro === 'B' ? 1 : 0;
  if (qtd === 2) [5, 10].forEach((c, i) => mini(c, (i + b) % 2));
  else if (qtd === 3) [4, 7, 10].forEach((c, i) => mini(c, (i + b) % 2));
  else {
    [4, 6, 9, 11].forEach((c, i) => fina(c, (i + b) % 2));
    mini(7, b);
  }
  return g.map((l) => l.join(''));
}

type Ponto = [number, number, string];

/** Acessórios desenhados por cima (coordenadas no quadro 16x16). */
const ACESSORIOS: Record<string, Ponto[]> = {
  oculos: [
    ...[5, 6, 7, 8, 9, 10].flatMap((x) => [[x, 8, '#2a2a3a'], [x, 9, '#2a2a3a']] as Ponto[]),
    [5, 8, '#7d8494'], [8, 8, '#7d8494'],
  ],
  oculos_grandes: [
    ...[4, 5, 6, 7].flatMap((x) => [7, 8, 9, 10].map((y) => [x, y, x === 4 || x === 7 || y === 7 || y === 10 ? '#cfe8ff' : '#9fd0ff'] as Ponto)),
    ...[8, 9, 10, 11].flatMap((x) => [7, 8, 9, 10].map((y) => [x, y, x === 8 || x === 11 || y === 7 || y === 10 ? '#cfe8ff' : '#9fd0ff'] as Ponto)),
    [6, 8, '#1b1325'], [9, 8, '#1b1325'],
  ],
  monoculo: [
    [8, 7, '#ffd23f'], [9, 7, '#ffd23f'], [10, 7, '#ffd23f'], [8, 8, '#ffd23f'], [10, 8, '#ffd23f'],
    [8, 9, '#ffd23f'], [10, 9, '#ffd23f'], [8, 10, '#ffd23f'], [9, 10, '#ffd23f'], [10, 10, '#ffd23f'],
    [11, 11, '#c08a10'], [11, 12, '#c08a10'],
  ],
  coroa: [
    [5, 5, '#ffd23f'], [6, 5, '#ffd23f'], [8, 5, '#ffd23f'], [9, 5, '#ffd23f'], [10, 5, '#ffd23f'],
    [5, 4, '#ffd23f'], [8, 4, '#ffd23f'], [10, 4, '#ffd23f'], [9, 5, '#e2452b'],
  ],
  chapeu: [
    ...[9, 10, 11, 12, 13, 14].map((x) => [x, 6, '#3a1a5c'] as Ponto),
    [11, 5, '#5a2e8f'], [12, 5, '#5a2e8f'], [13, 5, '#5a2e8f'], [11, 4, '#5a2e8f'], [12, 4, '#5a2e8f'],
    [12, 3, '#5a2e8f'], [13, 2, '#5a2e8f'], [14, 2, '#5a2e8f'], [11, 5, '#ffd23f'],
  ],
  antena: [[3, 6, '#7d8494'], [3, 7, '#7d8494'], [3, 8, '#7d8494'], [3, 9, '#7d8494'], [3, 5, '#ffe066'], [2, 4, '#ffe066'], [4, 4, '#ffe066']],
  asas: [
    ...([[3, 8], [2, 8], [1, 9], [2, 9], [3, 9], [1, 10], [2, 10], [3, 10], [2, 11], [3, 11]] as [number, number][]).flatMap(([x, y]) => [
      [x, y, '#c8e6a0'], [15 - x, y, '#c8e6a0'],
    ] as Ponto[]),
    [2, 9, '#8aa860'], [13, 9, '#8aa860'],
  ],
  mola: [[5, 15, '#9a93a3'], [6, 14, '#9a93a3'], [7, 15, '#9a93a3'], [8, 14, '#9a93a3'], [9, 15, '#9a93a3'], [10, 14, '#9a93a3']],
  olhos_vermelhos: [[6, 8, '#e2452b'], [6, 9, '#e2452b'], [9, 8, '#e2452b'], [9, 9, '#e2452b']],
  relogio: [[5, 11, '#ffd23f'], [6, 11, '#ffd23f'], [5, 12, '#ffd23f'], [6, 12, '#1b1325'], [7, 11, '#c08a10']],
  lencol: [],
  botas: [[5, 14, '#3b3f4a'], [6, 14, '#3b3f4a'], [9, 14, '#3b3f4a'], [10, 14, '#3b3f4a'], [4, 15, '#3b3f4a'], [5, 15, '#3b3f4a'], [6, 15, '#3b3f4a'], [9, 15, '#3b3f4a'], [10, 15, '#3b3f4a'], [11, 15, '#3b3f4a']],
  aureola: [[5, 0, '#ffe066'], [6, 0, '#fff4b0'], [7, 0, '#fff4b0'], [8, 0, '#fff4b0'], [9, 0, '#fff4b0'], [10, 0, '#ffe066']],
  chifres: [[4, 5, '#e2452b'], [4, 4, '#ffb0a0'], [3, 3, '#e2452b'], [11, 5, '#e2452b'], [11, 4, '#ffb0a0'], [12, 3, '#e2452b']],
  costura: [[7, 11, '#1b1325'], [8, 12, '#1b1325'], [7, 13, '#1b1325'], [8, 10, '#1b1325'], [6, 12, '#c0303a']],
  olhos_azuis: [[6, 8, '#8fe3ff'], [6, 9, '#2aa8d0'], [9, 8, '#8fe3ff'], [9, 9, '#2aa8d0']],
};

// texturas já geradas; só apagamos as antigas (a atual e a anterior podem estar em uso numa animação)
let contador = 0;
const historico: string[] = [];

/** Personagem "de chama" (vela, fósforo, lamparina...): o corpo e as cores de base. */
export interface BaseChama {
  id: string; // as animações viram heroi_<id>_parado / _andar
  corpo?: Grade;
  cores?: Record<string, string>;
}

/** Desenha a folha de 6 quadros (2 parado, 4 andando) de um personagem de chama. */
export function desenharChama(scene: Phaser.Scene, chave: string, ap: Aparencia, base: BaseChama = { id: 'vela' }) {
  const [cy, co, cr] = CHAMAS[ap.chama] ?? CHAMAS.padrao;
  const cores: Record<string, string> = { ...PAL, ...base.cores, y: cy, o: co, r: base.corpo ? PAL.r : cr };
  // a cor da cera dos itens vale por cima da cor do personagem
  if (ap.cera) Object.assign(cores, { w: ap.cera, W: escurecer(ap.cera, 0.8) });
  const corpo = base.corpo ?? CORPO;
  const pes = [PES_PARADO, PES_PARADO, PES_A, PES_B, PES_A, PES_B];
  const quadros: Grade[] = pes.map((p, i) => [...zonaChama(ap.chamas, i % 2 ? 'B' : 'A'), ...corpo, ...p]);
  if (scene.textures.exists(chave)) scene.textures.remove(chave);
  const tex = scene.textures.createCanvas(chave, 16 * quadros.length, 16);
  if (!tex) return false;
  const ctx = tex.getContext();
  quadros.forEach((grade, i) => {
    grade.forEach((linha, y) => {
      for (let x = 0; x < linha.length; x++) {
        const cor = cores[linha[x]];
        if (!cor) continue;
        ctx.fillStyle = cor;
        ctx.fillRect(i * 16 + x, y, 1, 1);
      }
    });
    for (const a of ap.acessorios) {
      for (const [x, y, cor] of ACESSORIOS[a] ?? []) {
        ctx.fillStyle = cor;
        ctx.fillRect(i * 16 + x, y, 1, 1);
      }
    }
    tex.add(i, 0, i * 16, 0, 16, 16);
  });
  tex.refresh();
  return true;
}

/** Refaz as animações parado/andar de um personagem apontando para uma textura. */
export function animarPersonagem(scene: Phaser.Scene, id: string, chave: string, quadrosParado = [0, 1], quadrosAndar = [2, 3, 4, 5]) {
  for (const [nome, frames, fps] of [['parado', quadrosParado, 3], ['andar', quadrosAndar, 10]] as [string, number[], number][]) {
    const k = `heroi_${id}_${nome}`;
    if (scene.anims.exists(k)) scene.anims.remove(k);
    scene.anims.create({ key: k, frames: frames.map((f) => ({ key: chave, frame: f })), frameRate: fps, repeat: -1 });
  }
}

/** Gera a textura do personagem de chama com a aparência dos itens e refaz as animações. Retorna a chave. */
export function aplicarAparencia(scene: Phaser.Scene, ap: Aparencia, base: BaseChama = { id: 'vela' }): string {
  const chave = `vela_ap_${++contador}`;
  if (!desenharChama(scene, chave, ap, base)) return 'player';
  animarPersonagem(scene, base.id, chave);
  historico.push(chave);
  while (historico.length > 3) {
    const velha = historico.shift()!;
    if (scene.textures.exists(velha)) scene.textures.remove(velha);
  }
  return chave;
}

/** Volta a vela (e os outros personagens de chama) ao normal: menus e história usam a aparência de base. */
export function restaurarVela(scene: Phaser.Scene, id = 'vela') {
  animarPersonagem(scene, id, id === 'vela' ? 'player' : `pers_${id}`);
}

/** O Pavio Negro (chefe do Abismo) e O Reflexo (O Outro Lado): velas "do avesso". */
export function gerarVelaNegra(scene: Phaser.Scene) {
  velaInimiga(scene, 'pavio_negro', { w: '#2a1f33', W: '#1b1325', y: '#f0c8ff', o: '#8a3aff', r: '#2a0a40' }, 'olhos_vermelhos');
  velaInimiga(scene, 'reflexo', { w: '#bfefff', W: '#7fc8e8', y: '#ffffff', o: '#a8e8ff', r: '#4fa8ff' }, 'olhos_azuis');
}

function velaInimiga(scene: Phaser.Scene, chave: string, tons: Record<string, string>, olhos: string) {
  if (scene.textures.exists(chave)) return;
  const cores: Record<string, string> = { ...PAL, ...tons };
  const quadros: Grade[] = [PES_A, PES_B, PES_A, PES_B].map((p, i) => [...(i % 2 ? CHAMA_B : CHAMA_A), ...CORPO, ...p]);
  const tex = scene.textures.createCanvas(chave, 16 * quadros.length, 16);
  if (!tex) return;
  const ctx = tex.getContext();
  quadros.forEach((grade, i) => {
    grade.forEach((linha, y) => {
      for (let x = 0; x < linha.length; x++) {
        const cor = cores[linha[x]];
        if (!cor) continue;
        ctx.fillStyle = cor;
        ctx.fillRect(i * 16 + x, y, 1, 1);
      }
    });
    for (const [x, y, cor] of ACESSORIOS[olhos]) {
      ctx.fillStyle = cor;
      ctx.fillRect(i * 16 + x, y, 1, 1);
    }
    tex.add(i, 0, i * 16, 0, 16, 16);
  });
  tex.refresh();
}
