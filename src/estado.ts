import { D, Stats, STATS_MULTIPLICADORES, ConquistaDef, item, arma, ativo, personagem } from './dados';
import { Opcoes } from './opcoes';
import { sinergiasAtivas } from './sistemas/Itens';
import type { Masmorra, NoSala } from './sistemas/Masmorra';

// ---------- Progresso permanente (Altar), salvo no navegador ----------

export interface Meta {
  ceraDourada: number;
  niveis: Record<string, number>;
  melhorAndar: number;
  vitorias: number;
  partidas: number;
  melhorCombo: number;
  inimigosTotal: number;
  viuHistoria: boolean;
  sinergiasVistas: string[]; // descobertas (o Arsenal só mostra estas)
  conquistas: string[];
  chefesMortos: Record<string, number>; // vezes que cada chefe foi derrotado (O Pavio Negro precisa de 2)
  finais: string[]; // finais já vistos
  historico: RegistroPartida[]; // as últimas partidas (tela de estatísticas)
  porPersonagem: Record<string, { partidas: number; vitorias: number; melhorAndar: number; finais: string[] }>;
  itensPegos: Record<string, number>; // quantas vezes cada item foi pego
  causas: Record<string, number>; // do que você mais morre
  tempoTotal: number;
  diario: Record<string, { pontos: number; andar: number; vitoria: boolean }>; // recorde de cada dia
  tutorialFeito: boolean;
  maestria: Record<string, number>; // abates com cada arma (todas as partidas)
  skins: Record<string, string>; // skin escolhida para cada arma
  desafiosFeitos: string[]; // desafios já vencidos
  doado: number; // cera doada na máquina de doação
}

export interface RegistroPartida {
  quando: number;
  personagem: string;
  modo: string;
  andar: number;
  tempo: number;
  vitoria: boolean;
  fim?: string;
  causa?: string;
  mortes: number;
  combo: number;
  itens: number;
  armas: string[];
}

const CHAVE_META = 'pavio_meta_v1';

function metaVazia(): Meta {
  return { ceraDourada: 0, niveis: {}, melhorAndar: 0, vitorias: 0, partidas: 0, melhorCombo: 0, inimigosTotal: 0, viuHistoria: false, sinergiasVistas: [], conquistas: [], chefesMortos: {}, finais: [],
    historico: [], porPersonagem: {}, itensPegos: {}, causas: {}, tempoTotal: 0, diario: {}, tutorialFeito: false,
    maestria: {}, skins: {}, desafiosFeitos: [], doado: 0,
  };
}

export function carregarMeta(): Meta {
  try {
    const bruto = localStorage.getItem(CHAVE_META);
    if (bruto) return { ...metaVazia(), ...JSON.parse(bruto) };
  } catch {
    // sem localStorage (aba anônima etc.): segue sem salvar
  }
  return metaVazia();
}

export function salvarMeta(meta: Meta) {
  try {
    localStorage.setItem(CHAVE_META, JSON.stringify(meta));
  } catch {
    // idem
  }
}

export function apagarProgresso() {
  Estado.meta = metaVazia();
  salvarMeta(Estado.meta);
}

export function nivelAltar(meta: Meta, id: string): number {
  return meta.niveis[id] ?? 0;
}

// ---------- Estado da partida atual ----------

export interface ArmaRun {
  id: string;
  pente: number; // balas no pente agora
  reserva: number; // balas guardadas (-1 = infinito)
}

export interface Run {
  andar: number;
  chama: number;
  cera: number;
  ceraTotal: number;
  itens: string[];
  sinergias: string[]; // já anunciadas
  reservadas: string[]; // itens/armas já sorteados para baús e lojas nesta partida
  armas: ArmaRun[];
  armaAtual: number;
  mortes: number;
  tempo: number;
  combo: number;
  comboT: number;
  melhorCombo: number;
  stats: Stats;
  ativo: { id: string; carga: number } | null; // item ativo (tecla C)
  parries: number;
  personagem: string;
  abismo: boolean; // já venceu O Apagador antes: pode descer ao Abismo
  outroLado: boolean; // já venceu O Pavio Negro 2 vezes: pode descer a "O Outro Lado"
  modo: 'normal' | 'diario' | 'tutorial';
  renasceu?: boolean; // Palito de Reserva já usado
  estudio?: boolean; // está no Estúdio (chefe secreto)
  coop?: boolean; // dupla: dois jogadores, mesma chama
  personagem2?: string;
  armaP2?: string;
  desafio?: string; // modo desafio (regras fixas)
  semente?: number; // semente da masmorra (dá para jogar a mesma com um amigo)
  maldicao?: string | null; // maldição do andar atual
  fusoes?: { a: string; b: string }[]; // armas fundidas na bigorna (refeitas ao continuar)
  grafico?: number[]; // chama (%) ao longo da partida, para o resumo
  quase?: { pct: number; tempo: number; andar: number }; // o momento em que quase apagou
}

