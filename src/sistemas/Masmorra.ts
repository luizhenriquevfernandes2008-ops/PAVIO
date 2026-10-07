import Phaser from 'phaser';
import { D, SalaTemplate, infoAndar } from '../dados';
import { gerarSalaCombate } from './GeradorSala';

export type TipoSala = 'inicio' | 'combate' | 'tesouro' | 'loja' | 'castical' | 'chefe' | 'descanso' | 'secreta' | 'desafio' | 'fonte' | 'troca' | 'amigo' | 'tutorial' | 'forja' | 'cassino';
export type Dir = 'n' | 's' | 'l' | 'o'; // norte, sul, leste, oeste

export const DIRS: Record<Dir, [number, number]> = { n: [0, -1], s: [0, 1], l: [1, 0], o: [-1, 0] };
export const OPOSTO: Record<Dir, Dir> = { n: 's', s: 'n', l: 'o', o: 'l' };

export interface NoSala {
  gx: number;
  gy: number;
  tipo: TipoSala;
  template: SalaTemplate;
  escura: boolean;
  intensidade: number; // 0 descanso · 0.5 tranquila · 1 normal · 1.35 intensa
  limpa: boolean;
  visitada: boolean;
  conhecida: boolean;
  // estado que persiste ao sair e voltar para a sala
  casticalAceso: boolean;
  itemLoja: string | null;
  armaLoja: string | null;
  itemTesouro: string | null;
  ativoPedestal: string | null; // item ativo no pedestal "J" (tesouro e sala secreta)
  ativoLoja: string | null;
  itensChao: { tipo: 'item' | 'arma' | 'municao' | 'vela' | 'ativo'; id: string; x: number; y: number }[];
  comprado: Record<string, boolean>;
  quebrados: string[]; // caixotes já destruídos ("linha,coluna")
  escadaAberta: boolean; // chefe derrotado: a escada fica lá mesmo se você sair e voltar
  ondas: number; // sala de desafio: ondas que ainda faltam
  usos: number; // Fonte dos Desejos: moedas jogadas
  amigo?: string; // sala do amigo: quem está lá
  etapa?: number; // tutorial: qual lição
  chefe?: string; // chefe fixo desta sala (o Estúdio)
}

const LARGURA = 9;
const ALTURA = 6;

/** Gera o mapa de um andar: salas numa grade, ligadas por portas, estilo Binding of Isaac. */
export class Masmorra {
  readonly salas = new Map<string, NoSala>();
  readonly largura = LARGURA;
  readonly altura = ALTURA;
  inicio!: NoSala;
  /** Passagens para salas secretas que já foram explodidas ("x,y|x,y"). */
  readonly abertas = new Set<string>();

  static chave(x: number, y: number) {
    return `${x},${y}`;
  }

