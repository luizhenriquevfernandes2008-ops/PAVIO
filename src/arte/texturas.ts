import Phaser from 'phaser';
import { D } from '../dados';
import { Atlas } from './atlas';

// Arte desenhada em código: a vela, as armas, balas e efeitos.
// Cada sprite é uma grade de letras; cada letra é uma cor da paleta e '.' é transparente.
// Monstros, chão e paredes vêm do pack 0x72 (ver atlas.ts); os desenhos daqui servem de reserva.

export const PAL: Record<string, string> = {
  k: '#1b1325', // contorno
  w: '#f4ead6', // cera
  W: '#cdb89a', // cera sombra
  y: '#ffe066', // chama clara
  o: '#ff9a2e', // chama
  r: '#e2452b', // vermelho
  P: '#8d5fb5', // morcego claro
  p: '#5b3a7a', // morcego escuro
  b: '#e6e1cf', // osso
  B: '#a59f8a', // osso sombra
  g: '#5fcf6b', // slime
  G: '#2e8a45', // slime sombra
  h: '#b8f5a8', // slime brilho
  c: '#7a2e8f', // manto do mago
  C: '#4b1a5c', // manto sombra
  n: '#23324a', // apagador
  N: '#3e5a7e', // apagador claro
  z: '#8fe3ff', // olhos do apagador
  m: '#b09a6a', // metal
  M: '#6e5a3a', // metal sombra
  t: '#9a5a2e', // madeira
  T: '#6b3a1c', // madeira sombra
  d: '#ffd23f', // ouro
  a: '#3b3f4a', // metal escuro
  A: '#7d8494', // metal claro
  q: '#8a5a2b', // coronha
  Q: '#5c3a1a', // coronha sombra
  v: '#9b3bff', // bala inimiga
  x: '#ff6bd6', // bala inimiga clara
  u: '#3a3550', // capuz do wraith
  U: '#5a5478', // capuz claro
};

export type Grade = string[];

/** Recebe a metade esquerda (8 colunas) e espelha para formar 16 colunas. */
const esp = (meia: Grade): Grade => meia.map((l) => l + [...l].reverse().join(''));

// ---------------- Vela (jogador) ----------------
export const CHAMA_A: Grade = [
  '................',
  '.......y........',
  '......yoy.......',
  '......yry.......',
  '.......o........',
  '.......k........',
];
export const CHAMA_B: Grade = [
  '................',
  '........y.......',
  '.......yoy......',
  '......yory......',
  '.......oo.......',
  '.......k........',
];
export const CORPO: Grade = [
  '.....kkkkkk.....',
  '....kwwwwwwk....',
  '....kwkwwkWk....',
  '....kwkwwkWk....',
  '....kwwwwwWk....',
  '....kwwwwwWk....',
  '....kWwwwwWk....',
  '....kWWWWWWk....',
];
export const PES_PARADO: Grade = ['.....kkkkkk.....', '.....kk..kk.....'];
export const PES_A: Grade = ['.....kkkkkk.....', '....kk....kk....'];
export const PES_B: Grade = ['.....kkkkkk.....', '......kkkk......'];
const vela = (chama: Grade, pes: Grade) => [...chama, ...CORPO, ...pes];
const PLAYER = [
  vela(CHAMA_A, PES_PARADO), vela(CHAMA_B, PES_PARADO),
  vela(CHAMA_A, PES_A), vela(CHAMA_B, PES_B), vela(CHAMA_B, PES_A), vela(CHAMA_A, PES_B),
];

// ---------------- Inimigos ----------------
const MORCEGO = [
  esp([
    '........', '........', 'k.......', 'kk......', 'kPk...k.', 'kPPk..kk', '.kPPkkpp', '.kPPPprp',
    '..kPPppp', '..kPkppp', '...k.kpp', '......kk', '........', '........', '........', '........',
  ]),
  esp([
    '........', '........', '........', '........', '......k.', '......kk', '....kkpp', '..kkPprp',
    '.kPPPppp', 'kPPPkppp', 'kPk..kpp', 'kk....kk', 'k.......', '........', '........', '........',
  ]),
];

const ESQ_TOPO = [
  '........', '....kkkk', '...kbbbb', '...kbkkb', '...kbbbb', '....kbkb', '.....kkk', '...kbbbb',
  '..kbkbkb', '..kbkBbb', '..kk.kbk', '....kbbb',
];
const ESQUELETO = [
  esp([...ESQ_TOPO, '....kbkk', '....kbk.', '....kbk.', '...kkk..']),
  esp([...ESQ_TOPO, '....kbkk', '...kbk..', '...kbk..', '..kkk...']),
];

const SLIME = [
  esp([
    '........', '........', '........', '........', '........', '........', '.....kkk', '....kggg',
    '...kghgg', '..kgghgg', '..kggkgg', '..kggkgg', '.kgggggg', '.kGggggg', '.kGGGGGG', '..kkkkkk',
  ]),
  esp([
    '........', '........', '........', '........', '........', '........', '........', '.....kkk',
    '...kkggg', '..kgghgg', '.kgggkgg', '.kgggkgg', 'kggggggg', 'kGgggggg', 'kGGGGGGG', '.kkkkkkk',
  ]),
];

const MAGO_TOPO = ['.......k', '......kc', '.....kcc', '.....kcc', '....kccc', '...kcccc', '..kkkkkk', '....kkkk'];
const MAGO = [
  esp([...MAGO_TOPO, '....kkyk', '....kkkk', '...kcccc', '..kcccCc', '..kccCcc', '..kcCccc', '.kccCccc', '.kkkkkkk']),
  esp([...MAGO_TOPO, '....kkok', '....kkkk', '...kcccc', '..kcccCc', '..kccCcc', '..kcCccc', '..kcCccc', '.kkkkkkk']),
];