export interface Banner {
  titulo: string;
  texto: string;
  cor: string;
  vida: number;
}

export const Estado = {
  run: null as Run | null,
  meta: carregarMeta(),
  masmorra: null as Masmorra | null,
  sala: null as NoSala | null,
  prompt: '',
  banner: null as Banner | null,
  chefe: null as { nome: string; vida: number; max: number } | null,
  recarregando: 0, // 0..1 progresso da recarga (para o HUD)
  aviso: null as { texto: string; cor: string; vida: number } | null, // mensagem curta perto da arma
  usandoMouse: true,
  pausado: false,
  popups: [] as Popup[], // textos que saltam no mundo (dano, PARRY!, ESQUIVA!)
  parryPronto: 1, // 0..1 recarga do parry (para o HUD)
  pulso: 0, // batida da música (0..1), faz luzes e textos pulsarem
  camaraLenta: false,
  toasts: [] as { titulo: string; texto: string; vida: number }[], // conquistas desbloqueadas
  dica: null as { linha: string; quase: string; vida: number } | null, // etiquetas do item que você acabou de pegar
  instrucao: '', // tutorial: o que fazer agora
  dev: false, // menu de desenvolvedor aberto (F2)
  deus: false, // trapaça: não leva dano e a chama não acaba
};

// ---------- Conquistas e desbloqueios ----------

/** Nome do que uma conquista libera (para mostrar na tela). */
export function nomeDesbloqueio(d: ConquistaDef['desbloqueia'][number]) {
  if (d.tipo === 'abismo') return 'O Abismo';
  if (d.tipo === 'outroLado') return 'O OUTRO LADO (5 andares novos)';
  if (d.tipo === 'personagem') return `personagem ${personagem(d.id).nome}`;
  if (d.tipo === 'item') return item(d.id)?.nome ?? d.id;
  if (d.tipo === 'ativo') return ativo(d.id)?.nome ?? d.id;
  return arma(d.id).nome;
}

/** Um item, arma ou ativo ainda trancado atrás de uma conquista. */
export function bloqueado(tipo: 'item' | 'arma' | 'ativo' | 'abismo' | 'personagem', id: string) {
  if (Opcoes.dev) return false; // modo desenvolvedor: tudo liberado
  const c = D.conquistas.find((q) => q.desbloqueia.some((d) => d.tipo === tipo && d.id === id));
  return !!c && !Estado.meta.conquistas.includes(c.id);
}

export function conquistaDe(tipo: string, id: string) {
  return D.conquistas.find((q) => q.desbloqueia.some((d) => d.tipo === tipo && d.id === id));
}

/**
 * Confere as conquistas de um tipo. Números contam quando chegam no valor ("combo 30");
 * textos precisam ser iguais ("chefe ogro"); sem valor, basta o evento acontecer.
 */
export function checarConquista(tipo: ConquistaDef['tipo'], valor: number | string = 1) {
  for (const c of D.conquistas) {
    if (c.tipo !== tipo || Estado.meta.conquistas.includes(c.id)) continue;
    let ok = typeof c.valor === 'number' && typeof valor === 'number' ? valor >= c.valor : c.valor === valor;
    if (c.tipo === 'chefeVezes') {
      // valor "pavio_negro:2" = derrotar O Pavio Negro 2 vezes (somando as partidas)
      const [chefe, vezes] = String(c.valor).split(':');
      ok = valor === chefe && (Estado.meta.chefesMortos[chefe] ?? 0) >= Number(vezes);
    }
    if (!ok) continue;
    Estado.meta.conquistas.push(c.id);
    salvarMeta(Estado.meta);
    Estado.toasts.push({ titulo: c.nome, texto: `Desbloqueou: ${c.desbloqueia.map(nomeDesbloqueio).join(', ')}`, vida: 5 });
  }
}

export interface Popup {
  x: number; // coordenadas do mundo
  y: number;
  texto: string;
  cor: string;
  tam: number;
}

