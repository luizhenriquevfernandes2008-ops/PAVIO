// Gera os itens "de combinação" e as sinergias por etiqueta.
// Uso: npm run gerar  (reescreve public/dados/itens_gerados.json, sinergias_geradas.json e tags.json)
//
// Cada item gerado = um OBJETO (anel, bota, coroa...) + um ELEMENTO (fogo, gelo, raio...).
// O objeto dá um bônus de atributo; o elemento muda as balas. Os dois viram ETIQUETAS,
// e juntar etiquetas iguais (ou pares que combinam) libera sinergias.

import fs from 'node:fs';

// ---------- elementos: [id, nome curto, sufixo no nome do item, cor, efeito] ----------
const ELEMENTOS = [
  ['fogo', 'Fogo', 'de Brasa', '#ff7a2e', { mods: { queima: true } }],
  ['gelo', 'Gelo', 'de Geada', '#8fe3ff', { mods: { congela: 0.06 } }],
  ['raio', 'Raio', 'do Trovão', '#ffe066', { mods: { eletrico: 1 } }],
  ['veneno', 'Veneno', 'da Peçonha', '#9cff6b', { mods: { veneno: true } }],
  ['polvora', 'Pólvora', 'de Pólvora', '#e2452b', { mods: { explosao: 6 } }],
  ['vidro', 'Vidro', 'de Vidro', '#cfefff', { mods: { fragmenta: 1 } }],
  ['mola', 'Mola', 'da Mola', '#b0b0c8', { mods: { ricochete: 1 } }],
  ['olhar', 'Olhar', 'do Olhar', '#ff5a8a', { mods: { teleguiado: 0.5 } }],
  ['lamina', 'Lâmina', 'da Lâmina', '#cfd8dc', { mods: { perfura: 1 } }],
  ['sombra', 'Sombra', 'da Sombra', '#b06bff', { stats: { raioEsquiva: 2, critico: 0.02 } }],
  ['luz', 'Luz', 'da Aurora', '#fff4b0', { stats: { luz: 1.1, curaSala: 1 } }],
  ['sangue', 'Sangue', 'de Sangue', '#c0303a', { stats: { roubaVida: 0.3 } }],
  ['ouro', 'Ouro', 'de Ouro', '#ffd23f', { stats: { ceraBonus: 1.08 } }],
  ['tempo', 'Tempo', 'do Tempo', '#9fd0ff', { stats: { lentoExtra: 1.1, cooldownDash: 0.95 } }],
  ['eco', 'Eco', 'do Eco', '#c8a0ff', { mods: { duploTiro: 0.06 } }],
  ['vento', 'Vento', 'do Vento', '#c8f0e0', { stats: { velocidade: 1.04 }, mods: { velBala: 1.05 } }],
  ['terra', 'Terra', 'da Terra', '#a0784a', { stats: { empurrao: 1.15 }, mods: { tamanho: 1.06 } }],
  ['sorte', 'Sorte', 'da Sorte', '#7fdc8a', { stats: { sorte: 0.3, critico: 0.01 } }],
];

