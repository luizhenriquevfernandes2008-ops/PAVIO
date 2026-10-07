// Trilha sonora do PAVIO, escrita como "partitura" em texto e tocada pelo sintetizador em som.ts.
//
// Cada música tem SEÇÕES (intro, verso, refrão...) tocadas na ordem de `ordem`.
// Por compasso (16 tempos):
//   acordes  'Em', 'C', 'F#dim', 'E5' (5 = power chord)
//   melodia  "A4 . C5 - ..."  nota · "." pausa · "-" segura a nota anterior
//   riff     guitarra distorcida: "x" abafada · "X" acorde aberto · "o" acorde uma oitava acima · "-" segura · "." pausa
//   bateria  16 caracteres por peça; "x" toca

export type Faixa = 'menu' | 'historia' | 'masmorra1' | 'masmorra2' | 'masmorra3' | 'abismo' | 'chefe' | 'calmo' | 'vitoria' | 'derrota';

export interface Secao {
  acordes: string[];
  melodia?: string[];
  timbre?: 'quadrada' | 'sino' | 'guitarra';
  riff?: string[];
  baixo?: 'longo' | 'oitavas' | 'pulsante' | 'riff';
  pad?: boolean;
  arpejo?: 'colcheias' | 'semicolcheias';
  bateria?: { bumbo: string; caixa?: string; chimbal?: string; prato?: string };
  virada?: boolean; // virada de bateria no último compasso da seção
}

export interface Musica {
  bpm: number;
  secoes: Record<string, Secao>;
  ordem: string[];
  repetirDe?: number; // ao chegar no fim, volta para esta posição da ordem
  loop: boolean;
  depois?: Faixa;
}

// ---------- baterias prontas ----------
const GALOPE = { bumbo: 'x.xxx.xxx.xxx.xx', caixa: '....x.......x...', chimbal: 'x.x.x.x.x.x.x.x.' };
const DUPLO = { bumbo: 'xxxxxxxxxxxxxxxx', caixa: '....x.......x...', chimbal: 'x.x.x.x.x.x.x.x.', prato: 'x...............' };
const PESADO = { bumbo: 'x..x..x...x.x...', caixa: '........x.......', chimbal: 'x...x...x...x...' };
const BLAST = { bumbo: 'xxxxxxxxxxxxxxxx', caixa: 'x.x.x.x.x.x.x.x.' };
const THRASH = { bumbo: 'x.x.x.x.x.x.x.x.', caixa: '..x...x...x...x.', chimbal: 'x.x.x.x.x.x.x.x.' };
const SUAVE = { bumbo: 'x.......x.......', caixa: '....x.......x...', chimbal: '..x...x...x...x.' };

