import Phaser from 'phaser';
import { D, ArmaDef, raridade, marcos, ativo as acharAtivo, arma as acharArma, item as acharItem } from './dados';
import { Estado, salvarMeta, novaArma, calcularStats } from './estado';
import { contarTags, sinergiaCompleta } from './sistemas/Itens';
import type { Jogador } from './entidades/Jogador';
import type { Inimigo } from './entidades/Inimigo';
import type { NoSala, Dir } from './sistemas/Masmorra';

// Menu de desenvolvedor (F2 durante a partida): um painel HTML por cima do jogo
// para dar itens, armas e ativos, criar monstros e chefes, e trapacear à vontade.

/** O que o menu usa da cena Jogo (vários são privados lá; aqui é só para testes). */
interface JogoDev extends Phaser.Scene {
  jogador: Jogador;
  chefe: Inimigo | null;
  temInimigos: boolean;
  pegarItem(id: string): void;
  criarItemChao(tipo: string, id: string, x: number, y: number, salvar: boolean, op?: { pedestal?: boolean; animar?: boolean }): unknown;
  criarInimigo(tipo: string, x: number, y: number, elite?: boolean): Inimigo;
  matarInimigo(ini: Inimigo): void;
  listaInimigos(): Inimigo[];
  salaLimpa(): void;
  proximoAndar(): void;
  entrarSala(no: NoSala, chegada: Dir | null): void;
  posicaoLivre(x: number, y: number, dist: number): { x: number; y: number };
  anunciarArma(def: ArmaDef): void;
  encherMunicao(pentes: number): void;
  verificarSinergias(): void;
  atualizarAparencia(): void;
  posicionarFamiliares(): void;
  irParaEstudio(): void;
  irParaSalaTeste(tipo: 'forja' | 'cassino'): void;
}

type Aba = 'itens' | 'armas' | 'ativos' | 'inimigos' | 'sinergias' | 'trapacas';
const ABAS: [Aba, string][] = [
  ['itens', 'ITENS'], ['armas', 'ARMAS'], ['ativos', 'ATIVOS'], ['inimigos', 'MONSTROS'], ['sinergias', 'SINERGIAS'], ['trapacas', 'TRAPAÇAS'],
];
const LIMITE = 120; // linhas por vez (para não travar com 600+ itens)

const CSS = `
#pavio-dev { position: fixed; top: 0; right: 0; width: 460px; max-width: 100vw; height: 100vh; z-index: 9999;
  background: rgba(13, 9, 18, 0.96); border-left: 3px solid #ff9a2e; color: #f4ead6; cursor: default;
  font-family: 'Press Start 2P', monospace; font-size: 9px; display: flex; flex-direction: column; }
#pavio-dev * { box-sizing: border-box; }
#pavio-dev header { padding: 12px; color: #ff9a2e; font-size: 11px; display: flex; justify-content: space-between; }
#pavio-dev nav { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 12px 8px; }
#pavio-dev button { font: inherit; font-size: 8px; color: #f4ead6; background: #2a2033; border: 1px solid #4b3a58;
  padding: 6px 8px; cursor: pointer; }
#pavio-dev button:hover { background: #4b3a58; border-color: #ff9a2e; }
#pavio-dev button.ativa { background: #ff9a2e; color: #1b1325; }
#pavio-dev input { font: inherit; font-size: 9px; width: calc(100% - 24px); margin: 0 12px 8px; padding: 8px;
  background: #1b1325; color: #f4ead6; border: 1px solid #4b3a58; outline: none; }
#pavio-dev input:focus { border-color: #ff9a2e; }
#pavio-dev .info { padding: 0 12px 6px; color: #9a93a3; font-size: 8px; line-height: 1.5; }
#pavio-dev .lista { flex: 1; overflow-y: auto; padding: 0 8px 12px 12px; }
#pavio-dev .linha { display: flex; align-items: center; gap: 8px; padding: 6px 4px; border-bottom: 1px solid #2a2033; }
#pavio-dev .linha img { width: 32px; height: 32px; image-rendering: pixelated; object-fit: contain; flex: none; }
#pavio-dev .texto { flex: 1; min-width: 0; line-height: 1.5; }
#pavio-dev .nome { font-size: 9px; }
#pavio-dev .desc { color: #9a93a3; font-size: 7px; }
#pavio-dev .botoes { display: flex; gap: 4px; flex: none; }
#pavio-dev .grade { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 4px 0; }
#pavio-dev .grade button { padding: 10px 6px; text-align: left; }
`;