// ---------- objetos: [id, nome, ícone, efeito] ----------
const OBJETOS = [
  ['anel', 'Anel', 'anel', { stats: { dano: 1.05 } }],
  ['colar', 'Colar', 'colar', { stats: { chamaMax: 6 } }],
  ['amuleto', 'Amuleto', 'amuleto', { stats: { critico: 0.02 } }],
  ['pavio', 'Pavio', 'pavio', { stats: { decaimento: 0.96 } }],
  ['lente', 'Lente', 'lente', { stats: { alcance: 1.06 } }],
  ['frasco', 'Frasco', 'frasco', { stats: { curaCera: 1.06 } }],
  ['pena', 'Pena', 'pena', { stats: { velocidade: 1.03 } }],
  ['dente', 'Dente', 'dente', { stats: { dano: 1.03, empurrao: 1.05 } }],
  ['olho', 'Olho', 'olho', { mods: { teleguiado: 0.2 } }],
  ['coracao', 'Coração', 'coracao', { stats: { chamaMax: 8 } }],
  ['moeda', 'Moeda', 'moeda', { stats: { ceraBonus: 1.05 } }],
  ['chave', 'Chave', 'chave', { stats: { sorte: 0.2 } }],
  ['pergaminho', 'Pergaminho', 'pergaminho', { stats: { recarga: 0.94 } }],
  ['runa', 'Runa', 'runa', { stats: { dano: 1.04 } }],
  ['sino', 'Sino', 'sino', { stats: { parryExtra: 1 } }],
  ['espelho', 'Espelho', 'espelho', { stats: { janelaParry: 0.01 } }],
  ['vela', 'Vela', 'vela', { stats: { curaSala: 2 } }],
  ['cristal', 'Cristal', 'cristal', { mods: { tamanho: 1.05 } }],
  ['osso', 'Osso', 'osso', { stats: { empurrao: 1.1 } }],
  ['mascara', 'Máscara', 'mascara', { stats: { raioEsquiva: 1 } }],
  ['luva', 'Luva', 'mao', { stats: { cadencia: 0.96 } }],
  ['bota', 'Bota', 'sapato', { stats: { velocidade: 1.04 } }],
  ['capa', 'Capa', 'capa', { stats: { danoRecebido: 0.97 } }],
  ['coroa', 'Coroa', 'coroa', { stats: { dano: 1.03, critico: 0.01 } }],
  ['relogio', 'Relógio', 'relogio', { stats: { cooldownDash: 0.95 } }],
  ['dado', 'Dado', 'dado', { stats: { critico: 0.015, sorte: 0.1 } }],
  ['carta', 'Carta', 'carta', { mods: { duploTiro: 0.03 } }],
  ['bussola', 'Bússola', 'bussola', { stats: { ima: 0.3 } }],
  ['lanterna', 'Lanterna', 'lamparina', { stats: { luz: 1.06 } }],
  ['pedra', 'Pedra', 'pedra', { stats: { pente: 1.06 } }],
];

// atributos que multiplicam (o resto soma) — igual a src/dados.ts
const MULT = new Set(['dano', 'velocidade', 'cooldownDash', 'alcance', 'luz', 'decaimento', 'curaCera', 'pente', 'recarga', 'cadencia',
  'ceraBonus', 'balasInimigas', 'empurrao', 'lentoExtra', 'venenoForca', 'danoRecebido', 'vidaInimigos', 'tamanho', 'velBala']);
const INTEIROS = new Set(['ricochete', 'perfura', 'eletrico', 'fragmenta', 'parryExtra', 'multiplos', 'dashes']);
const r2 = (v) => Math.round(v * 100) / 100;

/** Junta dois efeitos e aplica a força do nível (1 comum, 1.5 incomum, 2 raro). */
function combinar(a, b, k) {
  const out = { stats: {}, mods: {} };
  for (const parte of ['stats', 'mods']) {
    for (const ef of [a, b]) {
      for (const [chave, v] of Object.entries(ef[parte] ?? {})) {
        let val;
        if (typeof v === 'boolean') val = v;
        else if (MULT.has(chave)) val = r2(1 + (v - 1) * k);
        else if (INTEIROS.has(chave)) val = Math.max(1, Math.round(v * k));
        else val = ['chamaMax', 'curaSala'].includes(chave) ? Math.max(1, Math.round(v * k)) : r2(v * k);
        const atual = out[parte][chave];
        if (atual === undefined) out[parte][chave] = val;
        else if (typeof val === 'boolean') out[parte][chave] = true;
        else if (MULT.has(chave)) out[parte][chave] = r2(atual * val);
        else out[parte][chave] = r2(atual + val);
      }
    }
  }
  return out;
}