export const MUSICAS: Record<Faixa, Musica> = {
  // ================= MENU: calmo, sombrio, três partes =================
  menu: {
    bpm: 84,
    secoes: {
      a: {
        acordes: ['Am', 'F', 'C', 'E', 'Am', 'F', 'C', 'E'],
        melodia: [
          'E5 - - - . . . . A5 - - - G5 - E5 -',
          'F5 - - - . . . . E5 - C5 - - - - -',
          'G5 - - - E5 - . . C6 - - - B5 - G5 -',
          'G#5 - - - - - - - B5 - - - - - - -',
          'A5 - - - . . E5 - . . C5 - D5 - E5 -',
          'F5 - - - A5 - - - G5 - F5 - E5 - - -',
          'E5 - - - G5 - C6 - B5 - - - G5 - - -',
          'E5 - - - - - - - . . . . . . . .',
        ],
        timbre: 'sino', pad: true, arpejo: 'colcheias', baixo: 'longo',
        bateria: { bumbo: 'x.......x.......' },
      },
      b: {
        acordes: ['Dm', 'Am', 'F', 'E', 'Dm', 'Am', 'E', 'Am'],
        melodia: [
          'D5 - - - F5 - A5 - - - G5 - F5 - - -',
          'E5 - - - C5 - - - A4 - - - - - - -',
          'F5 - - - A5 - C6 - - - A5 - G5 - - -',
          'G#5 - - - B5 - - - E5 - - - - - - -',
          'A5 - - - F5 - D5 - - - F5 - A5 - - -',
          'E5 - - - C5 - E5 - A5 - - - - - - -',
          'B4 - - - G#4 - - - E4 - - - B4 - - -',
          'A4 - - - - - - - . . . . . . . .',
        ],
        timbre: 'sino', pad: true, arpejo: 'colcheias', baixo: 'longo',
        bateria: { bumbo: 'x.......x.......', caixa: '........x.......', chimbal: '..x...x...x...x.' },
      },
      c: { acordes: ['Am', 'F', 'C', 'E'], pad: true, arpejo: 'semicolcheias', baixo: 'longo' },
    },
    ordem: ['a', 'b', 'c'],
    loop: true,
  },

  // ================= HISTÓRIA: caixinha de música =================
  historia: {
    bpm: 76,
    secoes: {
      a: {
        acordes: ['Am', 'F', 'C', 'E'],
        melodia: [
          'A5 - - - E5 - - - C6 - - - B5 - A5 -',
          'F5 - - - A5 - - - C6 - - - A5 - - -',
          'G5 - - - E5 - - - C5 - - - E5 - G5 -',
          'E5 - - - - - - - . . . . . . . .',
        ],
        timbre: 'sino', pad: true, baixo: 'longo',
      },
      b: { acordes: ['Dm', 'Am', 'E', 'E'], pad: true, arpejo: 'colcheias', baixo: 'longo' },
    },
    ordem: ['a', 'b'],
    loop: true,
  },

  // ================= ANDAR 1: Catacumbas (metal em Mi menor) =================
  masmorra1: {
    bpm: 152,
    secoes: {
      intro: {
        acordes: ['E5', 'E5'], riff: ['X---------------', 'x.x.x.x.xxxxxxxx'], baixo: 'riff',
        bateria: { bumbo: 'x...............', prato: 'x...............' }, virada: true,
      },
      verso: {
        acordes: ['E5', 'E5', 'C5', 'D5'], riff: ['xxx.xxx.xxx.X---', 'xxx.xxx.X---o---'], baixo: 'riff', bateria: GALOPE,
      },
      refrao: {
        acordes: ['C5', 'D5', 'Em', 'Em'],
        melodia: [
          'E5 - - G5 - - A5 - B5 - - A5 G5 - E5 -',
          'F#5 - - A5 - - B5 - D6 - - B5 A5 - F#5 -',
          'G5 - - - F#5 - - - E5 - - - D5 - E5 -',
          'B4 - - - - - - - . . . . . . . .',
        ],
        timbre: 'guitarra', riff: ['X---X---X---x.x.'], baixo: 'oitavas', bateria: DUPLO, virada: true,
      },
      ponte: { acordes: ['E5', 'F5', 'E5', 'G5'], riff: ['x..x..x...x.x...'], baixo: 'riff', bateria: PESADO },
      solo: {
        acordes: ['Am', 'C', 'D', 'B'],
        melodia: [
          'A5 C6 E6 C6 A5 C6 E6 C6 A5 C6 E6 C6 B5 A5 G5 E5',
          'G5 C6 E6 C6 G5 C6 E6 C6 G5 C6 E6 G6 E6 C6 B5 G5',
          'F#5 A5 D6 A5 F#5 A5 D6 A5 F#5 A5 D6 F#6 E6 D6 C6 A5',
          'B5 D#6 F#6 D#6 B5 D#6 F#6 B6 - - - - . . . .',
        ],
        timbre: 'guitarra', riff: ['x.x.x.x.x.x.x.x.'], baixo: 'oitavas',
        bateria: { bumbo: 'x.x.x.x.x.x.x.x.', caixa: '....x.......x...', chimbal: 'xxxxxxxxxxxxxxxx' }, virada: true,
      },
    },
    ordem: ['intro', 'verso', 'verso', 'refrao', 'ponte', 'solo', 'refrao'],
    repetirDe: 1,
    loop: true,
  },

  // ================= ANDAR 2: Esgoto (groove em Ré menor) =================
  masmorra2: {
    bpm: 138,
    secoes: {
      verso: {
        acordes: ['D5', 'D5', 'F5', 'C5'], riff: ['x.x..x.x.x..X---', 'x.x..x.x.xx.o---'], baixo: 'riff',
        bateria: { bumbo: 'x..x..x.x..x....', caixa: '....x.......x...', chimbal: 'x.x.x.x.x.x.x.x.' },
      },
      refrao: {
        acordes: ['A#', 'C', 'Dm', 'A'],
        melodia: [
          'D5 - F5 - A5 - G5 F5 E5 - F5 - D5 - - -',
          'C5 - E5 - G5 - F5 E5 D5 - E5 - C5 - - -',
          'A#4 - D5 - F5 - A5 - G5 - F5 - E5 - D5 -',
          'A4 - - - C#5 - - - E5 - - - A5 - - -',
        ],
        timbre: 'quadrada', riff: ['X---.xx.X---.xx.'], baixo: 'oitavas',
        bateria: { bumbo: 'x.x...x.x.x...x.', caixa: '....x.......x...', chimbal: 'x.x.x.x.x.x.x.x.', prato: 'x...............' }, virada: true,
      },
      ponte: { acordes: ['D5', 'D#5', 'D5', 'C#5'], riff: ['x...x...x.x.x...'], baixo: 'riff', bateria: PESADO },
    },
    ordem: ['verso', 'verso', 'refrao', 'verso', 'ponte', 'refrao'],
    loop: true,
  },

  // ================= ANDAR 3: A Forja (thrash em Mi frígio) =================
  masmorra3: {
    bpm: 176,
    secoes: {
      verso: { acordes: ['E5', 'E5', 'F5', 'E5'], riff: ['xxxxxxxxX-xxxxX-'], baixo: 'riff', bateria: THRASH },
      refrao: {
        acordes: ['C5', 'D5', 'A#5', 'B5'],
        melodia: [
          'E5 - F5 - G5 - A5 - A#5 - A5 - G5 - F5 -',
          'E5 - F5 - G5 - E5 - D5 - - - . . . .',
          'F5 - - - E5 - - - D5 - - - C5 - - -',
          'B4 - - - - - - - E5 - - - - - - -',
        ],
        timbre: 'guitarra', riff: ['X---X---X---X---'], baixo: 'pulsante',
        bateria: { ...DUPLO, prato: 'x.......x.......' }, virada: true,
      },
      breakdown: { acordes: ['E5', 'E5', 'E5', 'F5'], riff: ['x..x..x..x..x...'], baixo: 'riff', bateria: { bumbo: 'x..x..x..x..x...', caixa: '........x.......', chimbal: 'x...x...x...x...' } },
    },
    ordem: ['verso', 'verso', 'refrao', 'breakdown', 'verso', 'refrao'],
    loop: true,
  },

  // ================= O ABISMO: doom arrastado em Si menor, com trítono =================
  abismo: {
    bpm: 116,
    secoes: {
      intro: {
        acordes: ['B5', 'B5', 'F5', 'B5'],
        riff: ['X---------------', 'X-------x.x.X---'], baixo: 'longo', pad: true,
        bateria: { bumbo: 'x...............', prato: 'x...............' },
      },
      verso: {
        acordes: ['B5', 'B5', 'C5', 'A#5'],
        riff: ['X---x.x.X---x...', 'X---x.x.X-x-x...'], baixo: 'riff',
        bateria: { bumbo: 'x.....x.x.......', caixa: '........x.......', chimbal: 'x...x...x...x...' },
      },
      grito: {
        acordes: ['Bm', 'G', 'F#', 'F'],
        melodia: [
          'F#5 - - - - - B5 - - - A5 - G5 - F#5 -',
          'G5 - - - - - - - D5 - - - E5 - - -',
          'F#5 - - - E5 - D5 - C#5 - - - A#4 - - -',
          'B4 - - - - - - - F5 - - - - - - -',
        ],
        timbre: 'guitarra', riff: ['X-------X-------'], baixo: 'oitavas', pad: true,
        bateria: { bumbo: 'x.x...x.x.x...x.', caixa: '....x.......x...', chimbal: 'x.x.x.x.x.x.x.x.', prato: 'x...............' }, virada: true,
      },
      galope: { acordes: ['B5', 'D5', 'C5', 'F5'], riff: ['x.xxx.xxx.xxx.xx'], baixo: 'riff', bateria: GALOPE, virada: true },
    },
    ordem: ['intro', 'verso', 'verso', 'grito', 'galope', 'verso', 'grito'],
    repetirDe: 1,
    loop: true,
  },

  // ================= CHEFE: blast beat =================
  chefe: {
    bpm: 190,
    secoes: {
      intro: {
        acordes: ['E5', 'F5'], riff: ['X---------------'], baixo: 'riff',
        bateria: { bumbo: 'x...x...x...x...', prato: 'x...............' }, virada: true,
      },
      a: { acordes: ['E5', 'G5', 'A#5', 'A5'], riff: ['xxxxxxxxxxxxxxxx'], baixo: 'riff', bateria: BLAST },
      b: {
        acordes: ['Em', 'C', 'D', 'B'],
        melodia: [
          'E6 - D6 - B5 - G5 - A5 - B5 - G5 - E5 -',
          'C6 - B5 - G5 - E5 - F#5 - G5 - A5 - - -',
          'D6 - C6 - A5 - F#5 - G5 - A5 - B5 - - -',
          'B5 - - - A#5 - - - A5 - - - G#5 - - -',
        ],
        timbre: 'guitarra', riff: ['X---X---X---x.x.'], baixo: 'oitavas', bateria: DUPLO, virada: true,
      },
      c: {
        acordes: ['E5', 'E5', 'G5', 'F#5'], riff: ['x.xx.xx.x.xx.xX-'], baixo: 'riff',
        bateria: { bumbo: 'x.xx.xx.x.xx.x..', caixa: '....x.......x...', chimbal: 'x.x.x.x.x.x.x.x.' },
      },
    },
    ordem: ['intro', 'a', 'b', 'c', 'a', 'b'],
    repetirDe: 1,
    loop: true,
  },

  // ================= LOJA / TESOURO: respiro =================
  calmo: {
    bpm: 100,
    secoes: {
      a: {
        acordes: ['C', 'Am', 'F', 'G'],
        melodia: [
          'E5 - G5 - C6 - B5 - A5 - G5 - E5 - - -',
          'C5 - E5 - A5 - G5 - F5 - E5 - C5 - - -',
          'A4 - C5 - F5 - E5 - D5 - C5 - A4 - - -',
          'B4 - D5 - G5 - - - F5 - - - D5 - - -',
        ],
        timbre: 'quadrada', arpejo: 'colcheias', baixo: 'longo', bateria: SUAVE,
      },
      b: {
        acordes: ['F', 'G', 'Em', 'Am'],
        melodia: [
          'A5 - - - G5 - F5 - E5 - - - C5 - - -',
          'B5 - - - A5 - G5 - D5 - - - . . . .',
          'G5 - E5 - B4 - E5 - G5 - - - B5 - - -',
          'A5 - - - - - - - E5 - C5 - A4 - - -',
        ],
        timbre: 'quadrada', arpejo: 'colcheias', baixo: 'longo', bateria: SUAVE,
      },
    },
    ordem: ['a', 'b'],
    loop: true,
  },

  // ================= vinhetas =================
  vitoria: {
    bpm: 140,
    secoes: {
      a: {
        acordes: ['C', 'C', 'F', 'C'],
        melodia: [
          'C5 E5 G5 C6 - - E6 - D6 - C6 - G5 - C6 -',
          'C6 - - - - - - - . . . . . . . .',
          'A5 - C6 - F6 - - - E6 - D6 - C6 - - -',
          'C6 - - - - - - - - - - - . . . .',
        ],
        timbre: 'quadrada', pad: true, arpejo: 'semicolcheias', baixo: 'longo',
        bateria: { bumbo: 'x.......x.......', caixa: '....x.......x...', chimbal: 'x.x.x.x.x.x.x.x.', prato: 'x...............' },
      },
    },
    ordem: ['a'],
    loop: false,
    depois: 'menu',
  },
  derrota: {
    bpm: 72,
    secoes: {
      a: {
        acordes: ['Am', 'F', 'E', 'Am'],
        melodia: [
          'E5 - - - D5 - - - C5 - - - B4 - - -',
          'A4 - - - - - - - C5 - - - B4 - - -',
          'G#4 - - - - - - - B4 - - - - - - -',
          'A4 - - - - - - - - - - - . . . .',
        ],
        timbre: 'sino', pad: true, baixo: 'longo',
      },
    },
    ordem: ['a'],
    loop: false,
    depois: 'menu',
  },
};