const APAG_TOPO = [
  '.......k', '......kN', '.....kNN', '.....kNN', '....kNNN', '...kNNNN', '..kkkkkk', '...knnnn',
  '..knnzzn', '..knnnnn', '.knnnkkn', '.knnnnnn', 'knnnnnnn',
];
const APAGADOR = [
  esp([...APAG_TOPO, 'knnknnnn', 'knk.knnk', 'kk...kk.']),
  esp([...APAG_TOPO, 'knnnknnn', '.knk.knn', '..k...kk']),
];

// ---------------- Objetos ----------------
const CAST_BASE = ['......kw', '......kw', '......kw', '......kw', '....kkkk', '...kmmmm', '....kkkm', '......km', '......km', '....kkmm', '...kMMMM'];
const CASTICAL = [
  esp(['........', '........', '........', '........', '.......k', ...CAST_BASE]),
  esp(['........', '.......y', '......yo', '......yr', '.......k', ...CAST_BASE]),
  esp(['........', '........', '.......y', '......yo', '.......k', ...CAST_BASE]),
];

const BAU = [
  esp([
    '........', '........', '........', '........', '..kkkkkk', '.kTttttt', '.kTttttt', '.kkkkkkk',
    '.kTtttdd', '.kTttttk', '.kTttttt', '.kTttttt', '.kTTTTTT', '.kkkkkkk', '........', '........',
  ]),
  esp([
    '........', '..kkkkkk', '.kTttttt', '.kTttttt', '.kkkkkkk', '.kkkkkkk', '.kkdkkdk', '.kkkkkkk',
    '.kTttttt', '.kTttttt', '.kTttttt', '.kTttttt', '.kTTTTTT', '.kkkkkkk', '........', '........',
  ]),
];

const VELA_ITEM: Grade[] = [[
  '...yy...', '..yooy..', '...oo...', '...kk...', '..kkkk..', '.kwwwWk.',
  '.kwwwWk.', '.kwwwWk.', '.kwwwWk.', '.kwwwWk.', '.kWWWWk.', '..kkkk..',
]];

const GOTA: Grade[] = [['...kk...', '..kwwk..', '.kwwwWk.', '.kwwwWk.', '.kwwWWk.', '..kWWk..', '...kk...', '........']];

const RELIQUIA: Grade[] = [[
  '...kkkk...', '..kwwwwk..', '.kwwwwwWk.', 'kwwwwwwWWk', 'kwwwwwwWWk',
  'kwwwwwWWWk', 'kWwwwWWWWk', '.kWWWWWWk.', '..kWWWWk..', '...kkkk...',
]];

// bala dos inimigos: roxa/rosa, para não confundir com as suas (que são de fogo)
const BALA_INIMIGA: Grade[] = [
  ['........', '..vxxv..', '.vxwwxv.', '.xwwwwx.', '.xwwwwx.', '.vxwwxv.', '..vxxv..', '........'],
  ['...vv...', '..vxxv..', '.vxwwxv.', 'vxwwwwxv', 'vxwwwwxv', '.vxwwxv.', '..vxxv..', '...vv...'],
];