const pct = (v) => Math.round(Math.abs(v - 1) * 100);
const TEXTOS = {
  dano: (v) => `+${pct(v)}% dano`,
  chamaMax: (v) => `+${v} chama máx`,
  critico: (v) => `+${r2(v * 100)}% crítico`,
  decaimento: (v) => `chama dura +${pct(v)}%`,
  alcance: (v) => `+${pct(v)}% alcance`,
  curaCera: (v) => `cera cura +${pct(v)}%`,
  velocidade: (v) => `+${pct(v)}% velocidade`,
  empurrao: (v) => `+${pct(v)}% empurrão`,
  ceraBonus: (v) => `+${pct(v)}% cera`,
  sorte: (v) => `+${v} sorte`,
  recarga: (v) => `recarga ${pct(v)}% mais rápida`,
  parryExtra: (v) => `parry rebate +${v}`,
  janelaParry: () => 'parry mais fácil',
  curaSala: (v) => `+${v} chama por sala`,
  raioEsquiva: () => 'esquiva perfeita mais fácil',
  cadencia: (v) => `atira ${pct(v)}% mais rápido`,
  danoRecebido: (v) => `-${pct(v)}% dano recebido`,
  cooldownDash: (v) => `dash volta ${pct(v)}% antes`,
  ima: () => 'puxa cera de longe',
  luz: (v) => `+${pct(v)}% luz`,
  pente: (v) => `+${pct(v)}% pente`,
  roubaVida: (v) => `abate cura ${v}`,
  lentoExtra: () => 'câmera lenta maior',
  queima: () => 'balas incendeiam',
  congela: (v) => `${Math.round(v * 100)}% de congelar`,
  eletrico: (v) => `raio pula ${v}x`,
  veneno: () => 'balas envenenam',
  explosao: () => 'balas explodem',
  fragmenta: (v) => `balas se partem em ${v + 1}`,
  ricochete: (v) => `quicam ${v}x`,
  teleguiado: () => 'balas perseguem',
  perfura: (v) => `atravessam ${v}`,
  duploTiro: (v) => `${Math.round(v * 100)}% de tiro duplo`,
  velBala: () => 'balas mais rápidas',
  tamanho: () => 'balas maiores',
};
function descrever(ef) {
  const partes = [];
  for (const [k, v] of Object.entries(ef.stats)) partes.push(TEXTOS[k]?.(v) ?? k);
  for (const [k, v] of Object.entries(ef.mods)) partes.push(TEXTOS[k]?.(v) ?? k);
  return partes.join(', ');
}

// raridade estável (não muda a cada vez que roda o script)
const nivel = (i) => {
  const h = (i * 7919 + 13) % 100;
  return h < 6 ? 3 : h < 30 ? 2 : 1;
};

