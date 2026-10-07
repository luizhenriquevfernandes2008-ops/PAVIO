// Tipos dos arquivos em public/dados/*.json e o lugar onde eles ficam depois de carregados.
import type { Gatilho, Efeito } from './sistemas/Efeitos';

export interface Stats {
  chamaMax: number;
  dano: number;
  velocidade: number;
  dashes: number;
  cooldownDash: number;
  alcance: number;
  luz: number;
  decaimento: number;
  curaCera: number;
  queimar: number;
  espinhos: number;
  pente: number;
  recarga: number;
  cadencia: number;
  critico: number; // chance extra de crítico
  ceraBonus: number; // multiplicador de cera por gota
  roubaVida: number; // chama curada por abate
  balasInimigas: number; // velocidade das balas inimigas
  ima: number; // puxa cera e itens de longe
  empurrao: number;
  raioEsquiva: number;
  lentoExtra: number; // duração da câmera lenta
  parryExtra: number; // balas extras rebatidas por parry
  janelaParry: number;
  sorte: number;
  venenoForca: number;
  danoRecebido: number; // multiplica o dano que você leva
  vidaInimigos: number; // multiplica a vida dos monstros
  curaSala: number; // chama curada ao limpar uma sala
}

// Nos itens, estes atributos multiplicam; o resto soma.
export const STATS_MULTIPLICADORES: (keyof Stats)[] = [
  'dano', 'velocidade', 'cooldownDash', 'alcance', 'luz', 'decaimento', 'curaCera', 'pente', 'recarga', 'cadencia',
  'ceraBonus', 'balasInimigas', 'empurrao', 'lentoExtra', 'venenoForca', 'danoRecebido', 'vidaInimigos',
];

/** O que muda no comportamento das balas. Armas e itens somam isso (como no Binding of Isaac). */
export interface Mods {
  multiplos?: number; // projéteis extras
  ricochete?: number; // quicadas nas paredes
  teleguiado?: number; // força da curva em direção ao monstro
  perfura?: number;
  fragmenta?: number; // se parte em N ao acertar
  explosao?: number; // raio
  eletrico?: number; // saltos de raio
  congela?: number; // chance
  veneno?: boolean;
  queima?: boolean;
  espectral?: boolean; // atravessa paredes
  bumerangue?: boolean;
  tamanho?: number; // multiplica
  velBala?: number; // multiplica
  traseiro?: number; // tiros para trás
  duploTiro?: number; // chance de atirar de novo
  atrator?: boolean; // puxa os monstros
  laser?: boolean; // instantâneo
  fragmentoExplode?: boolean;
  semAquecimento?: boolean;
}

export const MODS_MULTIPLICADORES: (keyof Mods)[] = ['tamanho', 'velBala'];

export interface Visual {
  cera?: string;
  chama?: 'azul' | 'ciano' | 'verde' | 'roxa' | 'branca' | 'vermelha' | 'dourada';
  chamas?: number;
  acessorio?: string;
  acessorios?: string[];
}

export interface ConfigDef {
  jogador: Stats;
  combate: {
    velocidadeDash: number;
    duracaoDash: number;
    custoDash: number;
    invencivelAposDano: number;
    curaPorGota: number;
    chanceMunicao: number;
    chanceSegundaOnda: number;
    janelaCombo: number;
    chanceBau: number;
  };
  armasIniciais: string[];
  maxArmas: number;
  luz: { raioMin: number; raioMax: number; escuridao: number };
  andares: number;
  nomesAndares: string[];
  chefes: string[];
  musicas: string[];
  tintaAndar: string[];
  chanceSalaEscura: number[];
  salasPorAndar: number[];
  orcamento: { base: number; porAndar: number; variacao: number };
  escalaAndar: { vida: number; dano: number };
  precos: { castical: number; item: number; vela: number; arma: number; municao: number; ativo: number };
  raridade: { pesos: number[] };
  altar: UpgradeDef[];
  parry: { janela: number; recarga: number; raio: number; dano: number; cura: number; maxRefletidas: number; danoNoChefe: number };
  esquiva: { raio: number; cura: number; camaraLenta: number; duracaoMs: number };
  frenesi: { combo: number; cadencia: number; velocidade: number; marcos: number[] };
  elite: { chance: number; chancePorAndar: number; vida: number; cera: number; anelMorte: number };
  critico: { chance: number; multiplicador: number };
  velocidadeBalasInimigas: number;
  abismo: { nome: string; chefe: string; musica: string; tinta: string; salas: number; chanceEscura: number };
  infinito: {
    salas: number; chanceEscura: number; chefes: string[]; vidaChefeBase: number; vidaChefePorAndar: number;
    musicas: string[]; tintas: string[]; orcamentoMaxAndar: number; eliteMax: number;
  };
  desafio: { chance: number[]; ondas: number; intensidade: number };
  capitulo3: { nome: string; chefe: string; musica: string; tinta: string; salas: number; chanceEscura: number; perigo: Perigo; descricao: string }[];
  secreta: { vidaParede: number; chanceAtivoTesouro: number; chanceAtivoLoja: number };
}