// ---------------- Armas (apontando para a direita, empunhadura à esquerda) ----------------
const ARMAS: Record<string, Grade> = {
  arma_pistola: ['kkkkkkkkk.', 'kAAAAAAAak', 'kaaaaaaaak', 'kqqkkkkkk.', 'kqqk......', 'kkk.......'],
  arma_escopeta: [
    '.kkkkkkkkkkkkkkk', 'kQqqqkAAAAAAAAAk', 'kqqqqkaaaaaaaaak', 'kQqqkkkkkkkkkkk.', 'kqqk..kak.......', 'kkk...kkk.......',
  ],
  arma_metralhadora: [
    '....kkkkkkkk.', 'kkkkAAAAAAAAk', 'kaaaaaaaaaaak', 'kkkkkakkakkk.', '...kak.kak...', '...kak..kk...', '...kkk.......',
  ],
  arma_revolver: ['kkkkkkkkkkkk.', 'kAAAkAAAAAAAk', 'kaaakaaaaaaak', 'kakkkkkkkkkk.', 'kQqk.........', 'kkk..........'],
  arma_lancador: [
    '....kkkkkkkkkkk.', '...kAAAAAAAAAAAk', 'kkkkaaaaaaaaaoak', 'kQqkaaaaaaaaaoak',
    'kqqkAaaaaaaaaaak', 'kqqkkkkkkkkkkkk.', 'kkk..kak........', '.....kkk........',
  ],
  arma_ricochete: ['.kkkkkkkkkkkk.', 'kAAAzzAAAAAAAk', 'kaaazzaaaaaaak', 'kakkkkkkkkkkk.', 'kqqk..........', 'kkk...........'],
  arma_vagalume: ['......kkk...', '.kkkkkkggk..', 'kAAAAAkgggk.', 'kaaaaakgggk.', 'kakkkkkkgk..', 'kqqk...kk...', 'kkk.........'],
  arma_tesla: ['..........kzk.', '.kkkkkkkkkzzzk', 'kAAkzkzkzkAAAk', 'kaakzkzkzkaaak', 'kakkkkkkkkkkk.', 'kqqk..........', 'kkk...........'],
  arma_gelo: ['.kkkkkkkkk..', 'kzzzzzzzzwk.', 'kzwzzzzzzzzk', 'kkkkkzkkkkk.', 'kqqk.kk.....', 'kkk.........'],
  arma_gatling: [
    '....kkkkkkkkkkk.', '..kkAAAAAAAAAAAk', '.kaakaaaaaaaaaak', 'kaaakAAAAAAAAAAk',
    'kaaakaaaaaaaaaak', '.kaakkkkkkkkkkk.', '..kqqk..........', '..kkk...........',
  ],
  arma_cluster: [
    '....kkkkkkkkkk.', '...kAAArAAArAAk', 'kkkkaaaraaaraak', 'kQqkaaaraaaraak',
    'kqqkAaaaaaaaaak', 'kqqkkkkkkkkkkk.', 'kkk..kak.......', '.....kkk.......',
  ],
  arma_laser: ['...kkkkkkkk....', '..kxxxxxxxxkkkk', 'kkkaaaaaaaaxwwk', 'kqkAAAAAAAAkkkk', 'kqqkkkkkkkk....', 'kqqk...........', 'kkk............'],
  arma_serra: [
    '........kkk...', '.......kAAAk..', '......kAkkkAk.', 'kkkkkkkAkkkAkk', 'kaaaaaakAAAkak',
    'kakkkkkkkkkkk.', 'kqqk..........', 'kqqk..........', 'kkk...........',
  ],
  arma_zarabatana: ['kkkkkkkkkkkkkkk.', 'kqgggqqqqqqqqqqk', 'kkkkkkkkkkkkkkk.', '..kqk...........', '..kk............'],
  arma_vazio: [
    '......kkkk....', '....kkvvvvkk..', 'kkkkkvvxxvvvkk', 'kQqkvvxwxvvvak',
    'kqqkvvvxvvvvak', 'kqqkkkvvvvkkk.', 'kkk...kkkk....', '..............',
  ],
  arma_vela_romana: ['............yk', 'kkkkkkkkkkkkok', 'krwrwrwrwrwrrk', 'kkkkkkkkkkkkk.', '..kqk.........', '..kk..........'],
  arma_macarico: [
    '..kkkk.........', '.kooook........', '.kooookkkkkkkk.', 'kkoookAAAAAAAAk', 'kqkkkkaaaaaaakk', 'kqqk..kak......', 'kkk...kkk......',
  ],
};

// logo da WW Studios: um espectro encapuzado (wraith)
const WRAITH: Grade[] = [
  esp(['......kk', '....kkuu', '...kuuuu', '..kuUUuu', '..kuUkkk', '.kuUkzzk', '.kuUkkkk', '.kuUkkkk',
       '.kuuUkkk', '.kuuuUkk', 'kuuuuUUk', 'kuuuuuUU', 'kuukuuuU', 'kuk.kuuk', 'kk...kuk', '.....kk.']),
  esp(['......kk', '....kkuu', '...kuuuu', '..kuUUuu', '..kuUkkk', '.kuUkzzk', '.kuUkkkk', '.kuUkkkk',
       '.kuuUkkk', '.kuuuUkk', 'kuuuuUUk', 'kuuuuuUU', '.kuukuuU', '.kuk.kuk', '..kk..kk', '........']),
];

const CAIXA_MUNICAO: Grade[] = [[
  '..y..y..y...', '..o..o..o...', 'kkkkkkkkkkkk', 'kggggggggggk', 'kgGGGGGGGGgk',
  'kgGkkkkkkGgk', 'kgGkyyyykGgk', 'kgGkkkkkkGgk', 'kggggggggggk', 'kkkkkkkkkkkk',
]];

// ---------------- Geração ----------------

function folhaDeGrades(scene: Phaser.Scene, chave: string, quadros: Grade[]) {
  if (scene.textures.exists(chave)) return; // já veio do pack 0x72
  const h = quadros[0].length;
  const w = Math.max(...quadros[0].map((l) => l.length));
  const tex = scene.textures.createCanvas(chave, w * quadros.length, h);
  if (!tex) return;
  const ctx = tex.getContext();
  quadros.forEach((grade, i) => {
    grade.forEach((linha, y) => {
      for (let x = 0; x < linha.length; x++) {
        const cor = PAL[linha[x]];
        if (!cor) continue;
        ctx.fillStyle = cor;
        ctx.fillRect(i * w + x, y, 1, 1);
      }
    });
    tex.add(i, 0, i * w, 0, w, h);
  });
  tex.refresh();
}