export class MenuDev {
  aberto = false;
  private raiz: HTMLDivElement | null = null;
  private aba: Aba = 'itens';
  private busca = '';
  private icones = new Map<string, string>();

  constructor(private readonly cena: Phaser.Scene) {}

  private get jogo() {
    return this.cena as unknown as JogoDev;
  }

  alternar() {
    if (this.aberto) this.fechar();
    else this.abrir();
  }

  abrir() {
    if (this.aberto || !Estado.run || this.jogo.jogador.morto || Estado.pausado) return;
    this.aberto = true;
    Estado.dev = true;
    const c = this.cena;
    c.physics.pause();
    c.anims.pauseAll();
    c.tweens.pauseAll();
    c.time.paused = true;
    // o teclado vai para a caixa de busca, não para o jogo
    const kb = c.input.keyboard!;
    kb.enabled = false;
    kb.disableGlobalCapture();
    c.input.setDefaultCursor('default');
    this.montar();
  }

  fechar() {
    if (!this.aberto) return;
    this.aberto = false;
    Estado.dev = false;
    this.raiz?.remove();
    this.raiz = null;
    const c = this.cena;
    c.physics.resume();
    c.anims.resumeAll();
    c.tweens.resumeAll();
    c.time.paused = false;
    const kb = c.input.keyboard!;
    kb.enabled = true;
    kb.enableGlobalCapture();
    kb.resetKeys();
    c.input.setDefaultCursor('none');
  }

  destruir() {
    if (this.aberto) this.fechar();
  }

  // ===================== montagem =====================

