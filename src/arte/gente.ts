// Luiz, Ana e Henrique em pixel art (estilo chibi: cabeça grande, 20x28).
// Cada um é uma grade de letras; cada letra é uma cor da paleta do personagem e '.' é transparente.
// Linhas 0-21: cabeça e tronco. Linhas 22-27: pernas (os quadros de andar levantam uma perna de cada vez).

export interface Gente {
  paleta: Record<string, string>;
  grade: string[];
}

const K = '#1b1325'; // contorno

export const GENTE: Record<string, Gente> = {
  // Luiz: cabelo escuro ondulado com volume, pele morena, sorrisão, polo branca, calça bege, tatuagens nos braços
  luiz: {
    paleta: {
      k: K, h: '#241a28', H: '#4e3d55', s: '#c98b5e', S: '#a66c45', o: '#ffffff', e: '#2a1a14',
      m: '#7a2e2e', t: '#fff6ea', w: '#f6f2e8', W: '#cfc6b4', d: '#3a3050', p: '#d2b98f', P: '#a88f68', b: '#4a3426',
    },
    grade: [
      '.....kkkkkkkkk......',
      '....khhHHHhhhhkk....',
      '...khhHHHhhhhhhhk...',
      '..khhhhhhhhhhhhhhk..',
      '..khhhhhhhhhhhhhhhk.',
      '.khhhhhhhhhhhhhhhhk.',
      '.khhhssshhhhsssshhk.',
      '.khhsssssssssssssk..',
      '..kssoesssssssoessk.',
      '..ksseessssssseessk.',
      '..kSsssssssssssssSk.',
      '..kSsssmttttttmsssk.',
      '...kSsssmmmmmmsssk..',
      '....kkSssssssSkk....',
      '......kkssssskk.....',
      '....kkwwksskwwkk....',
      '...kWwwwwkkwwwwwk...',
      '..kWWwwwwwwwwwwwWk..',
      '.ksdkWwwwwwwwwwwksk.',
      '.kddkWwwwwwwwwwkddk.',
      '.ksskWWwwwwwwwWksdk.',
      '.kSSkkkkkkkkkkkkSSk.',
      '....kppppppppppk....',
      '....kppppkkpppPk....',
      '....kppppkkpppPk....',
      '....kPPPPkkPPPPk....',
      '...kbbbbbkkbbbbbk...',
      '...kkkkkkkkkkkkkk...',
    ],
  },

  // Ana: capuz de pelúcia, franja reta preta, pele clara, bochechas rosadas, moletom preto com a cruz branca
  ana: {
    paleta: {
      k: K, f: '#c99a62', F: '#ecd2a0', g: '#a0703c', h: '#1e1622', H: '#3a2e44', s: '#f2cdb0', S: '#d8a888',
      o: '#ffffff', e: '#4a2a1a', r: '#f08a9a', m: '#c0606a', j: '#2c2434', J: '#1e1826', x: '#f4f0e6', p: '#2a2232', b: '#120d17',
    },
    grade: [
      '.....kkkkkkkkkk.....',
      '...kkfFffFffFffkk...',
      '..kfFfgfFfgfFfgffk..',
      '.kfFfkkkkkkkkkkfFfk.',
      '.kffkhhhHHhhhhhkffk.',
      'kfFkhhhHHhhhhhhhkFfk',
      'kffkhhhhhhhhhhhhkffk',
      'kfFkhhhhhhhhhhhhkFfk',
      'kfFkhsssssssssshkFfk',
      'kffkhsoessssoeshkffk',
      'kfFkhseesssseeshkFfk',
      'kffkhrssssssssrhkffk',
      'kfFkhssssmmsssshkFfk',
      '.kffkhsssssssshkffk.',
      '..kffFkksssssskFffk.',
      '..kgfFfkkkkkkfFfgk..',
      '..kjjjjjjjjjjjjjjk..',
      '.kJjjjjjjjjjjxjjjJk.',
      '.kJjkjjjjjjjxxxjkJk.',
      '.ksjkjjjjjjjjxjjksk.',
      '.ksskJjjjjjjjxjjkssk',
      '.kSSkkkkkkkkkkkkkSSk',
      '....kppppppppppk....',
      '....kppppkkppppk....',
      '....kppppkkppppk....',
      '....kppppkkppppk....',
      '...kbbbbbkkbbbbbk...',
      '...kkkkkkkkkkkkkk...',
    ],
  },

  // Henrique: cabelo escuro bagunçado, rosto largo, olhar tranquilo, bigode e cavanhaque, camiseta, mais forte
  henrique: {
    paleta: {
      k: K, h: '#1e1620', H: '#3e3046', s: '#eab89a', S: '#cc9478', o: '#ffffff', e: '#3a2418', B: '#3a2618',
      c: '#3e5068', C: '#2c3a4e', p: '#3a3f4a', P: '#2a2e36', b: '#1e1620',
    },
    grade: [
      '...k..kk..k..k......',
      '..khkkhhkkhkkhk.....',
      '..khhhhhhhhhhhhkk...',
      '.khhhHhhhhHhhhhhhk..',
      '.khhhhhhhhhhhhhhhhk.',
      'khhhhhhhhhhhhhhhhhhk',
      'khhhsssshhhhsssshhhk',
      'khhsssssssssssssshhk',
      'khssskkksssskkkssshk',
      '.ksssoesssssseosssk.',
      '.kSssssssssssssssSk.',
      '.kSsssBBBBBBBBsssSk.',
      '.kSsssBkkkkkkBsssSk.',
      '..kSssssBBBBssssSk..',
      '...kkSssBBBBssSkk...',
      '....kkkkkBBkkkkk....',
      '..kkccccckkccccckk..',
      '.kCccccccccccccccCk.',
      'kCCcccccccccccccccCk',
      'ksskCccccccccccCkssk',
      'ksskCccccccccccCkssk',
      'kSSkkkkkkkkkkkkkkSSk',
      '...kppppppppppppk...',
      '...kpppppkkpppppk...',
      '...kpppppkkpppppk...',
      '...kPPPPPkkPPPPPk...',
      '..kbbbbbbkkbbbbbbk..',
      '..kkkkkkkkkkkkkkkk..',
    ],
  },
};