function aleatorio(semente: number) {
  let s = semente;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function folhaPintada(
  scene: Phaser.Scene, chave: string, w: number, h: number, quadros: number,
  pintar: (ctx: CanvasRenderingContext2D, i: number, px: (x: number, y: number, cor: string, lw?: number, lh?: number) => void) => void,
) {
  if (scene.textures.exists(chave)) return;
  const tex = scene.textures.createCanvas(chave, w * quadros, h);
  if (!tex) return;
  const ctx = tex.getContext();
  for (let i = 0; i < quadros; i++) {
    const px = (x: number, y: number, cor: string, lw = 1, lh = 1) => {
      ctx.fillStyle = cor;
      ctx.fillRect(i * w + x, y, lw, lh);
    };
    pintar(ctx, i, px);
    tex.add(i, 0, i * w, 0, w, h);
  }
  tex.refresh();
}

export function gerarTexturas(scene: Phaser.Scene) {
  folhaDeGrades(scene, 'player', PLAYER);
  folhaDeGrades(scene, 'morcego', MORCEGO);
  folhaDeGrades(scene, 'esqueleto', ESQUELETO);
  folhaDeGrades(scene, 'slime', SLIME);
  folhaDeGrades(scene, 'mago', MAGO);
  folhaDeGrades(scene, 'apagador', APAGADOR);
  folhaDeGrades(scene, 'castical', CASTICAL);
  folhaDeGrades(scene, 'bau', BAU);
  folhaDeGrades(scene, 'vela_item', VELA_ITEM);
  folhaDeGrades(scene, 'gota', GOTA);
  folhaDeGrades(scene, 'reliquia', RELIQUIA);
  folhaDeGrades(scene, 'bala_inimiga', BALA_INIMIGA);
  // balas inimigas com efeito: gelo (azul) e veneno (verde)
  folhaDeGrades(scene, 'bala_gelo', BALA_INIMIGA.map((q) => q.map((l) => l.replace(/v/g, 'z').replace(/x/g, 'w'))));
  folhaDeGrades(scene, 'bala_veneno', BALA_INIMIGA.map((q) => q.map((l) => l.replace(/v/g, 'G').replace(/x/g, 'g'))));
  folhaDeGrades(scene, 'caixa_municao', CAIXA_MUNICAO);
  folhaDeGrades(scene, 'wraith', WRAITH);
  for (const [chave, grade] of Object.entries(ARMAS)) folhaDeGrades(scene, chave, [grade]);
  gerarArmasExtras(scene);

  // monstros novos sem arte embutida própria reaproveitam um desenho parecido
  const reservas: Record<string, string> = {
    goblin: 'esqueleto', orc: 'esqueleto', necromante: 'mago', zumbi: 'slime', carnical: 'esqueleto', lesminha: 'slime', lesma: 'slime',
    abobora: 'mago', zumbi_gelo: 'esqueleto', chifrudo: 'morcego', anjo: 'morcego', escudeiro: 'esqueleto', doutor: 'mago', wogol: 'mago',
    ogro: 'apagador', rei_podre: 'apagador',
  };
  for (const [chave, base] of Object.entries(reservas)) {
    if (scene.textures.exists(chave)) continue;
    const src = scene.textures.get(base).getSourceImage() as HTMLCanvasElement;
    const tex = scene.textures.createCanvas(chave, src.width, src.height);
    if (!tex) continue;
    tex.getContext().drawImage(src, 0, 0);
    for (let i = 0; i < src.width / 16; i++) tex.add(i, 0, i * 16, 0, 16, 16);
    tex.refresh();
  }

  // ---- balas e efeitos (brancos: recebem a cor da arma por tint) ----
  const bolinha = (chave: string, tam: number, nucleo: string, borda: string) =>
    folhaPintada(scene, chave, tam, tam, 1, (ctx) => {
      const c = tam / 2;
      ctx.fillStyle = borda;
      ctx.beginPath();
      ctx.arc(c, c, c, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = nucleo;
      ctx.beginPath();
      ctx.arc(c, c, c * 0.55, 0, Math.PI * 2);
      ctx.fill();
    });
  bolinha('bala', 6, '#ffffff', '#ffe0a0');
  bolinha('chumbo', 4, '#ffffff', '#ffc070');
  bolinha('bala_grande', 8, '#ffffff', '#fff0c0');
  bolinha('vagalume', 6, '#ffffff', '#d8ffb0');
  folhaPintada(scene, 'faisca', 8, 6, 1, (_c, _i, px) => {
    for (const [x, y] of [[0, 3], [1, 2], [2, 1], [3, 2], [4, 3], [5, 2], [6, 1], [7, 2]]) px(x, y, '#ffffff', 1, 2);
  });
  folhaPintada(scene, 'cristal', 7, 7, 1, (_c, _i, px) => {
    px(3, 0, '#ffffff', 1, 7);
    px(0, 3, '#ffffff', 7, 1);
    px(2, 2, '#ffffff', 3, 3);
  });
  folhaPintada(scene, 'agulha', 9, 3, 1, (_c, _i, px) => {
    px(0, 1, '#ffffff', 8, 1);
    px(8, 1, '#cfd8dc', 1, 1);
    px(0, 0, '#ffffff', 2, 3);
  });
  folhaPintada(scene, 'serra', 12, 12, 1, (ctx) => {
    ctx.fillStyle = '#cfd8dc';
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = i % 2 ? 4 : 6;
      ctx.lineTo(6 + Math.cos(a) * r, 6 + Math.sin(a) * r);
    }
    ctx.fill();
    ctx.fillStyle = '#7d8494';
    ctx.fillRect(4, 4, 4, 4);
    ctx.fillStyle = '#1b1325';
    ctx.fillRect(5, 5, 2, 2);
  });
  folhaPintada(scene, 'orbe', 14, 14, 1, (ctx) => {
    const g = ctx.createRadialGradient(7, 7, 0, 7, 7, 7);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.45, 'rgba(20,0,40,1)');
    g.addColorStop(0.7, 'rgba(176,107,255,1)');
    g.addColorStop(1, 'rgba(176,107,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 14, 14);
  });
  folhaPintada(scene, 'foguete', 9, 5, 1, (_c, _i, px) => {
    px(2, 1, '#ffffff', 5, 3);
    px(7, 2, '#ffffff', 2, 1);
    px(0, 1, '#ffe066', 2, 3);
    px(3, 0, '#ffffff', 2, 1);
    px(3, 4, '#ffffff', 2, 1);
  });
  folhaPintada(scene, 'granada', 6, 6, 1, (_c, _i, px) => {
    px(1, 0, '#1b1325', 4, 6);
    px(0, 1, '#1b1325', 6, 4);
    px(1, 1, '#4a4452', 4, 4);
    px(1, 1, '#7d8494', 2, 1);
    px(4, 0, '#ff9a2e', 1, 1);
  });
  folhaPintada(scene, 'chama', 8, 8, 1, (ctx) => {
    const g = ctx.createRadialGradient(4, 4, 0, 4, 4, 4);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 8);
  });
  folhaPintada(scene, 'clarao', 9, 9, 1, (_c, _i, px) => {
    px(4, 0, '#ffe066', 1, 9);
    px(0, 4, '#ffe066', 9, 1);
    px(3, 3, '#fff4d6', 3, 3);
    px(2, 2, '#ffb43a', 1, 1);
    px(6, 2, '#ffb43a', 1, 1);
    px(2, 6, '#ffb43a', 1, 1);
    px(6, 6, '#ffb43a', 1, 1);
  });
  folhaPintada(scene, 'cartucho', 3, 2, 1, (_c, _i, px) => {
    px(0, 0, '#d9a441', 3, 2);
    px(2, 0, '#8a5a2b', 1, 2);
  });
  // mira (desenhada no HUD, em tamanho de tela)
  folhaPintada(scene, 'mira', 21, 21, 1, (_c, _i, px) => {
    const linha = (x: number, y: number, w: number, h: number) => {
      px(x - 1, y - 1, '#1b1325', w + 2, h + 2);
    };
    for (const [x, y, w, h] of [[10, 1, 1, 6], [10, 14, 1, 6], [1, 10, 6, 1], [14, 10, 6, 1]]) linha(x, y, w, h);
    for (const [x, y, w, h] of [[10, 1, 1, 6], [10, 14, 1, 6], [1, 10, 6, 1], [14, 10, 6, 1]]) px(x, y, '#fff4d6', w, h);
    px(9, 9, '#1b1325', 3, 3);
    px(10, 10, '#ffb43a', 1, 1);
  });

  folhaPintada(scene, 'piso', 16, 16, 4, (_c, i, px) => {
    const r = aleatorio(11 + i * 97);
    px(0, 0, '#2a2030', 16, 16);
    px(0, 7, '#1f1726', 16, 1);
    px(i % 2 ? 5 : 10, 0, '#1f1726', 1, 7);
    px(i % 2 ? 11 : 3, 8, '#1f1726', 1, 8);
    for (let n = 0; n < 12; n++) px(Math.floor(r() * 16), Math.floor(r() * 16), '#352a3d');
    for (let n = 0; n < 6; n++) px(Math.floor(r() * 16), Math.floor(r() * 16), '#211a28');
    if (i === 3) for (let n = 0; n < 5; n++) px(3 + n, 10 + (n % 2), '#17111c');
  });

  folhaPintada(scene, 'parede', 16, 16, 2, (_c, i, px) => {
    const r = aleatorio(301 + i * 13);
    px(0, 0, '#4b3a58', 16, 16);
    for (let fila = 0; fila < 4; fila++) {
      const y = fila * 4;
      px(0, y, '#5e4a6e', 16, 1);
      px(0, y + 3, '#2c2236', 16, 1);
      const desloc = (fila + i) % 2 ? 4 : 0;
      for (let x = desloc; x < 16; x += 8) px(x, y, '#2c2236', 1, 3);
    }
    for (let n = 0; n < 8; n++) px(Math.floor(r() * 16), Math.floor(r() * 16), '#3f3049');
  });

  folhaPintada(scene, 'coluna', 16, 16, 1, (_c, _i, px) => {
    px(1, 1, '#1b1325', 14, 15);
    px(2, 2, '#5a4868', 12, 12);
    px(2, 2, '#76628a', 12, 4);
    px(2, 2, '#8a76a0', 12, 1);
    px(11, 6, '#46384f', 3, 8);
    px(2, 13, '#3a2e44', 12, 1);
    px(4, 8, '#46384f', 1, 3);
    px(7, 10, '#46384f', 2, 1);
  });

  folhaPintada(scene, 'caixote', 16, 16, 1, (_c, _i, px) => {
    px(1, 2, '#1b1325', 14, 14);
    px(2, 3, '#9a5a2e', 12, 12);
    px(2, 3, '#b8743c', 12, 2);
    px(2, 8, '#6b3a1c', 12, 1);
    px(7, 3, '#6b3a1c', 1, 12);
  });
  folhaPintada(scene, 'espinhos', 16, 16, 4, (_c, i, px) => {
    px(1, 1, '#241b2a', 14, 14);
    for (const [x, y] of [[3, 4], [10, 4], [6, 9], [12, 11], [3, 12]]) {
      px(x, y, '#120d17', 2, 2);
      if (i >= 2) px(x, y - (i === 3 ? 4 : 2), '#cfd8dc', 1, i === 3 ? 5 : 3);
      if (i === 1) px(x, y, '#7d8494', 1, 1);
    }
  });
  folhaPintada(scene, 'porta', 16, 16, 1, (_c, _i, px) => {
    px(0, 0, '#120d17', 16, 16);
    px(0, 3, '#4d4657', 16, 2);
    px(0, 11, '#4d4657', 16, 2);
    for (const x of [1, 5, 9, 13]) {
      px(x, 0, '#6d6577', 2, 16);
      px(x, 0, '#9a93a3', 1, 16);
    }
    px(0, 3, '#7c7487', 16, 1);
    px(0, 11, '#7c7487', 16, 1);
  });

  folhaPintada(scene, 'escada', 16, 16, 1, (_c, _i, px) => {
    px(0, 0, '#1b1325', 16, 16);
    const tons = ['#6e5a7e', '#56456a', '#3e3150', '#2a2036', '#16101d'];
    tons.forEach((cor, s) => {
      px(2, 2 + s * 3, cor, 12, 3);
      px(2, 2 + s * 3, '#8a76a0', 12, 1);
    });
  });

  folhaPintada(scene, 'pedestal', 16, 16, 1, (_c, _i, px) => {
    px(2, 6, '#1b1325', 12, 10);
    px(3, 7, '#8a7a9a', 10, 2);
    px(5, 9, '#5a4868', 6, 4);
    px(3, 13, '#463852', 10, 2);
    px(3, 7, '#a898b8', 10, 1);
  });

  // rachadura por cima da parede: dica de passagem secreta
  folhaPintada(scene, 'rachadura', 16, 16, 1, (_c, _i, px) => {
    for (const [x, y] of [[7, 1], [7, 2], [8, 3], [8, 4], [7, 5], [6, 6], [6, 7], [7, 8], [8, 9], [9, 10], [9, 11], [8, 12], [8, 13], [4, 7], [5, 7], [10, 5], [11, 4], [12, 4]]) px(x, y, '#120d17');
    for (const [x, y] of [[8, 1], [9, 3], [8, 5], [7, 7], [9, 9], [10, 11]]) px(x, y, '#7a6690');
  });
  // saída de luz (depois do Apagador e no Abismo): arco dourado com luz dentro
  folhaPintada(scene, 'portal_luz', 16, 20, 1, (_c, _i, px) => {
    px(2, 4, '#1b1325', 12, 16);
    px(4, 2, '#1b1325', 8, 2);
    px(3, 5, '#ffd23f', 10, 15);
    px(5, 3, '#ffd23f', 6, 2);
    px(4, 6, '#fff4b0', 8, 14);
    px(6, 4, '#fff4b0', 4, 2);
    px(6, 8, '#ffffff', 4, 12);
    px(7, 6, '#ffffff', 2, 2);
  });

  folhaPintada(scene, 'pixel', 2, 2, 1, (_c, _i, px) => px(0, 0, '#ffffff', 2, 2));

  // Luz: gradiente radial branco -> transparente. É "apagado" da camada de escuridão.
  if (!scene.textures.exists('luz')) {
    const tex = scene.textures.createCanvas('luz', 64, 64);
    if (tex) {
      const ctx = tex.getContext();
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.8, 'rgba(255,255,255,0.35)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      tex.refresh();
    }
  }
}