/** Mecânica especial de cada andar de "O Outro Lado". */
export type Perigo = 'cinzas' | 'espelho' | 'tempo' | 'mar' | 'coracao';

/** Item ativo: usa com a tecla C e recarrega limpando salas. */
export interface AtivoDef {
  id: string;
  nome: string;
  desc: string;
  icone: string;
  cor: string;
  carga: number; // salas para recarregar
  efeito: string; // os 10 primeiros têm código próprio; os outros usam "composto" + efeitos
  efeitos?: Efeito[];
  maldito?: boolean;
  referencia?: boolean;
}

export interface ConquistaDef {
  id: string;
  nome: string;
  desc: string;
  tipo: 'chefe' | 'chefeVezes' | 'marca' | 'andar' | 'combo' | 'secreta' | 'desafio' | 'sinergias' | 'parry' | 'malditos' | 'intocavel' | 'mortes' | 'partidas' | 'desafios' | 'doacao';
  valor: number | string;
  desbloqueia: { tipo: 'item' | 'arma' | 'ativo' | 'abismo' | 'outroLado' | 'personagem'; id: string }[];
}

export interface UpgradeDef {
  id: 'chamaMax' | 'dano' | 'luz' | 'ceraInicial' | 'smgInicial';
  nome: string;
  desc: string;
  valor: number;
  custo: number[];
}

export interface ArmaDef extends Mods {
  id: string;
  nome: string;
  desc: string;
  raridade: number; // 0 inicial · 1 comum · 2 incomum · 3 rara · 4 épica · 5 mítica
  sprite: string;
  forma?: string; // armas extras: desenho de outra arma, pintado com "tinta"
  exclusivo?: string; // só aparece para este personagem
  tinta?: string | null;
  bala: string;
  cor: string;
  som: string;
  dano: number;
  cadencia: number;
  aquecimento?: number;
  pente: number;
  recarga: number;
  projeteis: number;
  dispersao: number;
  velocidade: number;
  alcance: number;
  municao: number; // reserva máxima; -1 = infinita
  recuo: number;
  empurrao: number;
  tremor: number;
}

export interface ItemDef {
  id: string;
  nome: string;
  desc: string;
  icone: string;
  iconeTextura?: string; // usa esta textura como ícone (familiares)
  cor: string;
  raridade: number;
  mods?: Mods;
  stats?: Partial<Stats>;
  visual?: Visual;
  especial?: 'orbe' | 'gemea' | 'escudo' | 'cura';
  maldito?: boolean; // tem um lado bom e um lado ruim
  tags?: string[]; // etiquetas (fogo, anel, sorte...): juntar iguais libera sinergias
  gerado?: boolean; // feito pelo scripts/gerarConteudo.mjs
  referencia?: boolean; // homenagem a jogos, animes, filmes e séries
  gatilhos?: Gatilho[]; // efeitos que disparam sozinhos (ao matar, ao dar dash...)
  passivos?: string[]; // regras especiais (golpeDuplo, infinito, santoryu...)
  exclusivo?: string; // só aparece para este personagem
}

export interface SinergiaDef {
  id: string;
  itens: string[];
  tags?: Record<string, number>; // ex.: { fogo: 3 } = três itens com a etiqueta fogo
  familia?: { tags: string[]; n: number }; // transformação: N itens com QUALQUER uma destas etiquetas
  transformacao?: boolean;
  passivos?: string[];
  gatilhos?: Gatilho[];
  arma?: string;
  nome: string;
  desc: string;
  mods?: Mods;
  stats?: Partial<Stats>;
  visual?: Visual;
  especial?: 'familia';
}

