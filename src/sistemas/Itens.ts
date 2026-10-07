import { D, Mods, MODS_MULTIPLICADORES, SinergiaDef, Visual, ArmaDef, ItemDef, item, arma } from '../dados';

// Como os itens se combinam (estilo Binding of Isaac):
// cada arma traz modificadores de bala; itens e sinergias somam mais modificadores por cima.
// Ex.: Escopeta + Olho de Vidro + Mola = 7 chumbos teleguiados que quicam.

const CHAVES_MODS: (keyof Mods)[] = [
  'multiplos', 'ricochete', 'teleguiado', 'perfura', 'fragmenta', 'explosao', 'eletrico', 'congela', 'veneno', 'queima',
  'espectral', 'bumerangue', 'tamanho', 'velBala', 'traseiro', 'duploTiro', 'atrator', 'laser', 'fragmentoExplode', 'semAquecimento',
];

export function somarMods(a: Mods, b?: Mods): Mods {
  if (!b) return a;
  const r: Record<string, number | boolean | undefined> = { ...a };
  for (const k of CHAVES_MODS) {
    const v = b[k];
    if (v === undefined) continue;
    if (typeof v === 'boolean') r[k] = Boolean(r[k]) || v;
    else if (MODS_MULTIPLICADORES.includes(k)) r[k] = ((r[k] as number) ?? 1) * v;
    else r[k] = ((r[k] as number) ?? 0) + v;
  }
  return r as Mods;
}

/** Os modificadores que vêm da própria arma. */
export function modsDaArma(def: ArmaDef): Mods {
  const m: Record<string, unknown> = {};
  for (const k of CHAVES_MODS) if (def[k] !== undefined) m[k] = def[k];
  return m as Mods;
}

/**
 * Etiquetas de um item. Os itens feitos à mão sem etiqueta ganham as do efeito
 * (balas que incendeiam = fogo, mais cera = ouro...), então TODO item combina com os outros.
 */
export function inferirTags(it: ItemDef): string[] {
  if (it.tags?.length) return it.tags;
  const t = new Set<string>();
  const m = it.mods ?? {};
  const st = it.stats ?? {};
  if (m.queima || st.queimar) t.add('fogo');
  if (m.congela) t.add('gelo');
  if (m.eletrico) t.add('raio');
  if (m.veneno || st.venenoForca) t.add('veneno');
  if (m.explosao) t.add('polvora');
  if (m.fragmenta) t.add('vidro');
  if (m.ricochete || m.bumerangue) t.add('mola');
  if (m.teleguiado) t.add('olhar');
  if (m.perfura) t.add('lamina');
  if (m.espectral || st.raioEsquiva) t.add('sombra');
  if (st.luz || st.curaSala) t.add('luz');
  if (st.roubaVida) t.add('sangue');
  if (st.ceraBonus) t.add('ouro');
  if (st.cooldownDash || st.lentoExtra) t.add('tempo');
  if (m.multiplos || m.duploTiro) t.add('eco');
  if (st.velocidade || m.velBala) t.add('vento');
  if (m.tamanho || st.empurrao || st.danoRecebido) t.add('terra');
  if (st.sorte || st.critico) t.add('sorte');
  if (st.chamaMax) t.add('coracao');
  if (!t.size) t.add('vela');
  return [...t].slice(0, 3);
}

/** Quantos itens de cada etiqueta você tem. */
export function contarTags(itens: string[]) {
  const c: Record<string, number> = {};
  for (const id of itens) for (const t of item(id)?.tags ?? []) c[t] = (c[t] ?? 0) + 1;
  return c;
}

/** A sinergia está completa com estes itens (e esta arma)? */
export function sinergiaCompleta(s: SinergiaDef, itens: string[], armas: string[], tags = contarTags(itens)) {
  if (!s.itens.every((i) => itens.includes(i))) return false;
  if (s.arma && !armas.includes(s.arma)) return false;
  if (s.familia) {
    // transformação: conta cada item uma vez, se ele tiver qualquer etiqueta da família
    const fam = s.familia;
    const n = itens.filter((id) => item(id)?.tags?.some((t) => fam.tags.includes(t))).length;
    if (n < fam.n) return false;
  }
  return Object.entries(s.tags ?? {}).every(([t, n]) => (tags[t] ?? 0) >= n);
}