// ---------- cada objeto tem um GATILHO; cada elemento, um EFEITO ----------
// [quando, texto, chance, espera (s), a cada N]
const GATILHO = {
  anel: ['acertar', 'Ao acertar (10%)', 0.1, 0.6],
  colar: ['sala', 'Ao entrar numa sala com monstros'],
  amuleto: ['chamaBaixa', 'Com pouca chama, a cada 4s', undefined, undefined, 4],
  pavio: ['tempo', 'A cada 7s em combate', undefined, undefined, 7],
  lente: ['critico', 'No crítico (50%)', 0.5, 0.5],
  frasco: ['matar', 'Ao matar (25%)', 0.25],
  pena: ['dash', 'Ao dar dash', undefined, 1],
  dente: ['acertar', 'Ao acertar (12%)', 0.12, 0.5],
  olho: ['critico', 'No crítico (60%)', 0.6, 0.4],
  coracao: ['dano', 'Ao levar dano'],
  moeda: ['matar', 'Ao matar (20%)', 0.2],
  chave: ['sala', 'Ao entrar numa sala com monstros'],
  pergaminho: ['recarregar', 'Ao recarregar'],
  runa: ['tiro', 'A cada 12 tiros', undefined, undefined, 12],
  sino: ['parry', 'No parry'],
  espelho: ['parry', 'No parry'],
  vela: ['tempo', 'A cada 9s em combate', undefined, undefined, 9],
  cristal: ['tiro', 'A cada 15 tiros', undefined, undefined, 15],
  osso: ['matar', 'Ao matar (30%)', 0.3],
  mascara: ['matar', 'Ao matar (20%)', 0.2],
  luva: ['acertar', 'Ao acertar (8%)', 0.08, 0.4],
  bota: ['dash', 'Ao dar dash', undefined, 0.8],
  capa: ['dano', 'Ao levar dano'],
  coroa: ['matar', 'Ao matar (35%)', 0.35],
  relogio: ['tempo', 'A cada 6s em combate', undefined, undefined, 6],
  dado: ['combo', 'A cada 10 de combo'],
  carta: ['tiro', 'A cada 10 tiros', undefined, undefined, 10],
  bussola: ['sala', 'Ao entrar numa sala com monstros'],
  lanterna: ['tempo', 'A cada 8s em combate', undefined, undefined, 8],
  pedra: ['recarregar', 'Ao recarregar'],
};
// [texto, efeitos (força do nível 1)]
const EFEITO = {
  fogo: ['o chão pega fogo', [['nuvem', { raio: 20, seg: 3, dps: 2, tipo: 'fogo' }]]],
  gelo: ['congela tudo em volta', [['congelar', { raio: 45, seg: 1.6 }]]],
  raio: ['um raio pula entre os monstros', [['raios', { saltos: 3, dano: 2 }]]],
  veneno: ['solta uma nuvem de veneno', [['nuvem', { raio: 24, seg: 4, dps: 1.5, tipo: 'veneno' }]]],
  polvora: ['explosão', [['explosao', { raio: 26, dano: 5 }]]],
  vidro: ['solta um anel de cacos', [['anel', { n: 8, dano: 1.2, tex: 'cristal', cor: '#cfefff' }]]],
  mola: ['balas que quicam pela sala', [['quicantes', { n: 3, dano: 1.5 }]]],
  olhar: ['balas que perseguem', [['teleguiadas', { n: 3, dano: 1.5 }]]],
  lamina: ['lâminas giram em você', [['laminas', { n: 2, seg: 4, dano: 1.2 }]]],
  sombra: ['você fica intocável e crítico', [['invulneravel', { seg: 0.8 }], ['criticos', { n: 2 }]]],
  luz: ['cura a chama', [['curar', { qtd: 3 }]]],
  sangue: ['suga a vida do mais perto', [['sangria', { dano: 3, cura: 2 }]]],
  ouro: ['solta cera', [['cera', { n: 2 }]]],
  tempo: ['câmera lenta', [['lento', { escala: 0.4, ms: 700 }]]],
  eco: ['um tiro de graça', [['eco', {}]]],
  vento: ['rajada de vento e pressa', [['empurrar', { raio: 55, forca: 240 }], ['buff', { stat: 'velocidade', mult: 1.3, seg: 2 }]]],
  terra: ['escudo de pedra', [['escudo', {}]]],
  sorte: ['3 críticos garantidos', [['criticos', { n: 3 }]]],
};
const FORCA_NUM = new Set(['dano', 'n', 'seg', 'qtd', 'dps', 'saltos', 'cura', 'ms']);
function escalarEfeitos(efs, k) {
  return efs.map(([t, par]) => {
    const q = {};
    for (const [chave, v] of Object.entries(par)) {
      if (typeof v !== 'number') q[chave] = v;
      else if (chave === 'raio') q[chave] = Math.round(v * (1 + (k - 1) * 0.3));
      else if (chave === 'mult') q[chave] = r2(1 + (v - 1) * k);
      else if (chave === 'escala') q[chave] = v;
      else if (FORCA_NUM.has(chave)) q[chave] = ['n', 'saltos'].includes(chave) ? Math.max(1, Math.round(v * k)) : r2(v * k);
      else q[chave] = v;
    }
    return [t, q];
  });
}

const itens = [];
let i = 0;
for (const [oid, onome, icone, oef] of OBJETOS) {
  for (const [eid, , sufixo, cor] of ELEMENTOS) {
    const raridade = nivel(i++);
    const k = [1, 1, 1.5, 2][raridade];
    // o objeto dá um bônus pequeno; o efeito do elemento dispara no gatilho do objeto
    const ef = combinar(oef, { stats: {}, mods: {} }, k * 0.6);
    const [quando, qTexto, chance, cd, cada] = GATILHO[oid];
    const [eTexto, efs] = EFEITO[eid];
    const gat = { quando, efeitos: escalarEfeitos(efs, k) };
    if (chance !== undefined) gat.chance = chance;
    if (cd !== undefined) gat.cd = cd;
    if (cada !== undefined) gat.cada = cada;
    const bonus = descrever(ef);
    const it = {
      id: `g_${oid}_${eid}`,
      nome: `${onome} ${sufixo}`,
      desc: `${qTexto}: ${eTexto}.${bonus ? ' ' + bonus[0].toUpperCase() + bonus.slice(1) + '.' : ''}`,
      icone, cor, raridade,
      tags: [oid, eid],
      gerado: true,
      gatilhos: [gat],
    };
    if (Object.keys(ef.stats).length) it.stats = ef.stats;
    if (Object.keys(ef.mods).length) it.mods = ef.mods;
    itens.push(it);
  }
}