// ---------------- Armas míticas de estimação ----------------
// TETE (pug), NIX (gata preta) e YUUMI (gata tigrada cinza). Cada uma com a própria paleta.
const PETS: Record<string, { grade: Grade; cores: Record<string, string> }> = {
  // TETE: pug de lado, com a cara de frente (testa com rugas, orelhinhas pretas, focinho preto e a língua de fora)
  arma_tete: {
    grade: [
      '........kk.kkkkkk.kk',
      '........knkfFFFFfknk',
      '.kk.....knnfFwwFfnnk',
      'kFFk.....kfffFFfffk.',
      'kfk.kkkkkfoeffffoefk',
      '.kkfFFFFkfeeffffeefk',
      '.kfFFFFFkffffnnffffk',
      'kffFFFFfkffnnNNnnffk',
      'kfffffffskfnnkknnfk.',
      'ksfffffffsknnnlnnk..',
      '.ksffssssskkkkllkk..',
      '..kfk.kfk.kfk.......',
      '..kk..kk..kk........',
    ],
    cores: { k: '#1b1325', n: '#2a2030', N: '#6a5e72', f: '#d6a468', F: '#f0d29c', s: '#a8783e', o: '#ffffff', e: '#120d17', l: '#ff7a9a', w: '#b8844a' },
  },
  arma_nix: {
    grade: ["k.........k...k.","Nk.......knk.knk","kNk......knnknnk",".kNk.....knnnnnk","..kNkkkkkneNneNk","...kNNNNNnnnlnnk","...knnnnnnnnnnk.","...knnnnnnnkkk..","....knk.knk.knk.","....kk..kk..kk.."],
    cores: { k: '#0d0912', n: '#231c2e', N: '#3e3450', e: '#c8ff4f', l: '#ff8ac8' },
  },
  arma_polaroid_luiz: {
    grade: [
      '...kkk..........',
      '..kFFFk.kkkkkk..',
      '.kkkkkkkkwwwwwkk',
      'kwwwwwwkwwkkkwwk',
      'kwwhhwwkwknnnkwk',
      'kwwhhwwkwknEnkwk',
      'kwwwwwwkwknnnkwk',
      'kwwwwwwkwwkkkwwk',
      '.kkkkkkkkkkkkkk.',
      '..kpppppk.......',
      '..kpllppk.......',
      '..kkkkkkk.......',
    ],
    cores: { k: '#1b1325', w: '#f2efe6', F: '#ffe066', h: '#ff8ac8', n: '#2a2033', E: '#7fd7ff', p: '#ffffff', l: '#c68a5e' },
  },
  // YUUMI: tigrada cinza (listras escuras na testa e no corpo), peito, focinho e patinhas brancas, nariz rosado
  arma_yuumi: {
    grade: [
      'k.........k...k.',
      'sk.......knk.knk',
      'kNk......knpknpk',
      '.ksk.....ksnsnsk',
      '..kNkkkkkneNneNk',
      '...ksNsNsNnwlwnk',
      '...knsnsnswwwwk.',
      '...knsnsnwwkkk..',
      '....kwk.kwk.kwk.',
      '....kk..kk..kk..',
    ],
    cores: { k: '#1b1325', n: '#8a857a', N: '#aca69a', s: '#3e3a36', w: '#f4f1ea', e: '#a8c85a', l: '#e8a07a', p: '#e8a8a0' },
  },
  // ---- familiares (itens que seguem a vela) ----
  fam_morcego: {
    grade: ['k...........k', 'kk.........kk', 'kPk..k.k..kPk', 'kPPkkpkpkkPPk', '.kPPpepepPPk.', '..kkpppppkk..', '....kkkkk....'],
    cores: { k: '#1b1325', P: '#8d5fb5', p: '#5b3a7a', e: '#ff5a4a' },
  },
  fam_mariposa: {
    grade: ['..k.....k..', '...k...k...', 'kkk.kkk.kkk', 'kWWkkbkkWWk', 'kWwWkbkWwWk', 'kWWWkbkWWWk', '.kWkkbkkWk.', '..k..k..k..'],
    cores: { k: '#1b1325', W: '#e8d8a8', w: '#ffb43a', b: '#7a6040' },
  },
  fam_fantasma: {
    grade: ['...kkkk...', '..kwwwwk..', '.kwwwwwwk.', '.kwkwwkwk.', '.kwkwwkwk.', '.kwwwwwwk.', '.kwbwwbwk.', '.kwwwwwwk.', '.kwwwwwwk.', '.kwkwwkwk.', '..k.kk.k..'],
    cores: { k: '#1b1325', w: '#e8f4ff', b: '#9fd0ff' },
  },
  fam_vagalume: {
    grade: ['..k.k...', '.kwkwk..', 'kbbbbkk.', 'kbebbLLk', '.kkkkLLk', '....kk..'],
    cores: { k: '#1b1325', b: '#4a3a2a', w: '#cfe8ff', L: '#d8ff6b', e: '#ffffff' },
  },
  fam_coruja: {
    grade: ['.k......k.', '.kk....kk.', 'kcckkkkcck', 'kcwwccwwck', 'kcwekkewck', 'kccccoccck', 'kcCcCcCcck', 'kcCcCcCcck', '.kcccccck.', '..kokkok..'],
    cores: { k: '#1b1325', c: '#a8804a', C: '#e8c890', w: '#ffffff', e: '#1b1325', o: '#ffb43a' },
  },
  // ---- máquinas das salas novas ----
  bigorna: {
    grade: ['.kkkkkkkkkkkkkk.', 'kmMMMrMMMMMMMMMk', '.kmMMMMMMMMMMMk.', '..kkkmMMMMMkkk..', '....kmMMMMk.....', '....kmMMMMk.....', '...kmmMMMMMk....', '..kmMMMMMMMMk...', '..kkkkkkkkkkk...'],
    cores: { k: '#1b1325', M: '#6a6478', m: '#a8a2b8', r: '#ff7a3d' },
  },
  caca_niquel: {
    grade: [
      '..kkkkkkkkkkkkkk',
      'o.krrrrrrrrrrrrk',
      'k.krYYYYYYYYYYrk',
      'k.krrrrrrrrrrrrk',
      'kkkrkkkkkkkkkkrk',
      '..krkwwkwwkwwkrk',
      '..krkwwkwwkwwkrk',
      '..krkkkkkkkkkkrk',
      '..krrrrrrrrrrrrk',
      '..krrrrrggrrrrrk',
      '..krrrrrrrrrrrrk',
      '..kkkkkkkkkkkkkk',
      '...kRRRRRRRRRRk.',
      '...kkkkkkkkkkkk.',
    ],
    cores: { k: '#1b1325', r: '#c8303a', R: '#7a1a22', Y: '#ffd23f', w: '#f4ead6', g: '#07050b', o: '#ff5a4a' },
  },
  maquina_doacao: {
    grade: ['..kkkkkkkk..', '.kbbbbbbbbk.', '.kbkkkkkkbk.', '.kbbbbbbbbk.', '.kbbhhbhhbk.', '.kbhhhhhhbk.', '.kbbhhhhbbk.', '.kbbbhhbbbk.', '.kbbbbbbbbk.', '.kBBBBBBBBk.', '..kkkkkkkk..', '....kBBk....', '....kBBk....', '...kkkkkk...'],
    cores: { k: '#1b1325', b: '#c8a040', B: '#8a6a20', h: '#ff5a7a' },
  },
  // ícone "?" dos itens na Maldição da Cegueira
  item_misterio: {
    grade: ['..kkkk..', '.kYYYYk.', 'kYkkkYYk', '.k..kYYk', '...kYYk.', '..kYYk..', '..kYYk..', '..kkkk..', '..kYYk..', '..kkkk..'],
    cores: { k: '#1b1325', Y: '#ffd23f' },
  },
};