/** Sinergias ativas: itens e etiquetas presentes (e, se pedir, a arma na mão). */
export function sinergiasAtivas(itens: string[], armaNaMao?: string): SinergiaDef[] {
  const tags = contarTags(itens);
  return D.sinergias.filter((s) => (!s.arma || s.arma === armaNaMao) && sinergiaCompleta(s, itens, s.arma ? [s.arma] : [], tags));
}

/** Tudo que muda a bala no tiro com esta arma. */
export function modsDoTiro(itens: string[], armaId: string): Mods {
  let m = modsDaArma(arma(armaId));
  for (const id of itens) m = somarMods(m, item(id)?.mods);
  for (const s of sinergiasAtivas(itens, armaId)) m = somarMods(m, s.mods);
  return m;
}

export interface Aparencia {
  cera?: string;
  chama: string;
  chamas: number;
  acessorios: string[];
  alpha: number;
}

/** Junta a aparência de todos os itens (os mais recentes por cima) e das sinergias. */
export function aparenciaDosItens(itens: string[]): Aparencia {
  const ap: Aparencia = { chama: 'padrao', chamas: 1, acessorios: [], alpha: 1 };
  const aplicar = (v?: Visual) => {
    if (!v) return;
    if (v.cera) ap.cera = v.cera;
    if (v.chama) ap.chama = v.chama;
    if (v.chamas) ap.chamas = Math.max(ap.chamas, v.chamas);
    if (v.acessorio && !ap.acessorios.includes(v.acessorio)) ap.acessorios.push(v.acessorio);
    for (const a of v.acessorios ?? []) if (!ap.acessorios.includes(a)) ap.acessorios.push(a);
  };
  for (const id of itens) aplicar(item(id)?.visual);
  const ativas = sinergiasAtivas(itens);
  for (const s of ativas) if (!s.transformacao) aplicar(s.visual);
  for (const s of ativas) if (s.transformacao) aplicar(s.visual);
  if (ap.acessorios.includes('lencol')) ap.alpha = 0.7;
  return ap;
}

/** Quantos de cada item especial (orbes, gêmeas, escudo). */
export function especiais(itens: string[]) {
  const conta = (e: string) => itens.filter((i) => item(i)?.especial === e).length;
  const familia = sinergiasAtivas(itens).some((s) => s.especial === 'familia');
  return {
    orbes: conta('orbe') + (familia ? 1 : 0),
    gemeas: conta('gemea'),
    gemeaDupla: familia,
    escudo: conta('escudo') > 0,
  };
}

/**
 * Dica ao pegar um item: para cada etiqueta dele, quantas você tem e quantas a próxima sinergia pede
 * (ex.: "FOGO 2/3 · ANEL 1/3"), e se alguma sinergia ficou a 1 item de distância.
 */
export function dicaDeEtiquetas(itemId: string, itens: string[]) {
  const it = item(itemId);
  const tags = contarTags(itens);
  const partes: string[] = [];
  for (const t of it?.tags ?? []) {
    const c = tags[t] ?? 0;
    const proximos = D.sinergias.map((s) => s.tags?.[t]).filter((n): n is number => n !== undefined && n > c);
    const nome = (D.tags[t] ?? t).toUpperCase();
    partes.push(proximos.length ? `${nome} ${c}/${Math.min(...proximos)}` : `${nome} ${c}`);
  }
  // sinergias por etiqueta que ficaram a 1 de distância
  let quase = '';
  for (const s of D.sinergias) {
    if (!s.tags || s.itens.length || s.arma) continue;
    const faltas = Object.entries(s.tags).map(([t, n]) => [t, n - (tags[t] ?? 0)] as const).filter(([, f]) => f > 0);
    if (faltas.length === 1 && faltas[0][1] === 1) {
      quase = `Falta 1 de ${(D.tags[faltas[0][0]] ?? faltas[0][0]).toUpperCase()} para uma sinergia!`;
      break;
    }
  }
  return { linha: partes.join('  ·  '), quase };
}

/** As etiquetas da partida, da que você mais tem para a que menos tem. */
export function resumoEtiquetas(itens: string[]) {
  return Object.entries(contarTags(itens)).sort((a, b) => b[1] - a[1]);
}