  constructor(readonly andar: number, total: number) {
    const rnd = Phaser.Math.RND;
    const celulas: [number, number][] = [[4, rnd.between(2, 3)]];
    const ocupado = new Set([Masmorra.chave(...celulas[0])]);
    const vizinhos = (x: number, y: number) =>
      (Object.values(DIRS) as [number, number][]).filter(([dx, dy]) => ocupado.has(Masmorra.chave(x + dx, y + dy))).length;

    for (let tentativas = 0; celulas.length < total && tentativas < 6000; tentativas++) {
      const [bx, by] = rnd.pick(celulas);
      const [dx, dy] = rnd.pick(Object.values(DIRS) as [number, number][]);
      const nx = bx + dx;
      const ny = by + dy;
      if (nx < 0 || ny < 0 || nx >= LARGURA || ny >= ALTURA) continue;
      if (ocupado.has(Masmorra.chave(nx, ny))) continue;
      // evita blocos 2x2 para o mapa ter corredores e becos
      if (vizinhos(nx, ny) > 1 && tentativas < 4000) continue;
      celulas.push([nx, ny]);
      ocupado.add(Masmorra.chave(nx, ny));
    }

    // distância (em salas) a partir do início
    const dist = new Map<string, number>([[Masmorra.chave(...celulas[0]), 0]]);
    const fila = [celulas[0]];
    while (fila.length) {
      const [x, y] = fila.shift()!;
      for (const [dx, dy] of Object.values(DIRS)) {
        const k = Masmorra.chave(x + dx, y + dy);
        if (ocupado.has(k) && !dist.has(k)) {
          dist.set(k, dist.get(Masmorra.chave(x, y))! + 1);
          fila.push([x + dx, y + dy]);
        }
      }
    }
    const d = (c: [number, number]) => dist.get(Masmorra.chave(...c)) ?? 0;

    const resto = celulas.slice(1);
    const becos = resto.filter(([x, y]) => vizinhos(x, y) === 1).sort((a, b) => d(b) - d(a));
    const tirar = (preferidas: [number, number][]) => {
      const c = preferidas.find((p) => resto.includes(p)) ?? resto.slice().sort((a, b) => d(b) - d(a))[0];
      resto.splice(resto.indexOf(c), 1);
      return c;
    };

    const tipos = new Map<string, TipoSala>();
    tipos.set(Masmorra.chave(...celulas[0]), 'inicio');
    tipos.set(Masmorra.chave(...tirar(becos)), 'chefe');
    tipos.set(Masmorra.chave(...tirar(becos)), 'tesouro');
    tipos.set(Masmorra.chave(...tirar(becos)), 'loja');
    tipos.set(Masmorra.chave(...tirar(rnd.shuffle(resto.filter((c) => d(c) >= 2)))), 'castical');
    // andares fundos ganham um segundo castiçal; todos ganham salas de descanso com baú
    if (andar >= 2) tipos.set(Masmorra.chave(...tirar(rnd.shuffle(resto.filter((c) => d(c) >= 3)))), 'castical');
    for (let i = 0; i < 2 && resto.length > 4; i++) tipos.set(Masmorra.chave(...tirar(rnd.shuffle(resto.filter((c) => d(c) >= 2)))), 'descanso');
    // sala de desafio: num beco que sobrou (ondas de monstros em troca de um prêmio raro)
    const cd = D.config.desafio.chance;
    const becoLivre = becos.find((b) => resto.includes(b) && d(b) >= 2);
    if (becoLivre && rnd.frac() < cd[Math.min(andar - 1, cd.length - 1)]) tipos.set(Masmorra.chave(...tirar([becoLivre])), 'desafio');

    // salas especiais raras: Fonte dos Desejos, Altar da Troca, a visita de um amigo, a Forja (bigorna) e o Cassino
    for (const [tipo, chance] of [['fonte', 0.4], ['troca', 0.3], ['amigo', 0.2], ['forja', 0.3], ['cassino', 0.3]] as [TipoSala, number][]) {
      const livres = resto.filter((c) => d(c) >= 2);
      if (livres.length > 3 && rnd.frac() < chance) tipos.set(Masmorra.chave(...tirar(rnd.shuffle(livres))), tipo);
    }

    // sala secreta: um buraco do mapa encostado em duas ou mais salas (nunca no chefe)
    const candidatas: [number, number, number][] = [];
    for (let y = 0; y < ALTURA; y++) {
      for (let x = 0; x < LARGURA; x++) {
        if (ocupado.has(Masmorra.chave(x, y))) continue;
        const viz = (Object.values(DIRS) as [number, number][]).map(([dx, dy]) => Masmorra.chave(x + dx, y + dy)).filter((k) => ocupado.has(k));
        if (!viz.length || viz.some((k) => tipos.get(k) === 'chefe' || tipos.get(k) === 'inicio')) continue;
        candidatas.push([x, y, viz.length + rnd.frac() * 0.5]);
      }
    }
    candidatas.sort((a, b) => b[2] - a[2]);
    if (candidatas.length) {
      const [sx, sy] = candidatas[0];
      celulas.push([sx, sy]);
      ocupado.add(Masmorra.chave(sx, sy));
      tipos.set(Masmorra.chave(sx, sy), 'secreta');
    }

    const chanceEscura = infoAndar(andar).chanceEscura;
    let n = 0;
    for (const [x, y] of celulas) {
      const tipo = tipos.get(Masmorra.chave(x, y)) ?? 'combate';
      const portas = (Object.keys(DIRS) as Dir[]).filter((dd) => ocupado.has(Masmorra.chave(x + DIRS[dd][0], y + DIRS[dd][1])));
      let template: SalaTemplate;
      // intensidade: perto do início é tranquilo; no resto, sorteia
      let intensidade = 1;
      if (tipo === 'descanso') intensidade = 0;
      else if (tipo === 'desafio') intensidade = D.config.desafio.intensidade;
      else if (d([x, y]) <= 1) intensidade = 0.6;
      else {
        const r = rnd.frac();
        intensidade = r < 0.25 ? 0.5 : r < 0.85 ? 1 : 1.35;
      }
      if (tipo === 'combate' || tipo === 'descanso' || tipo === 'desafio') {
        const gerada = gerarSalaCombate(rnd, andar, portas, intensidade);
        template = { id: `proc_${n++}_${gerada.estilo}`, mapa: gerada.mapa, inimigos: gerada.inimigos };
      } else {
        template = rnd.pick(D.salas[tipo]);
        // às vezes o tesouro vira um item ativo; a loja nem sempre tem um
        const sc = D.config.secreta;
        if (tipo === 'tesouro' && rnd.frac() < sc.chanceAtivoTesouro) template = { ...template, mapa: template.mapa.map((l) => l.replace('I', 'J')) };
        if (tipo === 'loja' && rnd.frac() >= sc.chanceAtivoLoja) template = { ...template, mapa: template.mapa.map((l) => l.replace('J', '.')) };
      }
      const no: NoSala = {
        gx: x, gy: y, tipo, template,
        escura: (tipo === 'combate' || tipo === 'tesouro' || tipo === 'descanso') && rnd.frac() < chanceEscura,
        intensidade,
        limpa: false, visitada: false, conhecida: false,
        casticalAceso: false, itemLoja: null, armaLoja: null, itemTesouro: null, ativoPedestal: null, ativoLoja: null,
        itensChao: [], comprado: {}, quebrados: [], escadaAberta: false,
        ondas: tipo === 'desafio' ? D.config.desafio.ondas - 1 : 0,
        usos: 0,
      };
      this.salas.set(Masmorra.chave(x, y), no);
      if (tipo === 'inicio') this.inicio = no;
    }
  }