/** Letrinhas em pixel (3x5) para as balas que são palavras: "AU!" e "MIAU". */
const LETRAS: Record<string, string[]> = {
  A: ['.X.', 'X.X', 'XXX', 'X.X', 'X.X'],
  U: ['X.X', 'X.X', 'X.X', 'X.X', 'XXX'],
  M: ['X.X', 'XXX', 'XXX', 'X.X', 'X.X'],
  I: ['XXX', '.X.', '.X.', '.X.', 'XXX'],
  '!': ['X', 'X', 'X', '.', 'X'],
};
function balaPalavra(scene: Phaser.Scene, chave: string, palavra: string) {
  const largura = [...palavra].reduce((s, ch) => s + LETRAS[ch][0].length + 1, -1);
  folhaPintada(scene, chave, largura + 2, 7, 1, (_c, _i, px) => {
    // contorno escuro primeiro, letras brancas por cima (a cor vem do tint da arma)
    for (const passo of ['contorno', 'letra'] as const) {
      let x0 = 1;
      for (const ch of palavra) {
        LETRAS[ch].forEach((linha, y) => {
          for (let x = 0; x < linha.length; x++) {
            if (linha[x] !== 'X') continue;
            if (passo === 'letra') px(x0 + x, y + 1, '#ffffff');
            else for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px(x0 + x + dx, y + 1 + dy, '#1b1325');
          }
        });
        x0 += LETRAS[ch][0].length + 1;
      }
    }
  });
}