// ---------- sinergias por etiqueta ----------
const sinergias = [];
const ELEM_SIN = {
  fogo: [['PIRA', { mods: { queima: true, explosao: 8 } }], ['INFERNO', { mods: { explosao: 14 }, stats: { dano: 1.15 }, visual: { chama: 'vermelha' } }]],
  gelo: [['NEVASCA', { mods: { congela: 0.15 } }], ['ERA DO GELO', { mods: { congela: 0.25, fragmenta: 2 }, visual: { chama: 'ciano' } }]],
  raio: [['TEMPESTADE', { mods: { eletrico: 2 } }], ['DEUS DO TROVÃO', { mods: { eletrico: 3, velBala: 1.2 }, visual: { chama: 'azul' } }]],
  veneno: [['PRAGA', { mods: { veneno: true }, stats: { venenoForca: 1.5 } }], ['PESTE NEGRA', { stats: { venenoForca: 2.2 }, visual: { chama: 'verde' } }]],
  polvora: [['FOGOS', { mods: { explosao: 10 } }], ['ARTILHARIA', { mods: { explosao: 18, fragmenta: 2, fragmentoExplode: true } }]],
  vidro: [['CACOS', { mods: { fragmenta: 2 } }], ['VITRAL', { mods: { fragmenta: 4, perfura: 1 }, visual: { chama: 'branca' } }]],
  mola: [['PINBALL', { mods: { ricochete: 2 } }], ['BATE-REBATE', { mods: { ricochete: 4, velBala: 1.15 } }]],
  olhar: [['MIRA LASER', { mods: { teleguiado: 1.5 } }], ['OLHO QUE TUDO VÊ', { mods: { teleguiado: 3 }, stats: { alcance: 1.3 } }]],
  lamina: [['ESPETO', { mods: { perfura: 2 } }], ['MIL LÂMINAS', { mods: { perfura: 5, multiplos: 1 } }]],
  sombra: [['PENUMBRA', { stats: { raioEsquiva: 4, critico: 0.05 } }], ['SOMBRA VIVA', { mods: { espectral: true }, stats: { critico: 0.1 }, visual: { chama: 'roxa' } }]],
  luz: [['AURORA', { stats: { luz: 1.3, curaSala: 3 } }], ['SOL NASCENTE', { stats: { luz: 1.6, dano: 1.15 }, visual: { chama: 'branca' } }]],
  sangue: [['SEDE', { stats: { roubaVida: 1 } }], ['VAMPIRO', { stats: { roubaVida: 2, dano: 1.1 }, visual: { chama: 'vermelha' } }]],
  ouro: [['TESOURO', { stats: { ceraBonus: 1.3 } }], ['TOQUE DE MIDAS', { stats: { ceraBonus: 1.7, sorte: 1 }, visual: { chama: 'dourada' } }]],
  tempo: [['RELOJOEIRO', { stats: { cooldownDash: 0.8, lentoExtra: 1.3 } }], ['PARAR O TEMPO', { stats: { lentoExtra: 2, dashes: 1 } }]],
  eco: [['REPETECO', { mods: { duploTiro: 0.2 } }], ['ECO INFINITO', { mods: { duploTiro: 0.35, multiplos: 1 } }]],
  vento: [['VENTANIA', { stats: { velocidade: 1.12 } }], ['FURACÃO', { stats: { velocidade: 1.2, dashes: 1 }, mods: { velBala: 1.3 } }]],
  terra: [['ROCHEDO', { stats: { danoRecebido: 0.9, empurrao: 1.3 } }], ['TERREMOTO', { stats: { danoRecebido: 0.8 }, mods: { tamanho: 1.4, explosao: 8 } }]],
  sorte: [['TREVO DE QUATRO FOLHAS', { stats: { sorte: 1, critico: 0.05 } }], ['JACKPOT', { stats: { sorte: 2, critico: 0.12 } }]],
};
for (const [eid, nome] of ELEMENTOS) {
  ELEM_SIN[eid].forEach(([sn, ef], k) => {
    const n = k === 0 ? 3 : 5;
    sinergias.push({ id: `t_${eid}_${n}`, itens: [], tags: { [eid]: n }, nome: sn, desc: descrever({ stats: ef.stats ?? {}, mods: ef.mods ?? {} }), ...ef });
  });
}
const OBJ_SIN = {
  anel: ['O SENHOR DOS ANÉIS', { stats: { dano: 1.2 } }],
  colar: ['COLAR DE PÉROLAS', { stats: { chamaMax: 25 } }],
  amuleto: ['AMULETO DA SORTE', { stats: { critico: 0.08 } }],
  pavio: ['PAVIO INFINITO', { stats: { decaimento: 0.75 } }],
  lente: ['TELESCÓPIO', { stats: { alcance: 1.3 }, mods: { teleguiado: 0.5 } }],
  frasco: ['ALQUIMIA', { stats: { curaCera: 1.4 } }],
  pena: ['LEVE COMO UMA PENA', { stats: { velocidade: 1.12, raioEsquiva: 2 } }],
  dente: ['MANDÍBULA', { stats: { dano: 1.1, empurrao: 1.3, roubaVida: 0.5 } }],
  olho: ['TERCEIRO OLHO', { stats: { critico: 0.04 }, mods: { teleguiado: 1.5 } }],
  coracao: ['CORAÇÃO VALENTE', { stats: { chamaMax: 35 } }],
  moeda: ['COFRINHO', { stats: { ceraBonus: 1.3 } }],
  chave: ['MOLHO DE CHAVES', { stats: { sorte: 1.5 } }],
  pergaminho: ['BIBLIOTECA PROIBIDA', { stats: { recarga: 0.7 } }],
  runa: ['CÍRCULO RÚNICO', { stats: { dano: 1.15 }, mods: { eletrico: 1 } }],
  sino: ['CARRILHÃO', { stats: { parryExtra: 3, janelaParry: 0.03 } }],
  espelho: ['SALA DOS ESPELHOS', { stats: { parryExtra: 2 }, mods: { multiplos: 1 } }],
  vela: ['PROCISSÃO', { stats: { curaSala: 6 }, visual: { chamas: 3 } }],
  cristal: ['GEODO', { mods: { tamanho: 1.3, fragmenta: 1 } }],
  osso: ['OSSUÁRIO', { stats: { empurrao: 1.4 }, mods: { perfura: 1 } }],
  mascara: ['BAILE DE MÁSCARAS', { stats: { raioEsquiva: 4, critico: 0.04 } }],
  luva: ['MÃOS LIGEIRAS', { stats: { cadencia: 0.85 } }],
  bota: ['BOTAS DE SETE LÉGUAS', { stats: { velocidade: 1.15, dashes: 1 } }],
  capa: ['SUPER-HERÓI', { stats: { danoRecebido: 0.85 } }],
  coroa: ['REALEZA', { stats: { dano: 1.1, ceraBonus: 1.2, critico: 0.03 } }],
  relogio: ['RELÓGIO SUÍÇO', { stats: { cooldownDash: 0.75 } }],
  dado: ['CASSINO', { stats: { critico: 0.06, sorte: 1 } }],
  carta: ['BARALHO COMPLETO', { mods: { duploTiro: 0.15 } }],
  bussola: ['NORTE VERDADEIRO', { stats: { ima: 1 }, mods: { teleguiado: 0.6 } }],
  lanterna: ['FAROL', { stats: { luz: 1.4, curaSala: 2 } }],
  pedra: ['PEDREIRA', { stats: { pente: 1.3 }, mods: { tamanho: 1.1 } }],
};
for (const [oid] of OBJETOS) {
  const [sn, ef] = OBJ_SIN[oid];
  sinergias.push({ id: `t_${oid}_3`, itens: [], tags: { [oid]: 3 }, nome: sn, desc: descrever({ stats: ef.stats ?? {}, mods: ef.mods ?? {} }), ...ef });
}
const PARES = [
  ['fogo', 'gelo', 'VAPOR', { stats: { dano: 1.05 }, mods: { queima: true, congela: 0.1 } }],
  ['fogo', 'polvora', 'NAPALM', { mods: { queima: true, explosao: 10 } }],
  ['fogo', 'vento', 'INCÊNDIO FLORESTAL', { stats: { velocidade: 1.05 }, mods: { queima: true, velBala: 1.2 } }],
  ['gelo', 'vidro', 'CRISTAL DE GELO', { mods: { congela: 0.1, fragmenta: 2 } }],
  ['raio', 'mola', 'CURTO-CIRCUITO', { mods: { ricochete: 1, eletrico: 1 } }],
  ['raio', 'vento', 'TROVOADA', { mods: { eletrico: 2 } }],
  ['veneno', 'sangue', 'SANGUE PODRE', { stats: { roubaVida: 0.5, venenoForca: 1.3 } }],
  ['veneno', 'terra', 'PÂNTANO', { mods: { veneno: true, tamanho: 1.2 } }],
  ['sombra', 'luz', 'ECLIPSE', { stats: { critico: 0.1 } }],
  ['sombra', 'lamina', 'ASSASSINO', { stats: { critico: 0.06 }, mods: { perfura: 2 } }],
  ['olhar', 'lamina', 'FRANCO-ATIRADOR', { stats: { alcance: 1.2 }, mods: { teleguiado: 1, perfura: 2 } }],
  ['olhar', 'eco', 'ENXAME', { mods: { multiplos: 1, teleguiado: 0.8 } }],
  ['mola', 'vidro', 'ESTILHAÇOS QUICANTES', { mods: { ricochete: 2, fragmenta: 1 } }],
  ['ouro', 'sorte', 'SORTE GRANDE', { stats: { ceraBonus: 1.3, sorte: 1 } }],
  ['ouro', 'sangue', 'SANGUE AZUL', { stats: { dano: 1.1, roubaVida: 0.5 } }],
  ['tempo', 'eco', 'DÉJÀ VU', { stats: { cooldownDash: 0.85 }, mods: { duploTiro: 0.2 } }],
  ['tempo', 'vento', 'VELOCISTA', { stats: { velocidade: 1.12, cadencia: 0.9 } }],
  ['terra', 'polvora', 'MINA TERRESTRE', { mods: { explosao: 14, tamanho: 1.2 } }],
  ['luz', 'fogo', 'SOL', { stats: { luz: 1.3, dano: 1.08 }, mods: { queima: true } }],
  ['gelo', 'sombra', 'NOITE POLAR', { stats: { raioEsquiva: 2 }, mods: { congela: 0.12 } }],
  ['raio', 'lamina', 'LÂMINA ELÉTRICA', { mods: { perfura: 1, eletrico: 1 } }],
  ['eco', 'polvora', 'REAÇÃO EM CADEIA', { mods: { explosao: 8, duploTiro: 0.1 } }],
  ['sorte', 'vidro', 'ESPELHO QUEBRADO', { stats: { critico: 0.08 }, mods: { fragmenta: 1 } }],
  ['sangue', 'lamina', 'SANGRIA', { stats: { roubaVida: 0.8 }, mods: { perfura: 1 } }],
];
for (const [a, b, sn, ef] of PARES) {
  sinergias.push({ id: `t_${a}_${b}`, itens: [], tags: { [a]: 2, [b]: 2 }, nome: sn, desc: descrever({ stats: ef.stats ?? {}, mods: ef.mods ?? {} }), ...ef });
}