  /** Desafio "Chefões em Sequência": um baú (começo), uma loja e o chefe. */
  static soChefe(andar: number): Masmorra {
    const m = Object.create(Masmorra.prototype) as Masmorra;
    const no = (gx: number, tipo: TipoSala): NoSala => ({
      gx, gy: 2, tipo, template: D.salas[tipo as 'loja' | 'tesouro' | 'chefe'][0], escura: false, intensidade: 1,
      limpa: false, visitada: false, conhecida: true, casticalAceso: false, itemLoja: null, armaLoja: null,
      itemTesouro: null, ativoPedestal: null, ativoLoja: null, itensChao: [], comprado: {}, quebrados: [], escadaAberta: false,
      ondas: 0, usos: 0,
    });
    const salas = new Map<string, NoSala>();
    for (const n of [no(3, 'loja'), no(4, 'tesouro'), no(5, 'chefe')]) salas.set(Masmorra.chave(n.gx, n.gy), n);
    Object.assign(m, { andar, salas, abertas: new Set(), largura: 9, altura: 6 });
    m.inicio = salas.get(Masmorra.chave(4, 2))!;
    return m;
  }

  /** O Estúdio: uma sala só, com O Criador. */
  static estudio(): Masmorra {
    const m = Object.create(Masmorra.prototype) as Masmorra;
    const no: NoSala = {
      gx: 4, gy: 2, tipo: 'chefe', template: D.salas.chefe[0], escura: false, intensidade: 1,
      limpa: false, visitada: false, conhecida: true, casticalAceso: false, itemLoja: null, armaLoja: null,
      itemTesouro: null, ativoPedestal: null, ativoLoja: null, itensChao: [], comprado: {}, quebrados: [], escadaAberta: false,
      ondas: 0, usos: 0, chefe: 'criador',
    };
    Object.assign(m, { andar: 99, salas: new Map([[Masmorra.chave(4, 2), no]]), abertas: new Set(), largura: 9, altura: 6 });
    m.inicio = no;
    return m;
  }

  /** O tutorial: 6 salas em linha, uma lição em cada. */
  static tutorial(): Masmorra {
    const m = Object.create(Masmorra.prototype) as Masmorra;
    const salas = new Map<string, NoSala>();
    D.salas.tutorial.forEach((template, etapa) => {
      const no: NoSala = {
        gx: 1 + etapa, gy: 2, tipo: 'tutorial', template, escura: false, intensidade: 1,
        limpa: false, visitada: false, conhecida: true,
        casticalAceso: false, itemLoja: null, armaLoja: null,
        itemTesouro: etapa === 3 ? 'mola' : null, ativoPedestal: etapa === 3 ? 'bomba_cera' : null, ativoLoja: null,
        itensChao: [], comprado: {}, quebrados: [], escadaAberta: false, ondas: 0, usos: 0, etapa,
      };
      salas.set(Masmorra.chave(no.gx, no.gy), no);
    });
    Object.assign(m, { andar: 1, salas, abertas: new Set(), largura: 9, altura: 6 });
    m.inicio = salas.get(Masmorra.chave(1, 2))!;
    return m;
  }

  vizinho(no: NoSala, dir: Dir): NoSala | undefined {
    const [dx, dy] = DIRS[dir];
    return this.salas.get(Masmorra.chave(no.gx + dx, no.gy + dy));
  }

  portas(no: NoSala): Dir[] {
    return (Object.keys(DIRS) as Dir[]).filter((d) => this.vizinho(no, d));
  }

  private aresta(a: NoSala, b: NoSala) {
    return [Masmorra.chave(a.gx, a.gy), Masmorra.chave(b.gx, b.gy)].sort().join('|');
  }

  /** A passagem entre esta sala e a vizinha é uma parede rachada (sala secreta ainda fechada)? */
  escondida(no: NoSala, dir: Dir) {
    const v = this.vizinho(no, dir);
    if (!v || (no.tipo !== 'secreta' && v.tipo !== 'secreta')) return false;
    return !this.abertas.has(this.aresta(no, v));
  }

  abrir(no: NoSala, dir: Dir) {
    const v = this.vizinho(no, dir);
    if (v) this.abertas.add(this.aresta(no, v));
  }

  /** Portas que dá para ver e atravessar (sem as passagens secretas fechadas). */
  portasVisiveis(no: NoSala): Dir[] {
    return this.portas(no).filter((d) => !this.escondida(no, d));
  }

  marcarVisitada(no: NoSala) {
    no.visitada = true;
    no.conhecida = true;
    for (const d of this.portasVisiveis(no)) this.vizinho(no, d)!.conhecida = true;
  }
}