/** Armas extras: os pets têm desenho próprio; as outras pintam o desenho de uma arma da base com a "tinta". */
function gerarArmasExtras(scene: Phaser.Scene) {
  for (const [chave, pet] of Object.entries(PETS)) {
    if (scene.textures.exists(chave)) continue;
    const h = pet.grade.length;
    const w = pet.grade[0].length;
    const tex = scene.textures.createCanvas(chave, w, h);
    if (!tex) continue;
    const ctx = tex.getContext();
    pet.grade.forEach((linha, y) => {
      for (let x = 0; x < w; x++) {
        const cor = pet.cores[linha[x]];
        if (!cor) continue;
        ctx.fillStyle = cor;
        ctx.fillRect(x, y, 1, 1);
      }
    });
    tex.add(0, 0, 0, 0, w, h);
    tex.refresh();
  }
  balaPalavra(scene, 'latido', 'AU!');
  balaPalavra(scene, 'miau', 'MIAU');

  const misturar = (hex: string, f: number) => {
    const c = Phaser.Display.Color.HexStringToColor(hex);
    const m = (v: number) => Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f);
    return Phaser.Display.Color.RGBToString(m(c.red), m(c.green), m(c.blue));
  };
  for (const def of D.armas) {
    if (!def.forma || scene.textures.exists(def.sprite)) continue;
    const grade = ARMAS[def.forma];
    if (!grade) continue;
    // a tinta troca o metal (A claro, a escuro) e, um pouco, a coronha
    const pal = def.tinta
      ? { ...PAL, A: misturar(def.tinta, 1.25), a: misturar(def.tinta, 0.7), m: misturar(def.tinta, 1.1), M: misturar(def.tinta, 0.55) }
      : PAL;
    const w = Math.max(...grade.map((l) => l.length));
    const tex = scene.textures.createCanvas(def.sprite, w, grade.length);
    if (!tex) continue;
    const ctx = tex.getContext();
    grade.forEach((linha, y) => {
      for (let x = 0; x < linha.length; x++) {
        const cor = pal[linha[x]];
        if (!cor) continue;
        ctx.fillStyle = cor;
        ctx.fillRect(x, y, 1, 1);
      }
    });
    tex.add(0, 0, 0, 0, w, grade.length);
    tex.refresh();
  }
}