export type IA =
  | 'zigue-zague' | 'perseguir' | 'saltar' | 'atirador' | 'enxame' | 'tanque' | 'invocador'
  | 'kamikaze' | 'investida' | 'rastro' | 'teleporte' | 'escudo' | 'curandeiro' | 'torre'
  | 'chefe' | 'chefe_ogro' | 'chefe_podre' | 'chefe_negro' | 'chefe_padrao'
  | 'fantasma' | 'minador' | 'orbitador' | 'laser' | 'alvo' | 'canhao' | 'ladrao';

export interface InimigoDef {
  nome: string;
  desc: string;
  custo: number;
  andarMin: number;
  grupo?: number;
  chefe?: boolean;
  vida: number;
  velocidade: number;
  dano: number;
  cera: [number, number];
  ia: IA;
  sprite: string;
  corpo: [number, number];
  escala?: number;
  salto?: number;
  divide?: string;
  invoca?: string;
  explosao?: number;
  semEscala?: boolean;
  tinta?: string; // cor por cima do sprite (variações de um mesmo monstro)
  escalaFixa?: number; // ignora a escala do visual.json (chefes feitos de monstros comuns)
  andares?: number[]; // só aparece nestes andares (os exclusivos de "O Outro Lado")
  ataques?: string[]; // chefe_padrao: a sequência de ataques
  furia?: string[]; // chefe_padrao: ataques que entram com metade da vida
  falas?: { inicio: string; furia: string; morte: string }; // o que o chefe diz
  projetil?: { velocidade: number; dano: number; intervalo: number; quantidade: number; dispersao: number; efeito?: 'lento' | 'veneno' };
}

export interface SalaTemplate {
  id: string;
  mapa: string[];
  inimigos?: [string, number, number][]; // [tipo, coluna, linha] (salas procedurais)
}

export interface SalasDef {
  legenda: Record<string, string>;
  inicio: SalaTemplate[];
  combate: SalaTemplate[];
  tesouro: SalaTemplate[];
  loja: SalaTemplate[];
  castical: SalaTemplate[];
  chefe: SalaTemplate[];
  secreta: SalaTemplate[];
  fonte: SalaTemplate[];
  troca: SalaTemplate[];
  amigo: SalaTemplate[];
  forja: SalaTemplate[];
  cassino: SalaTemplate[];
  tutorial: SalaTemplate[];
}

/** Personagem jogável (personagens.json): visual, equipamento inicial e atributos. */
export interface PersonagemDef2 {
  id: string;
  nome: string;
  desc: string;
  tipo: 'vela' | 'chama' | 'humano' | 'pack';
  cor: string;
  armas: string[];
  itens: string[];
  ativo?: string;
  stats?: Partial<Stats>;
  corpo?: string[];
  cores?: Record<string, string>;
  chama?: string;
  chamas?: number;
  acessorios?: string[];
  humano?: {
    pele: string; cabelo: string; estilo: 'ondulado' | 'franja' | 'baguncado'; roupa: string; calca: string;
    gola?: boolean; tatuagem?: boolean; capuz?: string; cruz?: boolean; barba?: string; largo?: boolean;
  };
}

export interface PersonagemDef {
  id: string;
  nome: string;
  atlas?: string;
}

export interface VisualDef {
  atlas: string;
  lista: string;
  personagens: PersonagemDef[];
  inimigos: Record<string, { anim: string; escala?: number; corpo?: [number, number] }>;
  cenario: Record<string, string[]>;
}

export const D = {
  config: null as unknown as ConfigDef,
  inimigos: null as unknown as Record<string, InimigoDef>,
  itens: null as unknown as ItemDef[],
  sinergias: null as unknown as SinergiaDef[],
  armas: null as unknown as ArmaDef[],
  salas: null as unknown as SalasDef,
  visual: null as unknown as VisualDef,
  ativos: null as unknown as AtivoDef[],
  conquistas: null as unknown as ConquistaDef[],
  tags: {} as Record<string, string>, // nome de cada etiqueta
  personagens: [] as PersonagemDef2[],
};