// =====================================================================

const SEMITOM: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C#5" -> número MIDI (C4 = 60). */
export function notaMidi(nome: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(nome);
  if (!m) return 60;
  const alt = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return (Number(m[3]) + 1) * 12 + SEMITOM[m[1]] + alt;
}

export interface Acorde {
  raiz: number; // 0..11
  intervalos: number[]; // em semitons a partir da raiz
}

/** "F#m" -> raiz Fá sustenido, menor. "E5" = power chord (raiz + quinta). */
export function lerAcorde(nome: string): Acorde {
  const m = /^([A-G])(#|b)?(m|dim|5)?$/.exec(nome);
  if (!m) return { raiz: 9, intervalos: [0, 3, 7] };
  const raiz = (SEMITOM[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  const intervalos = m[3] === 'm' ? [0, 3, 7] : m[3] === 'dim' ? [0, 3, 6] : m[3] === '5' ? [0, 7, 12] : [0, 4, 7];
  return { raiz, intervalos };
}

/** A nota MIDI da raiz dentro de uma faixa (ex.: guitarra entre E2 e D#3). */
export function raizNaFaixa(raiz: number, minimo: number) {
  let n = minimo - (minimo % 12) + raiz;
  if (n < minimo) n += 12;
  return n;
}

export interface NotaMelodia {
  midi: number;
  tempos: number; // duração em 16 avos
}

/** Converte um compasso de texto em 16 posições (nota com duração ou null). */
export function lerCompasso(texto: string): (NotaMelodia | null)[] {
  const tokens = texto.trim().split(/\s+/);
  while (tokens.length < 16) tokens.push('.');
  const saida: (NotaMelodia | null)[] = new Array(16).fill(null);
  for (let i = 0; i < 16; i++) {
    const t = tokens[i];
    if (t === '.' || t === '-') continue;
    let dur = 1;
    while (i + dur < 16 && tokens[i + dur] === '-') dur++;
    saida[i] = { midi: notaMidi(t), tempos: dur };
  }
  return saida;
}