/** Quantos quadros uma textura tem (sem contar o __BASE). */
export function totalQuadros(scene: Phaser.Scene, chave: string) {
  return scene.textures.exists(chave) ? scene.textures.get(chave).frameTotal - 1 : 0;
}

const FPS_INIMIGO: Record<string, number> = { slime: 6, apagador: 7, necromante: 6, mago: 7 };

/** Cria as animações de heróis, inimigos e objetos (do pack 0x72 ou da arte embutida). */
export function criarAnimacoes(scene: Phaser.Scene) {
  const criar = (key: string, textura: string, frames: number[], fps: number, repeat = -1) => {
    if (scene.anims.exists(key)) scene.anims.remove(key);
    scene.anims.create({ key, frames: frames.map((f) => ({ key: textura, frame: f })), frameRate: fps, repeat });
  };
  const seq = (n: number) => Array.from({ length: n }, (_, i) => i);

  // heróis
  criar('heroi_vela_parado', 'player', [0, 1], 3);
  criar('heroi_vela_andar', 'player', [2, 3, 4, 5], 10);
  for (const p of D.visual.personagens) {
    const q = Atlas.herois.get(p.id);
    if (!q) continue;
    criar(`heroi_${p.id}_parado`, `heroi_${p.id}`, q.parado, 6);
    criar(`heroi_${p.id}_andar`, `heroi_${p.id}`, q.andar, 11);
  }

  // inimigos: animação "mover" com todos os quadros da textura
  for (const def of Object.values(D.inimigos)) {
    const n = totalQuadros(scene, def.sprite);
    if (n) criar(`${def.sprite}_mover`, def.sprite, seq(n), FPS_INIMIGO[def.sprite] ?? 9);
  }

  criar('castical_aceso', 'castical', [1, 2], 6);
  criar('bala_inimiga', 'bala_inimiga', [0, 1], 12);
  const nBau = totalQuadros(scene, 'bau');
  criar('bau_abrir', 'bau', seq(nBau), 10, 0);
  const nFonte = totalQuadros(scene, 'fonte');
  if (nFonte) criar('fonte', 'fonte', seq(nFonte), 6);
}

/** Personagem que existe de verdade (cai para a vela se o pack não carregou). */
export function personagemValido(id: string) {
  return id === 'vela' || Atlas.herois.has(id) ? id : 'vela';
}