export function personagem(id: string): PersonagemDef2 {
  return D.personagens.find((p) => p.id === id) ?? D.personagens[0];
}

/** Os níveis de raridade (tier): nome e cor. */
export const RARIDADES = [
  { nome: 'INICIAL', cor: '#9a93a3' },
  { nome: 'COMUM', cor: '#f4ead6' },
  { nome: 'INCOMUM', cor: '#7fdc8a' },
  { nome: 'RARA', cor: '#4fa8ff' },
  { nome: 'ÉPICA', cor: '#c86bff' },
  { nome: 'MÍTICA', cor: '#ff9a2e' },
];

export function raridade(r: number) {
  return RARIDADES[Math.max(0, Math.min(RARIDADES.length - 1, r))];
}

export function ativo(id: string): AtivoDef | undefined {
  return D.ativos.find((a) => a.id === id);
}

/** Andares-chave da partida. */
export const marcos = () => {
  const c = D.config;
  const apagador = c.andares; // 5: fim do capítulo 1 (O Apagador)
  const abismo = apagador + 1; // 6: O Pavio Negro
  const acendedor = abismo + c.capitulo3.length; // 11: fim de "O Outro Lado"
  return { apagador, abismo, acendedor };
};

export interface InfoAndar {
  nome: string;
  chefe: string;
  musica: string;
  tinta: string;
  salas: number;
  chanceEscura: number;
  rotulo: string;
  capitulo: 1 | 2 | 3 | 4; // 1 a Catedral · 2 O Abismo · 3 O Outro Lado · 4 o infinito
  perigo?: Perigo;
  descricao?: string;
}

/** Tudo que muda de um andar para outro: 1-5 a história, 6 O Abismo, 7-11 O Outro Lado, 12+ o modo infinito. */
export function infoAndar(andar: number): InfoAndar {
  const c = D.config;
  const m = marcos();
  if (andar <= m.apagador) {
    const i = andar - 1;
    return {
      nome: c.nomesAndares[i], chefe: c.chefes[i], musica: c.musicas[i], tinta: c.tintaAndar[i],
      salas: c.salasPorAndar[i], chanceEscura: c.chanceSalaEscura[i], rotulo: `ANDAR ${andar}/${c.andares}`, capitulo: 1,
    };
  }
  if (andar === m.abismo) {
    const a = c.abismo;
    return { nome: a.nome, chefe: a.chefe, musica: a.musica, tinta: a.tinta, salas: a.salas, chanceEscura: a.chanceEscura, rotulo: 'O ABISMO', capitulo: 2 };
  }
  if (andar <= m.acendedor) {
    const k = andar - m.abismo - 1;
    const a = c.capitulo3[k];
    return { ...a, rotulo: `O OUTRO LADO ${k + 1}/${c.capitulo3.length}`, capitulo: 3 };
  }
  const f = c.infinito;
  const k = andar - m.acendedor - 1;
  return {
    nome: `PROFUNDEZA ${andar}`, chefe: f.chefes[k % f.chefes.length], musica: f.musicas[k % f.musicas.length],
    tinta: f.tintas[k % f.tintas.length], salas: f.salas, chanceEscura: f.chanceEscura, rotulo: `PROFUNDEZA ${andar}`, capitulo: 4,
  };
}

const indiceItens = new WeakMap<ItemDef[], Map<string, ItemDef>>();
const indiceArmas = new WeakMap<ArmaDef[], Map<string, ArmaDef>>();

export function item(id: string): ItemDef | undefined {
  let m = indiceItens.get(D.itens);
  if (!m) indiceItens.set(D.itens, (m = new Map(D.itens.map((r) => [r.id, r]))));
  return m.get(id);
}

/** Arma criada durante a partida (fusão da bigorna): entra na lista e no índice. */
export function registrarArma(def: ArmaDef) {
  D.armas.push(def);
  indiceArmas.delete(D.armas);
}

export function arma(id: string): ArmaDef {
  let m = indiceArmas.get(D.armas);
  if (!m) indiceArmas.set(D.armas, (m = new Map(D.armas.map((a) => [a.id, a]))));
  return m.get(id) ?? D.armas[0];
}