  private montar() {
    this.raiz?.remove();
    const r = document.createElement('div');
    r.id = 'pavio-dev';
    r.innerHTML = `<style>${CSS}</style>
      <header><span>MENU DEV</span><span>F2 / ESC fecha</span></header>
      <nav></nav>
      <input placeholder="buscar (nome, id ou etiqueta)..." />
      <div class="info"></div>
      <div class="lista"></div>`;
    document.body.appendChild(r);
    this.raiz = r;
    const nav = r.querySelector('nav')!;
    for (const [id, nome] of ABAS) {
      const b = this.botao(nome, () => {
        this.aba = id;
        this.busca = '';
        input.value = '';
        this.desenhar();
      });
      b.dataset.aba = id;
      nav.appendChild(b);
    }
    const input = r.querySelector('input')!;
    input.addEventListener('input', () => {
      this.busca = input.value.trim().toLowerCase();
      this.desenhar();
    });
    // ESC e F2 fecham mesmo com o foco na busca
    input.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' || e.code === 'F2') {
        e.preventDefault();
        this.fechar();
      }
      e.stopPropagation();
    });
    this.desenhar();
    if (this.aba !== 'trapacas') input.focus();
  }

  private botao(texto: string, acao: () => void) {
    const b = document.createElement('button');
    b.textContent = texto;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      acao();
    });
    return b;
  }

  /** Ícone (textura do jogo) como imagem para o HTML, guardado em cache. */
  private icone(chave: string) {
    let url = this.icones.get(chave);
    if (url === undefined) {
      url = this.cena.textures.exists(chave) ? (this.cena.textures.getBase64(chave) as string) : '';
      this.icones.set(chave, url);
    }
    return url;
  }

  private linha(icone: string, nome: string, cor: string, desc: string, botoes: [string, () => void][]) {
    const l = document.createElement('div');
    l.className = 'linha';
    if (icone) {
      const img = document.createElement('img');
      img.src = this.icone(icone);
      l.appendChild(img);
    }
    const t = document.createElement('div');
    t.className = 'texto';
    const n = document.createElement('div');
    n.className = 'nome';
    n.style.color = cor;
    n.textContent = nome;
    const d = document.createElement('div');
    d.className = 'desc';
    d.textContent = desc;
    t.append(n, d);
    const bs = document.createElement('div');
    bs.className = 'botoes';
    for (const [rot, acao] of botoes) bs.appendChild(this.botao(rot, acao));
    l.append(t, bs);
    return l;
  }

  private bate(...textos: (string | undefined)[]) {
    if (!this.busca) return true;
    return textos.some((t) => t?.toLowerCase().includes(this.busca));
  }

  private desenhar() {
    const r = this.raiz;
    if (!r) return;
    r.querySelectorAll<HTMLButtonElement>('nav button').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === this.aba));
    const input = r.querySelector('input')!;
    input.style.display = this.aba === 'trapacas' ? 'none' : '';
    const info = r.querySelector('.info')!;
    const lista = r.querySelector('.lista')!;
    lista.innerHTML = '';
    const run = Estado.run!;
    let total = 0;
    const add = (el: HTMLElement) => {
      total++;
      if (total <= LIMITE) lista.appendChild(el);
    };

    switch (this.aba) {
      case 'itens':
        for (const it of D.itens) {
          if (!this.bate(it.nome, it.id, it.desc, ...(it.tags ?? []).map((t) => D.tags[t] ?? t))) continue;
          const tem = run.itens.includes(it.id);
          const etq = (it.tags ?? []).map((t) => D.tags[t] ?? t).join(' · ');
          add(this.linha(`icone_${it.id}`, it.nome + (tem ? ' (tem)' : '') + (it.maldito ? ' ☠' : ''), it.maldito ? '#c86bff' : it.cor, `${it.desc} [${etq}]`, [
            ['PEGAR', () => this.darItem(it.id)],
            ['CHÃO', () => this.noChao('item', it.id)],
          ]));
        }
        info.textContent = `${D.itens.length} itens · você tem ${run.itens.length}`;
        break;
      case 'armas':
        for (const a of [...D.armas].sort((x, y) => y.raridade - x.raridade)) {
          const rr = raridade(a.raridade);
          if (!this.bate(a.nome, a.id, a.desc, rr.nome)) continue;
          add(this.linha(a.sprite, `${a.nome} [${rr.nome}]`, rr.cor, a.desc, [
            ['PEGAR', () => this.darArma(a.id)],
            ['CHÃO', () => this.noChao('arma', a.id)],
          ]));
        }
        info.textContent = `${D.armas.length} armas · PEGAR troca a arma da mão se você já tiver ${D.config.maxArmas}`;
        break;
      case 'ativos':
        for (const a of D.ativos) {
          if (!this.bate(a.nome, a.id, a.desc)) continue;
          add(this.linha(`icone_${a.id}`, a.nome, a.cor, `${a.desc} (recarga ${a.carga})`, [
            ['PEGAR', () => {
              run.ativo = { id: a.id, carga: a.carga };
              this.aviso(`ATIVO: ${a.nome}`);
            }],
            ['CHÃO', () => this.noChao('ativo', a.id)],
          ]));
        }
        info.textContent = 'Itens ativos (tecla C).';
        break;
      case 'inimigos':
        for (const [id, def] of Object.entries(D.inimigos)) {
          if (!this.bate(def.nome, id, def.desc)) continue;
          const tex = this.cena.textures.exists(def.sprite) ? def.sprite : '';
          add(this.linha(tex, def.nome + (def.chefe ? ' [CHEFE]' : ''), def.chefe ? '#e2452b' : '#ff9a2e', def.desc, [
            ['CRIAR', () => this.criarMonstro(id, false)],
            ...(def.chefe ? [] : ([['ELITE', () => this.criarMonstro(id, true)]] as [string, () => void][])),
          ]));
        }
        info.textContent = 'Os monstros aparecem longe de você e o jogo continua pausado até fechar o menu.';
        break;
      case 'sinergias': {
        const tags = contarTags(run.itens);
        const armas = run.armas.map((w) => w.id);
        for (const sg of D.sinergias) {
          const req = [
            ...(sg.arma ? [acharArma(sg.arma).nome] : []),
            ...sg.itens.map((i) => acharItem(i)?.nome ?? i),
            ...Object.entries(sg.tags ?? {}).map(([t, n]) => `${n}x ${D.tags[t] ?? t}`),
          ].join(' + ');
          if (!this.bate(sg.nome, sg.id, req, sg.desc)) continue;
          const ok = sinergiaCompleta(sg, run.itens, armas, tags);
          add(this.linha('', `${sg.nome}${ok ? ' (ATIVA)' : ''}`, ok ? '#7fdc8a' : '#ffd23f', `${req}: ${sg.desc}`, [['ATIVAR', () => this.ativarSinergia(sg.id)]]));
        }
        info.textContent = `${D.sinergias.length} sinergias · ATIVAR dá o que falta para ela.`;
        break;
      }
      case 'trapacas':
        info.textContent = 'Trapaças. Valem só para esta partida (menos as de conquistas).';
        lista.appendChild(this.trapacas());
        break;
    }
    if (total > LIMITE) info.textContent += ` · mostrando ${LIMITE} de ${total}: use a busca`;
    else if (this.aba !== 'trapacas') info.textContent += ` · ${total} na lista`;
  }

  private trapacas() {
    const run = Estado.run!;
    const meta = Estado.meta;
    const jogo = this.jogo;
    const g = document.createElement('div');
    g.className = 'grade';
    const itens: [string, () => void][] = [
      [`MODO DEUS: ${Estado.deus ? 'LIGADO' : 'DESLIGADO'}`, () => {
        Estado.deus = !Estado.deus;
        this.desenhar();
      }],
      ['CHAMA CHEIA', () => (run.chama = run.stats.chamaMax)],
      ['+100 CERA', () => (run.cera += 100)],
      ['+1000 CERA', () => (run.cera += 1000)],
      ['MUNIÇÃO CHEIA', () => jogo.encherMunicao(99)],
      ['CARREGAR ATIVO', () => {
        if (run.ativo) run.ativo.carga = acharAtivo(run.ativo.id)?.carga ?? 1;
      }],
      ['MATAR TODOS', () => {
        for (const ini of jogo.listaInimigos()) if (!ini.morto) jogo.matarInimigo(ini);
      }],
      ['LIMPAR A SALA', () => {
        for (const ini of jogo.listaInimigos()) if (!ini.morto) jogo.matarInimigo(ini);
        if (!Estado.sala!.limpa) jogo.salaLimpa();
      }],
      ['REVELAR O MAPA', () => {
        for (const no of Estado.masmorra!.salas.values()) no.conhecida = true;
      }],
      ['IR PARA O CHEFE', () => {
        const no = [...Estado.masmorra!.salas.values()].find((n) => n.tipo === 'chefe');
        if (no) this.irPara(no);
      }],
      ['IR PARA A LOJA', () => {
        const no = [...Estado.masmorra!.salas.values()].find((n) => n.tipo === 'loja');
        if (no) this.irPara(no);
      }],
      ['IR PARA A SECRETA', () => {
        const m = Estado.masmorra!;
        const no = [...m.salas.values()].find((n) => n.tipo === 'secreta');
        if (!no) return;
        for (const d of m.portas(no)) m.abrir(no, d);
        this.irPara(no);
      }],
      ['PRÓXIMO ANDAR', () => {
        this.fechar();
        jogo.proximoAndar();
      }],
      ['IR PARA O ANDAR 5 (APAGADOR)', () => this.irParaAndar(marcos().apagador)],
      ['IR PARA O ABISMO (6)', () => this.irParaAndar(marcos().abismo)],
      ['IR PARA O OUTRO LADO (7)', () => this.irParaAndar(marcos().abismo + 1)],
      ['IR PARA O ACENDEDOR (11)', () => this.irParaAndar(marcos().acendedor)],
      ['IR PARA O INFINITO (12)', () => this.irParaAndar(marcos().acendedor + 1)],
      ['IR PARA O CRIADOR (ESTÚDIO)', () => {
        // vai direto para a luta secreta, mesmo sem ter visto os 3 finais
        this.fechar();
        Estado.run!.andar = marcos().acendedor;
        this.jogo.irParaEstudio();
      }],
      ['IR PARA A FORJA (BIGORNA)', () => {
        this.fechar();
        this.jogo.irParaSalaTeste('forja');
      }],
      ['IR PARA O CASSINO', () => {
        this.fechar();
        this.jogo.irParaSalaTeste('cassino');
      }],
      ['+100 ABATES NA ARMA ATUAL (MAESTRIA)', () => {
        const id = run.armas[run.armaAtual].id;
        Estado.meta.maestria[id] = (Estado.meta.maestria[id] ?? 0) + 100;
        salvarMeta(Estado.meta);
      }],
      ['MALDIÇÃO ALEATÓRIA NESTE ANDAR', () => {
        const ids = ['labirinto', 'cegueira', 'pavio', 'trevas', 'perdido', 'fragil'];
        run.maldicao = ids[Math.floor(Math.random() * ids.length)];
      }],
      ['10 ITENS ALEATÓRIOS', () => {
        const livres = D.itens.filter((i) => !run.itens.includes(i.id));
        for (let k = 0; k < 10 && livres.length; k++) this.darItem((Phaser.Utils.Array.RemoveRandomElement(livres) as { id: string }).id, false);
        this.aviso('+10 ITENS');
      }],
      ['TIRAR TODOS OS ITENS', () => {
        run.itens = [];
        run.sinergias = [];
        run.stats = calcularStats(run, meta);
        run.chama = Math.min(run.chama, run.stats.chamaMax);
        jogo.atualizarAparencia();
        (jogo as unknown as { fx: { recarregarItens(): void } }).fx.recarregarItens();
        this.aviso('SEM ITENS');
      }],
      ['VER TODAS AS SINERGIAS', () => {
        meta.sinergiasVistas = D.sinergias.map((s) => s.id);
        salvarMeta(meta);
        this.aviso('SINERGIAS REVELADAS');
      }],
      ['LIBERAR CONQUISTAS', () => {
        meta.conquistas = D.conquistas.map((c) => c.id);
        run.abismo = true;
        salvarMeta(meta);
        this.aviso('CONQUISTAS LIBERADAS');
      }],
      ['ZERAR CONQUISTAS', () => {
        meta.conquistas = [];
        salvarMeta(meta);
        this.aviso('CONQUISTAS ZERADAS');
      }],
    ];
    for (const [rot, acao] of itens) {
      g.appendChild(this.botao(rot, () => {
        acao();
        if (this.aberto) this.desenhar();
      }));
    }
    return g;
  }

  // ===================== ações =====================

  private aviso(texto: string) {
    Estado.aviso = { texto, cor: '#ff9a2e', vida: 1.6 };
  }

  private darItem(id: string, mostrar = true) {
    if (Estado.run!.itens.includes(id)) return;
    this.jogo.pegarItem(id);
    // o jogo está pausado no menu: confere as sinergias já
    this.jogo.verificarSinergias();
    if (mostrar) this.desenhar();
  }

  private darArma(id: string) {
    const run = Estado.run!;
    if (run.armas.some((w) => w.id === id)) return;
    if (run.armas.length < D.config.maxArmas) {
      run.armas.push(novaArma(id));
      run.armaAtual = run.armas.length - 1;
    } else run.armas[run.armaAtual] = novaArma(id);
    this.jogo.jogador.recarregando = 0;
    this.jogo.anunciarArma(acharArma(id));
    this.jogo.verificarSinergias();
  }

  /** Solta o item um pouco à frente da vela (para pegar andando). */
  private noChao(tipo: 'item' | 'arma' | 'ativo', id: string) {
    const j = this.jogo.jogador;
    const x = Phaser.Math.Clamp(j.x + j.mira.x * 34, 24, 296);
    const y = Phaser.Math.Clamp(j.y + j.mira.y * 34, 40, 192);
    this.jogo.criarItemChao(tipo, id, x, y, true, { animar: true });
    this.aviso('NO CHÃO');
  }

  private criarMonstro(tipo: string, elite: boolean) {
    const jogo = this.jogo;
    const pos = jogo.posicaoLivre(jogo.jogador.x, jogo.jogador.y, 70);
    const ini = jogo.criarInimigo(tipo, pos.x, pos.y, elite);
    if (ini.ehChefe) {
      jogo.chefe = ini;
      Estado.chefe = { nome: ini.def.nome.toUpperCase(), vida: ini.vida, max: ini.vidaMax };
    }
    jogo.temInimigos = true;
    this.aviso(`${ini.def.nome.toUpperCase()}${elite ? ' ELITE' : ''}`);
  }

  private ativarSinergia(id: string) {
    const run = Estado.run!;
    const sg = D.sinergias.find((s) => s.id === id)!;
    if (sg.arma && !run.armas.some((w) => w.id === sg.arma)) this.darArma(sg.arma);
    for (const i of sg.itens) if (!run.itens.includes(i)) this.darItem(i, false);
    for (const [t, n] of Object.entries(sg.tags ?? {})) {
      const faltam = n - (contarTags(run.itens)[t] ?? 0);
      // prefere itens que só têm essa etiqueta em comum (os gerados)
      const opcoes = D.itens.filter((i) => i.tags?.includes(t) && !run.itens.includes(i.id)).sort((a, b) => Number(!!b.gerado) - Number(!!a.gerado));
      opcoes.slice(0, Math.max(0, faltam)).forEach((i) => this.darItem(i.id, false));
    }
    this.jogo.verificarSinergias();
    this.desenhar();
  }

  private irPara(no: NoSala) {
    this.fechar();
    Estado.masmorra!.marcarVisitada(no);
    this.jogo.entrarSala(no, null);
  }

  private irParaAndar(n: number) {
    const run = Estado.run!;
    run.andar = n - 1;
    run.abismo = true;
    run.outroLado = true;
    this.fechar();
    this.jogo.proximoAndar();
  }
}