const tags = Object.fromEntries([...ELEMENTOS.map(([id, nome]) => [id, nome]), ...OBJETOS.map(([id, nome]) => [id, nome])]);

fs.writeFileSync('public/dados/itens_gerados.json', JSON.stringify(itens, null, 1) + '\n');
fs.writeFileSync('public/dados/sinergias_geradas.json', JSON.stringify(sinergias, null, 1) + '\n');
fs.writeFileSync('public/dados/tags.json', JSON.stringify(tags, null, 2) + '\n');
console.log(`${itens.length} itens gerados, ${sinergias.length} sinergias por etiqueta, ${Object.keys(tags).length} etiquetas.`);

// ---------- itens de referência e armas extras (escritos à mão em conteudoExtra.mjs) ----------
const { REFERENCIAS, ARMAS } = await import('./conteudoExtra.mjs');
const { ATIVOS, REFERENCIAS_ESPECIAIS, MELHORIAS, EXCLUSIVOS, RELIQUIAS } = await import('./conteudoAtivos.mjs');
const referencias = [...REFERENCIAS, ...REFERENCIAS_ESPECIAIS, ...EXCLUSIVOS, ...RELIQUIAS].map(([id, nome, desc, icone, cor, raridade, efBase, etiquetas]) => {
  // as melhorias dão gatilhos e passivos aos itens de referência antigos
  const m = MELHORIAS[id];
  const ef = { ...efBase, gatilhos: [...(efBase.gatilhos ?? []), ...(m?.gatilhos ?? [])], passivos: [...(efBase.passivos ?? []), ...(m?.passivos ?? [])] };
  const it = { id, nome, desc: m ? `${desc} ${m.extra}` : desc, icone, cor, raridade, tags: etiquetas, referencia: true };
  if (ef.gatilhos.length) it.gatilhos = ef.gatilhos;
  if (ef.passivos.length) it.passivos = ef.passivos;
  if (ef.exclusivo) it.exclusivo = ef.exclusivo;
  if (ef.especial) it.especial = ef.especial;
  if (ef.stats) it.stats = ef.stats;
  if (ef.mods) it.mods = ef.mods;
  if (ef.visual) it.visual = ef.visual;
  if (ef.especial) it.especial = ef.especial;
  if (ef.maldito) it.maldito = true;
  return it;
});
const base = JSON.parse(fs.readFileSync('public/dados/armas.json', 'utf8'));
const armas = ARMAS.map(([id, nome, desc, raridade, molde, tinta, bala, cor, som, mudancas]) => {
  const m = base.find((a) => a.id === molde) ?? base.find((a) => a.id === 'pistola');
  const { id: _i, nome: _n, desc: _d, raridade: _r, sprite: _s, ...valores } = m;
  return {
    id, nome, desc, raridade, sprite: `arma_${id}`,
    ...(molde === id ? {} : { forma: `arma_${m.id}`, tinta }),
    ...valores, bala, cor, som, ...mudancas,
  };
});
const ids = new Set();
const ativosBase = JSON.parse(fs.readFileSync('public/dados/ativos.json', 'utf8'));
const itensBase = JSON.parse(fs.readFileSync('public/dados/itens.json', 'utf8'));
for (const x of [...itens, ...referencias, ...itensBase, ...base, ...armas, ...ativosBase, ...ATIVOS.map((a) => ({ id: a[0] }))]) {
  if (ids.has(x.id)) throw new Error(`id repetido: ${x.id}`);
  ids.add(x.id);
}
fs.writeFileSync('public/dados/itens_referencias.json', JSON.stringify(referencias, null, 1) + '\n');
fs.writeFileSync('public/dados/armas_extras.json', JSON.stringify(armas, null, 1) + '\n');
const ativos = ATIVOS.map(([id, nome, desc, icone, cor, carga, efeitos]) => ({ id, nome, desc, icone, cor, carga, efeito: 'composto', efeitos }));
fs.writeFileSync('public/dados/ativos_extras.json', JSON.stringify(ativos, null, 1) + '\n');
console.log(`${ativos.length} itens ativos novos.`);
console.log(`${referencias.length} itens de referência, ${armas.length} armas extras (${[1, 2, 3, 4, 5].map((r) => armas.filter((a) => a.raridade === r).length).join('/')} por raridade).`);