export function popup(x: number, y: number, texto: string, cor = '#f4ead6', tam = 16) {
  if (Estado.popups.length < 60) Estado.popups.push({ x, y, texto, cor, tam });
}

export function avisar(texto: string, cor = '#f4ead6') {
  Estado.aviso = { texto, cor, vida: 1.6 };
}

export function calcularStats(run: Pick<Run, 'itens'> & { personagem?: string; desafio?: string }, meta: Meta): Stats {
  const s: Stats = { ...D.config.jogador };
  // atributos do personagem (multiplicam ou somam como os itens)
  for (const [k, v] of Object.entries(personagem(run.personagem ?? 'vela').stats ?? {}) as [keyof Stats, number][]) {
    if (STATS_MULTIPLICADORES.includes(k)) s[k] *= v;
    else s[k] += v;
  }
  for (const up of D.config.altar) {
    const nivel = nivelAltar(meta, up.id);
    if (!nivel || !(up.id in s)) continue;
    (s as unknown as Record<string, number>)[up.id] += up.valor * nivel;
  }
  const aplicar = (efeito?: Partial<Stats>) => {
    for (const [k, v] of Object.entries(efeito ?? {}) as [keyof Stats, number][]) {
      if (STATS_MULTIPLICADORES.includes(k)) s[k] *= v;
      else s[k] += v;
    }
  };
  for (const id of run.itens) aplicar(item(id)?.stats);
  for (const sin of sinergiasAtivas(run.itens)) if (!sin.arma) aplicar(sin.stats);
  // regras dos desafios que mexem nos atributos
  if (run.desafio === 'sem_esquiva') s.dano *= 1.3;
  if (run.desafio === 'pavio_curto') s.decaimento *= 2;
  return s;
}

export function novaArma(id: string): ArmaRun {
  const a = arma(id);
  return { id, pente: a.pente, reserva: a.municao < 0 ? -1 : Math.round(a.municao / 2) };
}

export function novaRun(modo: Run['modo'] = 'normal'): Run {
  const meta = Estado.meta;
  // o personagem escolhido traz as armas, os itens e o ativo iniciais (no diário e no tutorial é sempre a Velinha)
  const pers = personagem(modo !== 'normal' || bloqueado('personagem', Opcoes.personagem) ? 'vela' : Opcoes.personagem);
  const itensIniciais = pers.itens.filter((id) => item(id));
  // desafio diário: um item de raridade 2 sorteado pela semente do dia
  if (modo === 'diario') {
    const opcoes = D.itens.filter((i) => i.raridade === 2 && !i.exclusivo && !i.maldito);
    itensIniciais.push(opcoes[Math.floor(Math.random() * opcoes.length)].id);
  }
  const stats = calcularStats({ itens: itensIniciais, personagem: pers.id }, meta);
  const ceraUp = D.config.altar.find((u) => u.id === 'ceraInicial');
  const iniciais = pers.armas.length ? [...pers.armas] : [...D.config.armasIniciais];
  if (nivelAltar(meta, 'smgInicial') > 0 && !iniciais.includes('metralhadora')) iniciais.push('metralhadora');
  const run: Run = {
    andar: 1,
    chama: stats.chamaMax,
    cera: ceraUp ? ceraUp.valor * nivelAltar(meta, 'ceraInicial') : 0,
    ceraTotal: 0,
    itens: itensIniciais,
    sinergias: [],
    reservadas: [...itensIniciais],
    armas: iniciais.slice(0, D.config.maxArmas).map(novaArma),
    armaAtual: 0,
    mortes: 0,
    tempo: 0,
    combo: 0,
    comboT: 0,
    melhorCombo: 0,
    stats,
    ativo: pers.ativo && ativo(pers.ativo) ? { id: pers.ativo, carga: ativo(pers.ativo)!.carga } : null,
    parries: 0,
    personagem: pers.id,
    abismo: Opcoes.dev || meta.conquistas.includes('apagador'),
    outroLado: Opcoes.dev || meta.conquistas.includes('negro2'),
    modo,
  };
  Estado.run = run;
  Estado.prompt = '';
  Estado.banner = null;
  Estado.chefe = null;
  Estado.recarregando = 0;
  Estado.pausado = false;
  Estado.toasts = [];
  return run;
}

export function mostrarBanner(titulo: string, texto: string, cor = '#f4ead6', vida = 3.2) {
  Estado.banner = { titulo, texto, cor, vida };
}
