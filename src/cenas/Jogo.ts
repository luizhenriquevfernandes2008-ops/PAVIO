import Phaser from 'phaser';
import { TILE, COLS, ROWS, MUNDO_L, MUNDO_A, OY, ZOOM, CORES } from '../constantes';
import { D, ArmaDef, Mods, item, arma, ativo, infoAndar, raridade, marcos, personagem } from '../dados';
import { Estado, novaRun, novaArma, calcularStats, mostrarBanner, salvarMeta, avisar, popup, ArmaRun, checarConquista, bloqueado } from '../estado';
import { Masmorra, NoSala, Dir, OPOSTO } from '../sistemas/Masmorra';
import { modsDoTiro, aparenciaDosItens, especiais, sinergiaCompleta, contarTags, dicaDeEtiquetas } from '../sistemas/Itens';
import { Jogador } from '../entidades/Jogador';
import { Inimigo } from '../entidades/Inimigo';
import { totalQuadros } from '../arte/texturas';
import { aplicarAparencia, restaurarVela } from '../arte/aparencia';
import { Som, Faixa } from '../som';
import { Opcoes } from '../opcoes';
import { MenuDev } from '../dev';
import { MotorEfeitos } from '../sistemas/Efeitos';
import { salvarPartida, carregarPartida, apagarPartida, restaurarMasmorra, semear, dessemear, sementeDoDia } from '../sistemas/Salvar';
import { MALDICOES, RECOMPENSA_MALDICAO, sortearMaldicao, desafio, LIMITE_RELOGIO, novaSemente, nivelMaestria, SKINS, tintaSkin } from '../sistemas/Regras';
import { fundir, ehFusao } from '../sistemas/Fusao';

type Sprite = Phaser.Physics.Arcade.Sprite;
type Corpo = Phaser.Physics.Arcade.Body;
type TipoInterativo = 'castical' | 'bau' | 'loja_r' | 'loja_v' | 'loja_a' | 'loja_m' | 'loja_j' | 'saida' | 'fonte' | 'troca' | 'amigo' | 'estudio' | 'forja' | 'slot' | 'doacao';
type TipoItemChao = 'item' | 'arma' | 'municao' | 'vela' | 'ativo';

interface Interativo {
  tipo: TipoInterativo;
  x: number;
  y: number;
  spr: Sprite;
  item?: Phaser.GameObjects.Image;
}

interface ItemChao {
  tipo: TipoItemChao;
  id: string;
  img: Phaser.GameObjects.Image;
  base?: Phaser.GameObjects.Image; // pedestal embaixo (itens, ativos e armas)
}

interface Luz {
  x: number;
  y: number;
  r: number;
  t?: number;
  cor?: number;
}

interface Poca {
  x: number;
  y: number;
  r: number;
  tipo: 'veneno' | 'lama' | 'fogo';
  t: number;
  g: Phaser.GameObjects.Ellipse;
}

interface Torre {
  spr: Phaser.GameObjects.Sprite;
  t: number;
  tiro: number;
}

interface Espinho {
  img: Phaser.GameObjects.Image;
  r: number;
  c: number;
}

interface Acerto {
  empurrao: number;
  queima: boolean;
  veneno: boolean;
  congela: number;
  eletrico: number;
  explosao: number;
  fragmenta: number;
  mods?: Mods;
  x: number;
  y: number;
  semPopup?: boolean;
}

const CELULAS_PORTA: Record<Dir, [number, number][]> = {
  n: [[0, 9], [0, 10]],
  s: [[ROWS - 1, 9], [ROWS - 1, 10]],
  o: [[5, 0], [6, 0]],
  l: [[5, COLS - 1], [6, COLS - 1]],
};
const CHEGADA: Record<Dir, [number, number]> = {
  n: [MUNDO_L / 2, OY + 26],
  s: [MUNDO_L / 2, OY + ROWS * TILE - 26],
  o: [24, OY + 96],
  l: [MUNDO_L - 24, OY + 96],
};
const CHAO = '.^';

type Teclas = Record<
  | 'W' | 'A' | 'S' | 'D' | 'cima' | 'baixo' | 'esq' | 'dir' | 'atirar' | 'atirar2' | 'dash' | 'dash2' | 'dash3'
  | 'usar' | 'recarregar' | 'trocar' | 'um' | 'dois' | 'tres' | 'pausa' | 'pausa2' | 'mudo' | 'sair' | 'parry' | 'ativo',
  Phaser.Input.Keyboard.Key
>;

const hash = (a: number, b: number, c = 0) => {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const ARCO_IRIS = [0xff5a8a, 0xffd23f, 0x7fd7ff, 0x9cff6b, 0xb06bff];

export class Jogo extends Phaser.Scene {
  jogador!: Jogador;
  inimigos!: Phaser.Physics.Arcade.Group;
  private paredes!: Phaser.Physics.Arcade.StaticGroup;
  private caixotes!: Phaser.Physics.Arcade.StaticGroup;
  private portas!: Phaser.Physics.Arcade.StaticGroup;
  private solidos!: Phaser.Physics.Arcade.StaticGroup;
  private gotas!: Phaser.Physics.Arcade.Group;
  private projeteis!: Phaser.Physics.Arcade.Group; // dos inimigos
  private balas!: Phaser.Physics.Arcade.Group; // do jogador
  private decoracao!: Phaser.GameObjects.Group;
  private escuridao!: Phaser.GameObjects.RenderTexture;
  private brilho!: Phaser.GameObjects.RenderTexture;
  private efeitos!: Phaser.GameObjects.Graphics; // escudo
  private teclas!: Teclas;

  private interativos: Interativo[] = [];
  private itensChao: ItemChao[] = [];
  private luzesFixas: Luz[] = [];
  private flashes: Luz[] = [];
  private pocas: Poca[] = [];
  private espinhos: Espinho[] = [];
  private orbes: Phaser.GameObjects.Image[] = [];
  private gemeas: Phaser.GameObjects.Sprite[] = [];
  private escada: Phaser.GameObjects.Image | null = null;
  private chefe: Inimigo | null = null;
  private grade: string[][] = [];
  private transicionando = false;
  private temInimigos = false;
  private ondaExtra = false;
  private escurecerT = 0;
  private raioMorte = 999;
  private fimAgendado = false;
  private idBala = 0;
  private trocaPendente: ItemChao | null = null;
  private escalaTempo = 1;
  private lentoAte = 0;
  private ultimoMarco = 0;
  private desligarBatida: (() => void) | null = null;
  private aquecimento = 0; // gatling
  private escudoAtivo = false;
  private lentoJogador = 0;
  private venenoJogador = 0;
  private tiroGemea = 0;
  private danoOrbe = 0;
  private baseAlpha = 1;
  // itens ativos
  private furiaT = 0;
  private espelhoT = 0;
  private torres: Torre[] = [];
  private trocaAtivo: ItemChao | null = null;
  private semDanoChefe = false; // conquista "Intocável"
  private danoRachada = new Map<Dir, number>();
  private perigoT = 0; // relógio dos perigos de "O Outro Lado"
  private evento: 'apagao' | 'chuva' | 'tortas' | 'ladrao' | 'furia' | null = null; // evento surpresa da sala
  private eventoT = 0;
  private fatorTempo = 1; // Relógio Parado: monstros lentos (TIC) ou rápidos (TAC)
  // aura da vela: contorno brilhante, halo no chão e brasas girando (para nunca perder a vela de vista)
  private halo!: Phaser.GameObjects.Image;
  private brasas: Phaser.GameObjects.Image[] = [];
  private brilhoVela: Phaser.FX.Glow | null = null;
  private corAura = 0xffa040; // muda com a transformação (vale também para quem não é vela)
  private dev!: MenuDev;
  fx!: MotorEfeitos; // efeitos de itens (gatilhos, passivos, ativos compostos)
  private modo: 'novo' | 'continuar' | 'diario' | 'tutorial' | 'dupla' = 'novo';
  private desafioNovo: string | undefined; // desafio escolhido no menu
  private sementeNova: number | undefined; // semente digitada no menu
  private graficoT = 0; // relógio do gráfico da chama (resumo da partida)
  j2: Jogador | null = null; // jogador 2 (dupla)
  private teclas2!: Record<'atirar' | 'dash' | 'parry', Phaser.Input.Keyboard.Key>;
  private marcaJ2!: Phaser.GameObjects.Text;
  private tuto = { dashes: 0, parries: 0, ativo: false }; // contadores do tutorial
  private ultimaCausa = '';

  constructor() {
    super('Jogo');
  }

  /** Força do veneno (itens e sinergias). */
  get forcaVeneno() {
    return Estado.run?.stats.venenoForca ?? 1;
  }

  init(dados?: { modo?: 'novo' | 'continuar' | 'diario' | 'tutorial' | 'dupla'; desafio?: string; semente?: number }) {
    this.modo = dados?.modo ?? 'novo';
    this.desafioNovo = dados?.desafio;
    this.sementeNova = dados?.semente;
  }

  create() {
    // a cena é reaproveitada entre partidas: zera tudo
    this.interativos = [];
    this.itensChao = [];
    this.luzesFixas = [];
    this.flashes = [];
    this.pocas = [];
    this.espinhos = [];
    this.orbes = [];
    this.gemeas = [];
    this.escada = null;
    this.chefe = null;
    this.transicionando = false;
    this.ondaExtra = false;
    this.escurecerT = 0;
    this.raioMorte = 999;
    this.fimAgendado = false;
    this.trocaPendente = null;
    this.escalaTempo = 1;
    this.lentoAte = 0;
    this.ultimoMarco = 0;
    this.aquecimento = 0;
    this.lentoJogador = 0;
    this.venenoJogador = 0;
    this.baseAlpha = 1;
    this.furiaT = 0;
    this.espelhoT = 0;
    this.torres = [];
    this.trocaAtivo = null;
    this.danoRachada.clear();
    this.graficoT = 0;
    Estado.popups = [];
    Estado.pulso = 0;
    Estado.camaraLenta = false;

    const cam = this.cameras.main;
    cam.setZoom(ZOOM);
    cam.centerOn(MUNDO_L / 2, MUNDO_A / 2);
    cam.setBackgroundColor(CORES.fundo);

    this.decoracao = this.add.group();
    this.paredes = this.physics.add.staticGroup();
    this.caixotes = this.physics.add.staticGroup();
    this.portas = this.physics.add.staticGroup();
    this.solidos = this.physics.add.staticGroup();
    this.inimigos = this.physics.add.group();
    this.gotas = this.physics.add.group();
    this.projeteis = this.physics.add.group();
    this.balas = this.physics.add.group();

    // continuar do save, desafio diário (sorteio com a semente do dia) ou partida nova
    const save = this.modo === 'continuar' ? carregarPartida() : null;
    if (this.modo === 'diario') semear(sementeDoDia());
    let run: ReturnType<typeof novaRun>;
    if (save) {
      run = novaRun(save.run.modo);
      Object.assign(run, save.run);
      Estado.run = run;
      // armas fundidas na bigorna não existem nos dados: refaz na mesma ordem
      for (const f of run.fusoes ?? []) fundir(this, f.a, f.b);
      Estado.masmorra = restaurarMasmorra(save);
    } else {
      run = novaRun(this.modo === 'diario' ? 'diario' : this.modo === 'tutorial' ? 'tutorial' : 'normal');
      if (this.modo === 'dupla') {
        // jogador 2: personagem escolhido (ou a Velinha, se ainda estiver bloqueado)
        const p2 = bloqueado('personagem', Opcoes.personagem2) ? 'vela' : Opcoes.personagem2;
        run.coop = true;
        run.personagem2 = p2;
        run.armaP2 = personagem(p2).armas[0] ?? 'pistola';
      }
      if (run.modo === 'normal') {
        // toda partida normal tem uma semente (dá para jogar a mesma masmorra com um amigo)
        run.semente = this.sementeNova ?? novaSemente();
        if (this.desafioNovo) this.prepararDesafio(run, this.desafioNovo);
      }
      run.grafico = [];
      if (run.modo !== 'tutorial') {
        Estado.meta.partidas++;
        salvarMeta(Estado.meta);
        checarConquista('partidas', Estado.meta.partidas);
      }
    }
    this.ultimaCausa = '';
    Estado.instrucao = '';

    this.jogador = new Jogador(this, MUNDO_L / 2, OY + 104, run.personagem);
    this.jogador.dashCargas = run.stats.dashes;
    this.configurarColisoes();
    this.j2 = null;
    if (run.coop) this.criarJ2();
    this.criarAura();
    this.fx = new MotorEfeitos(this);
    // Pacifista: a TETE, a NIX e a YUUMI ficam com você a partida inteira
    if (run.desafio === 'pacifista') this.fx.bichinhos(true);

    this.escuridao = this.add.renderTexture(0, OY, MUNDO_L, ROWS * TILE).setOrigin(0).setDepth(5000);
    this.brilho = this.add.renderTexture(0, OY, MUNDO_L, ROWS * TILE).setOrigin(0).setDepth(5100).setBlendMode(Phaser.BlendModes.ADD);
    this.efeitos = this.add.graphics().setDepth(5200);
    // brilho (bloom) e vinheta na câmera: só no WebGL, e dá para desligar nas Opções
    if (Opcoes.brilho && this.renderer.type === Phaser.WEBGL) {
      cam.postFX.addBloom(0xffffff, 1, 1, 1, 1.1, 4);
      cam.postFX.addVignette(0.5, 0.5, 0.9, 0.3);
    }

    const kb = this.input.keyboard!;
    this.teclas = kb.addKeys({
      W: 'W', A: 'A', S: 'S', D: 'D', cima: 'UP', baixo: 'DOWN', esq: 'LEFT', dir: 'RIGHT',
      atirar: 'J', atirar2: 'Z', dash: 'SPACE', dash2: 'SHIFT', dash3: 'K', usar: 'E', recarregar: 'R',
      trocar: 'Q', um: 'ONE', dois: 'TWO', tres: 'THREE', pausa: 'ESC', pausa2: 'P', mudo: 'M', sair: 'X', parry: 'F', ativo: 'C',
    }) as Teclas;
    this.input.mouse?.disableContextMenu();
    this.input.setDefaultCursor('none');
    Estado.usandoMouse = true;
    this.input.on('pointermove', () => (Estado.usandoMouse = true));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      Estado.usandoMouse = true;
      if (p.rightButtonDown() && !Estado.pausado) this.tentarParry();
      if (p.middleButtonDown() && !Estado.pausado) this.usarAtivo();
    });
    this.input.on('wheel', (_p: unknown, _g: unknown, _dx: number, dy: number) => {
      if (!Estado.pausado) this.trocarArma(dy > 0 ? 1 : -1);
    });
    this.desligarBatida = Som.aoBater(() => (Estado.pulso = 1));
    // menu de desenvolvedor: F2 abre e fecha (ouvido direto na janela, porque com ele aberto o teclado do jogo fica desligado)
    this.dev = new MenuDev(this);
    Estado.dev = false;
    const teclaDev = (e: KeyboardEvent) => {
      if (e.code === 'F2' && (Opcoes.dev || this.dev.aberto)) {
        e.preventDefault();
        this.dev.alternar();
      } else if (e.code === 'Escape' && this.dev.aberto) this.dev.fechar();
    };
    window.addEventListener('keydown', teclaDev);
    // fechar a aba no meio da partida: salva antes
    const aoSair = () => salvarPartida();
    window.addEventListener('beforeunload', aoSair);
    const aoEsconder = () => document.visibilityState === 'hidden' && salvarPartida();
    document.addEventListener('visibilitychange', aoEsconder);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('beforeunload', aoSair);
      document.removeEventListener('visibilitychange', aoEsconder);
      dessemear();
      Estado.deus = false;
      window.removeEventListener('keydown', teclaDev);
      this.dev.destruir();
      this.input.setDefaultCursor('default');
      this.anims.globalTimeScale = 1;
      Som.intenso = false;
      this.desligarBatida?.();
      restaurarVela(this, this.jogador.personagem);
      this.scene.stop('HUD'); // o HUD nunca fica sobrando em outra tela
    });

    this.atualizarAparencia();
    this.fx.recarregarItens();
    if (save) {
      const m = Estado.masmorra!;
      this.entrarSala((save.sala && m.salas.get(save.sala)) || m.inicio, null);
      mostrarBanner('BEM-VINDO DE VOLTA', `${infoAndar(run.andar).nome} · a partida continua`, CORES.chama, 3);
    } else if (run.modo === 'tutorial') {
      Estado.deus = true;
      Estado.masmorra = Masmorra.tutorial();
      this.entrarSala(Estado.masmorra.inicio, null);
      mostrarBanner('TUTORIAL', 'Uma lição por sala. A porta abre quando você conseguir.', CORES.ouro, 4);
    } else {
      this.gerarAndar();
      if (run.coop) mostrarBanner('JOGANDO EM DUPLA', 'J2: controle, ou SETAS andam · L atira (mira sozinho) · K esquiva · J parry', '#ff8ac8', 6);
      else if (run.modo === 'diario') mostrarBanner('DESAFIO DIÁRIO', 'A mesma masmorra para todo mundo hoje. Boa sorte!', CORES.ouro, 5);
      else if (run.desafio) mostrarBanner(`DESAFIO: ${desafio(run.desafio)!.nome.toUpperCase()}`, desafio(run.desafio)!.desc, CORES.perigo, 6);
      else mostrarBanner(infoAndar(1).nome, 'MOUSE atira · ESPAÇO esquiva · CLIQUE DIREITO parry', CORES.chama, 5);
    }
    this.scene.launch('HUD');
    cam.fadeIn(400);
  }

  private criarAura() {
    this.halo = this.add.image(0, 0, 'luz').setBlendMode(Phaser.BlendModes.ADD).setDepth(2.5).setTint(0xffa040);
    this.brasas = [0, 1, 2].map(() => this.add.image(0, 0, 'pixel').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd27f).setScale(0.75));
    this.brilhoVela = this.renderer.type === Phaser.WEBGL ? this.jogador.preFX?.addGlow(0xffb43a, 1.5, 0, false, 0.1, 8) ?? null : null;
  }

  /** Halo no chão, brasas em órbita e contorno: pulsam com a música e ficam vermelhos com pouca chama. */
  private atualizarAura() {
    const j = this.jogador;
    const run = Estado.run!;
    const vivo = !j.morto;
    const frac = Phaser.Math.Clamp(run.chama / run.stats.chamaMax, 0, 1);
    const perigo = frac < 0.25;
    const t = this.time.now / 1000;
    const pulso = Estado.pulso;
    const cor = perigo ? 0xff4a2e : this.furiaT > 0 ? 0xff6a3a : this.corAura;
    const piscaPerigo = perigo ? 0.6 + 0.4 * Math.sin(t * 14) : 1;

    this.halo.setVisible(vivo).setPosition(j.x, j.y + 7).setTint(cor);
    this.halo.setScale(0.55 + pulso * 0.08, 0.2 + pulso * 0.03).setAlpha((0.45 + pulso * 0.3) * piscaPerigo * j.alpha);

    this.brasas.forEach((b, k) => {
      const a = t * 2.4 + (k / this.brasas.length) * Math.PI * 2;
      const sy = Math.sin(a);
      b.setVisible(vivo);
      b.setPosition(j.maoX + Math.cos(a) * 11, j.y - 2 + sy * 4 - Math.sin(t * 5 + k) * 1.5);
      // na frente da vela na metade de baixo da órbita, atrás na de cima
      b.setDepth(j.depth + (sy > 0 ? 0.6 : -0.6));
      b.setTint(perigo ? 0xff6a4a : 0xffd27f).setAlpha((0.55 + 0.45 * Math.sin(t * 9 + k * 2)) * j.alpha);
    });

    if (this.brilhoVela) {
      this.brilhoVela.color = cor;
      this.brilhoVela.outerStrength = vivo ? (1.8 + pulso * 2) * piscaPerigo : 0;
    }
  }

  // ===================== Jogador 2 (dupla) =====================

  private criarJ2() {
    const run = Estado.run!;
    const j2 = new Jogador(this, this.jogador.x + 16, this.jogador.y, run.personagem2 ?? 'ana');
    j2.dashCargas = run.stats.dashes;
    this.j2 = j2;
    const f = this.physics.add;
    f.collider(j2, [this.paredes, this.caixotes, this.portas, this.solidos]);
    f.overlap(j2, this.inimigos, (_a, b) => {
      const ini = b as Inimigo;
      if (ini.morto || ini.fase === 'surgindo') return;
      if (ini.def.ia === 'ladrao') return this.roubar(ini);
      if (j2.parryT > 0) return this.parryCorpoACorpo(ini);
      this.ultimaCausa = ini.def.nome;
      this.ferirJ2(ini.dano, ini.x, ini.y);
    });
    f.overlap(j2, this.projeteis, (_a, b) => {
      const pr = b as Sprite;
      if (j2.parryT > 0) return this.refletir(pr);
      if (j2.dashT > 0) return;
      this.ultimaCausa = 'balas';
      if (this.ferirJ2(pr.getData('dano') as number, pr.x, pr.y)) this.efeitoNoJogador(pr.getData('efeito'));
      this.estourarProjetil(pr);
    });
    f.overlap(j2, this.gotas, (_a, b) => this.coletarGota(b as Sprite));
    const kb = this.input.keyboard!;
    this.teclas2 = kb.addKeys({ atirar: 'L', dash: 'K', parry: 'J' }) as Record<'atirar' | 'dash' | 'parry', Phaser.Input.Keyboard.Key>;
    this.marcaJ2 = this.add.text(0, 0, 'J2', { fontFamily: 'monospace', fontSize: '24px', color: '#ff8ac8', stroke: '#1b1325', strokeThickness: 6 }).setScale(0.25).setOrigin(0.5).setDepth(5300);
  }

  /** Os monstros vão atrás de quem estiver mais perto. */
  alvoDe(ini: { x: number; y: number }) {
    const j2 = this.j2;
    if (!j2) return this.jogador;
    const d1 = Phaser.Math.Distance.Between(ini.x, ini.y, this.jogador.x, this.jogador.y);
    const d2 = Phaser.Math.Distance.Between(ini.x, ini.y, j2.x, j2.y);
    return d2 < d1 ? j2 : this.jogador;
  }

  /** Dano no jogador 2: a chama é a mesma dos dois. */
  private ferirJ2(dano: number, fx: number, fy: number) {
    const j2 = this.j2!;
    if (j2.invencivel > 0 || j2.dashT > 0 || this.transicionando || Estado.deus || this.jogador.morto) return false;
    const run = Estado.run!;
    dano *= run.stats.danoRecebido * (run.maldicao === 'fragil' ? 1.5 : 1);
    // Vela de Vidro: qualquer golpe apaga
    if (run.desafio === 'vidro') dano = Math.max(dano, run.chama + 1);
    run.chama -= dano;
    j2.invencivel = D.config.combate.invencivelAposDano;
    const d = new Phaser.Math.Vector2(j2.x - fx, j2.y - fy);
    if (d.lengthSq() < 0.01) d.set(0, 1);
    d.normalize();
    j2.setVelocity(d.x * 160, d.y * 160);
    j2.atordoado = 0.15;
    this.tremer(150, 0.008);
    Som.tocar('dano');
    j2.setTintFill(0xff4040);
    popup(j2.x, j2.y - 16, `-${Math.round(dano)}`, CORES.perigo, 16);
    if (run.chama <= 0) this.morrer();
    return true;
  }

  /** Controle (se tiver) ou teclado: setas andam, L atira (mira sozinho), K esquiva, J parry. */
  private atualizarJ2(dt: number, time: number) {
    const j2 = this.j2;
    if (!j2) return;
    const run = Estado.run!;
    const s = run.stats;
    j2.invencivel -= dt;
    j2.dashT -= dt;
    j2.tiroRecarga -= dt;
    j2.parryT -= dt;
    j2.parryRecarga -= dt;
    j2.atordoado -= dt;
    if (j2.dashCargas < s.dashes) {
      j2.dashRecarga += dt;
      if (j2.dashRecarga >= s.cooldownDash) {
        j2.dashCargas++;
        j2.dashRecarga = 0;
      }
    }
    const pad = this.input.gamepad?.pad1;
    const k = this.teclas;
    const JD = Phaser.Input.Keyboard.JustDown;
    // movimento
    const mov = new Phaser.Math.Vector2();
    if (pad && (Math.abs(pad.leftStick.x) > 0.2 || Math.abs(pad.leftStick.y) > 0.2)) mov.set(pad.leftStick.x, pad.leftStick.y);
    else mov.set((k.dir.isDown ? 1 : 0) - (k.esq.isDown ? 1 : 0), (k.baixo.isDown ? 1 : 0) - (k.cima.isDown ? 1 : 0));
    const andando = mov.lengthSq() > 0.04;
    if (andando) mov.normalize();
    // mira: analógico direito; senão, mira sozinho no monstro mais perto
    let mirando = false;
    if (pad && (Math.abs(pad.rightStick.x) > 0.3 || Math.abs(pad.rightStick.y) > 0.3)) {
      j2.mira.set(pad.rightStick.x, pad.rightStick.y).normalize();
      mirando = true;
    } else {
      let alvo: Inimigo | null = null;
      let melhor = 999;
      for (const ini of this.listaInimigos()) {
        if (ini.morto || ini.fase === 'surgindo' || ini.intangivel) continue;
        const d = Phaser.Math.Distance.Between(j2.x, j2.y, ini.x, ini.y);
        if (d < melhor) {
          melhor = d;
          alvo = ini;
        }
      }
      if (alvo) j2.mira.set(alvo.x - j2.maoX, alvo.y - j2.maoY).normalize();
      else if (andando) j2.mira.copy(mov);
    }
    // botões
    const dash = (pad && pad.A && !this.padA && (this.padA = true)) || JD(this.teclas2.dash);
    if (pad && !pad.A) this.padA = false;
    const parry = (pad && pad.B && !this.padB && (this.padB = true)) || JD(this.teclas2.parry);
    if (pad && !pad.B) this.padB = false;
    const atirando = this.teclas2.atirar.isDown || (pad ? pad.R2 > 0.3 || mirando : false);
    if (dash && j2.dashCargas > 0 && j2.dashT <= 0) {
      j2.dashCargas--;
      j2.dashT = D.config.combate.duracaoDash;
      j2.dashDir.copy(andando ? mov : j2.mira).normalize();
      Som.tocar('dash');
    }
    if (parry && j2.parryRecarga <= 0) {
      j2.parryT = D.config.parry.janela + s.janelaParry;
      j2.parryRecarga = D.config.parry.recarga;
      Som.tocar('parryTentativa');
      this.anelLuz(j2.maoX, j2.maoY, 0xffe066, 16);
    }
    if (j2.parryT > 0) {
      for (const obj of this.projeteis.getChildren().slice()) {
        const pr = obj as Sprite;
        if (Phaser.Math.Distance.Between(pr.x, pr.y, j2.maoX, j2.maoY) < D.config.parry.raio) this.refletir(pr);
      }
    }
    // tiro: arma própria, munição infinita, todos os itens valem
    const def = arma(run.armaP2 ?? 'pistola');
    if (atirando && j2.tiroRecarga <= 0 && j2.dashT <= 0) {
      j2.tiroRecarga = (def.cadencia * s.cadencia) / this.fx.mult('cadencia');
      this.disparar(def, modsDoTiro(run.itens, def.id), j2);
    }
    // movimento
    if (j2.dashT > 0) j2.setVelocity(j2.dashDir.x * D.config.combate.velocidadeDash, j2.dashDir.y * D.config.combate.velocidadeDash);
    else if (j2.atordoado > 0 || j2.coice > 0) j2.body.velocity.scale(Math.pow(0.02, dt));
    else {
      const vel = s.velocidade * this.lentidaoPoca() * this.fx.mult('velocidade');
      j2.setVelocity(mov.x * vel, mov.y * vel);
    }
    j2.coice -= dt;
    j2.play(andando ? j2.animAndar : j2.animParado, true);
    j2.setAlpha(j2.invencivel > 0 ? (Math.floor(time / 60) % 2 ? 0.35 : 1) : 1);
    if (j2.invencivel <= 0.55) j2.clearTint();
    j2.setDepth(10 + j2.y);
    j2.atualizarArma(def.sprite);
    this.aplicarSkin(j2.arma, def.id);
    this.marcaJ2.setPosition(j2.x, j2.y - j2.displayHeight - 4).setAlpha(0.7 + 0.3 * Math.sin(time / 200));
    // o jogador 2 também atravessa as portas
    const cx = j2.body.center.x;
    const cy = j2.body.center.y;
    if (cx < 4) this.mudarSala('o');
    else if (cx > MUNDO_L - 4) this.mudarSala('l');
    else if (cy < OY + 4) this.mudarSala('n');
    else if (cy > MUNDO_A - 4) this.mudarSala('s');
  }

  private padA = false;
  private padB = false;

  private configurarColisoes() {
    const j = this.jogador;
    const f = this.physics.add;
    const solidos = [this.paredes, this.caixotes, this.portas, this.solidos];
    f.collider(j, solidos);
    f.collider(this.inimigos, solidos, undefined, (ini) => !(ini as Inimigo).atravessa);
    f.collider(this.inimigos, this.inimigos);
    f.collider(this.gotas, solidos);
    f.collider(this.projeteis, solidos, (p) => {
      const ps = p as Sprite;
      const quica = ps.getData('quica') as number | undefined;
      if (quica) {
        ps.setData('quica', quica - 1);
        return;
      }
      this.estourarProjetil(ps);
    });
    // balas espectrais atravessam tudo; as outras batem, quicam ou quebram caixotes
    const naoEspectral = (b: unknown) => !(b as Sprite).getData('espectral');
    f.collider(this.balas, [this.paredes, this.portas, this.solidos], (b, w) => this.balaNaParede(b as Sprite, w as Sprite), naoEspectral);
    f.collider(this.balas, this.caixotes, (b, c) => this.balaNoCaixote(b as Sprite, c as Sprite), naoEspectral);
    f.overlap(j, this.inimigos, (_a, b) => this.contato(b as Inimigo));
    f.overlap(j, this.projeteis, (_a, b) => {
      const p = b as Sprite;
      if (this.jogador.parryT > 0) {
        this.refletir(p);
        return;
      }
      if (this.jogador.dashT > 0) return;
      this.ultimaCausa = p.getData('mina') !== undefined ? 'uma mina' : p.getData('efeito') === 'veneno' ? 'balas de veneno' : 'balas';
      if (this.ferirJogador(p.getData('dano') as number, p.x, p.y)) this.efeitoNoJogador(p.getData('efeito'));
      this.estourarProjetil(p);
    });
    f.overlap(j, this.gotas, (_a, b) => this.coletarGota(b as Sprite));
  }

  // ===================== Andares e salas =====================

  private gerarAndar() {
    const run = Estado.run!;
    // com semente, cada andar sai igual para quem usar o mesmo código
    if (run.semente !== undefined && run.modo === 'normal') semear(run.semente * 101 + run.andar);
    run.maldicao = sortearMaldicao(run);
    const total = Math.min(40, Math.round(infoAndar(run.andar).salas * (run.maldicao === 'labirinto' ? 1.6 : 1)));
    const m = run.desafio === 'chefoes' ? Masmorra.soChefe(run.andar) : new Masmorra(run.andar, total);
    Estado.masmorra = m;
    if (run.maldicao === 'trevas') for (const no of m.salas.values()) if (no.tipo !== 'inicio') no.escura = true;
    // Corujinha: o mapa do andar inteiro aparece
    if (this.fx.tem('familiar_coruja')) for (const no of m.salas.values()) if (no.tipo !== 'secreta') no.conhecida = true;
    this.entrarSala(m.inicio, null);
    const mal = run.maldicao ? MALDICOES[run.maldicao] : null;
    if (mal) {
      this.time.delayedCall(3600, () => {
        if (Estado.run !== run) return;
        mostrarBanner(mal.nome.toUpperCase(), `${mal.desc} ${RECOMPENSA_MALDICAO}`, '#c86bff', 4.5);
        Som.tocar('chefeRugido');
        this.piscar(120, 40, 160, 260);
      });
    }
  }

  /** Menu dev: transforma a sala atual numa Forja ou num Cassino. */
  irParaSalaTeste(tipo: 'forja' | 'cassino') {
    const no = Estado.sala!;
    Object.assign(no, { tipo, template: D.salas[tipo][0], limpa: true, comprado: {}, usos: 0, itensChao: [], escura: false });
    this.entrarSala(no, null);
  }

  /** Regras do desafio escolhido (só numa partida nova). */
  private prepararDesafio(run: NonNullable<typeof Estado.run>, id: string) {
    run.desafio = id;
    if (id === 'so_tete') {
      run.armas = [novaArma('tete')];
      run.armaAtual = 0;
    }
    if (id === 'pavio_curto') {
      // 3 itens raros sorteados (liberados, sem malditos)
      const opcoes = D.itens.filter((i) => i.raridade === 3 && !i.exclusivo && !i.maldito && !bloqueado('item', i.id) && !run.itens.includes(i.id));
      for (let k = 0; k < 3 && opcoes.length; k++) {
        const it = opcoes.splice(Math.floor(Math.random() * opcoes.length), 1)[0];
        run.itens.push(it.id);
        run.reservadas.push(it.id);
      }
    }
    run.stats = calcularStats(run, Estado.meta);
    run.chama = run.stats.chamaMax;
  }

  private get tinta() {
    const run = Estado.run!;
    return Phaser.Display.Color.HexStringToColor(run.estudio ? '#c8b0ff' : infoAndar(run.andar).tinta).color;
  }

  private entrarSala(no: NoSala, chegada: Dir | null) {
    for (const g of [this.decoracao, this.paredes, this.caixotes, this.portas, this.solidos, this.inimigos, this.gotas, this.projeteis, this.balas]) {
      g.clear(true, true);
    }
    this.itensChao.forEach((r) => {
      r.img.destroy();
      r.base?.destroy();
    });
    this.pocas.forEach((p) => p.g.destroy());
    this.espinhos.forEach((e) => e.img.destroy());
    this.torres.forEach((t) => t.spr.destroy());
    this.torres = [];
    this.fx?.limparSala();
    this.itensChao = [];
    this.pocas = [];
    this.espinhos = [];
    this.interativos = [];
    this.trocaAtivo = null;
    this.danoRachada.clear();
    this.luzesFixas = [];
    this.flashes = [];
    this.escada = null;
    this.chefe = null;
    this.trocaPendente = null;
    Estado.chefe = null;
    Estado.prompt = '';
    this.escudoAtivo = especiais(Estado.run!.itens).escudo;

    const m = Estado.masmorra!;
    const run = Estado.run!;
    const primeiraVez = !no.visitada;
    Estado.sala = no;
    m.marcarVisitada(no);
    const portas = m.portasVisiveis(no);
    // passagens secretas fechadas: continuam parede, mas rachada (tiros e explosões abrem)
    const rachadas = new Map<string, Dir>();
    for (const d of m.portas(no)) if (m.escondida(no, d)) for (const [r, c] of CELULAS_PORTA[d]) rachadas.set(`${r},${c}`, d);

    const g = no.template.mapa.map((l) => l.split(''));
    for (const d of portas) for (const [r, c] of CELULAS_PORTA[d]) g[r][c] = '.';
    for (const k of no.quebrados) {
      const [r, c] = k.split(',').map(Number);
      g[r][c] = '.';
    }
    this.grade = g;
    const tinta = this.tinta;
    const nPiso = totalQuadros(this, 'piso');
    const nParede = totalQuadros(this, 'parede');

    const aCriar: [string, number, number][] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ch = g[r][c];
        const x = c * TILE + 8;
        const y = OY + r * TILE + 8;
        const h = hash(r + no.gx * 31, c + no.gy * 17, run.andar);
        if (ch === '#') {
          const frame = nParede > 1 && h > 0.9 ? 1 + (Math.floor(h * 1000) % (nParede - 1)) : 0;
          const parede = (this.paredes.create(x, y, 'parede', frame) as Sprite).setDepth(1).setTint(tinta);
          const dirSecreta = rachadas.get(`${r},${c}`);
          if (dirSecreta) {
            parede.setData('secreta', dirSecreta);
            this.decoracao.add(this.add.image(x, y, 'rachadura').setDepth(1.2));
          }
          continue;
        }
        this.decoracao.add(this.add.image(x, y, 'piso', Math.floor(h * 997) % nPiso).setDepth(0).setTint(tinta));
        switch (ch) {
          case 'o': {
            const cx = this.solidoBase(this.caixotes, x, y, 'caixote', 0, 16, 16);
            cx.setData({ vida: 3, cel: `${r},${c}` });
            break;
          }
          case 'p':
            this.solidoBase(this.paredes, x, y, 'coluna', 0, 16, 16).setTint(tinta);
            break;
          case '^': {
            const img = this.add.image(x, y, 'espinhos', 0).setDepth(0.5);
            this.espinhos.push({ img, r, c });
            break;
          }
          case 'C': {
            const s = this.solidoBase(this.solidos, x, y, 'castical', no.casticalAceso ? 1 : 0, 10, 8);
            if (no.casticalAceso) {
              s.play('castical_aceso');
              this.luzesFixas.push({ x, y: y - 6, r: 64 });
            } else this.interativos.push({ tipo: 'castical', x, y, spr: s });
            break;
          }
          case 'T': {
            // baú das salas de descanso
            const s = this.solidoBase(this.solidos, x, y, 'bau', 0, 14, 10);
            if (no.comprado.T) s.setFrame(totalQuadros(this, 'bau') - 1);
            else {
              this.interativos.push({ tipo: 'bau', x, y, spr: s });
              this.luzesFixas.push({ x, y, r: 18 });
            }
            break;
          }
          case 'J':
            // item ativo grátis no pedestal (tesouro e sala secreta); na loja é pago
            if (no.tipo === 'loja') {
              this.criarPedestal(no, ch, x, y);
              break;
            }
            this.solidoBase(this.solidos, x, y, 'pedestal', 0, 12, 8);
            if (!no.comprado.J) {
              if (no.ativoPedestal === null) no.ativoPedestal = this.sortearAtivo();
              if (no.ativoPedestal) this.criarItemChao('ativo', no.ativoPedestal, x, y - 8, false, { pedestal: false }).img.setData('pedestal', true);
            }
            break;
          case 'F': {
            // Fonte dos Desejos
            const temFonte = this.anims.exists('fonte');
            const f = this.solidoBase(this.solidos, x, y, temFonte ? 'fonte' : 'castical', 0, 14, 8);
            if (temFonte) f.play('fonte');
            f.setTint(0x9fe0ff);
            this.interativos.push({ tipo: 'fonte', x, y, spr: f });
            this.luzesFixas.push({ x, y: y - 6, r: 40 });
            break;
          }
          case 'Q': {
            // Altar da Troca
            const a = this.solidoBase(this.solidos, x, y, 'pedestal', 0, 12, 8).setTint(0xc86bff).setScale(1.4);
            if (!no.comprado.Q) {
              this.interativos.push({ tipo: 'troca', x, y, spr: a });
              this.luzesFixas.push({ x, y: y - 6, r: 36 });
            }
            break;
          }
          case 'Z': {
            // um amigo: Luiz, Ana ou Henrique (nunca o próprio personagem)
            if (!no.amigo) {
              const amigos = ['luiz', 'ana', 'henrique'].filter((a) => a !== run.personagem && this.textures.exists(`pers_${a}`));
              no.amigo = amigos[Math.floor(Math.random() * amigos.length)] ?? 'luiz';
            }
            const npc = this.solidoBase(this.solidos, x, y, `pers_${no.amigo}`, 0, 10, 6);
            if (this.anims.exists(`heroi_${no.amigo}_parado`)) npc.play(`heroi_${no.amigo}_parado`);
            this.interativos.push({ tipo: 'amigo', x, y, spr: npc });
            this.luzesFixas.push({ x, y: y - 8, r: 44 });
            break;
          }
          case 'B': {
            // Forja: a bigorna que funde duas armas
            const b = this.solidoBase(this.solidos, x, y, 'bigorna', 0, 14, 8).setScale(1.3);
            if (!no.comprado.B) {
              this.interativos.push({ tipo: 'forja', x, y, spr: b });
              this.luzesFixas.push({ x, y: y - 4, r: 44 });
            }
            break;
          }
          case 'S': {
            // Cassino: caça-níquel
            const m = this.solidoBase(this.solidos, x, y, 'caca_niquel', 0, 14, 8).setScale(1.4);
            this.interativos.push({ tipo: 'slot', x, y, spr: m });
            this.luzesFixas.push({ x, y: y - 8, r: 44 });
            break;
          }
          case 'D': {
            // Cassino: máquina de doação
            const m = this.solidoBase(this.solidos, x, y, 'maquina_doacao', 0, 10, 8).setScale(1.4);
            this.interativos.push({ tipo: 'doacao', x, y, spr: m });
            this.luzesFixas.push({ x, y: y - 8, r: 30 });
            break;
          }
          case 'G':
            // monte de cera da sala secreta
            if (!no.comprado.G) {
              no.comprado.G = true;
              this.time.delayedCall(300, () => Estado.sala === no && this.soltarCera(x, y, 9));
            }
            break;
          case 'I':
            this.solidoBase(this.solidos, x, y, 'pedestal', 0, 12, 8);
            if (!no.comprado.I) {
              if (no.itemTesouro === null) no.itemTesouro = this.sortearItem(1);
              if (no.itemTesouro) this.criarItemChao('item', no.itemTesouro, x, y - 8, false, { pedestal: false }).img.setData('pedestal', true);
            }
            break;
          case 'R':
          case 'V':
          case 'A':
          case 'M':
            this.criarPedestal(no, ch, x, y);
            break;
          case 'X':
            if (!no.limpa) aCriar.push([no.chefe ?? infoAndar(run.andar).chefe, c, r]);
            break;
        }
      }
    }
    if (!no.limpa) for (const [tipo, c, r] of no.template.inimigos ?? []) aCriar.push([tipo, c, r]);
    // itens que ficaram no chão desta sala
    for (const it of no.itensChao) this.criarItemChao(it.tipo, it.id, it.x, it.y, false);

    this.decorar(no);
    this.marcarDesafios(no, portas);
    this.perigoT = 0;
    this.evento = null;
    if (primeiraVez && !no.limpa && no.tipo === 'combate' && run.modo !== 'tutorial' && Math.random() < 0.14) this.time.delayedCall(700, () => Estado.sala === no && this.iniciarEvento());
    if (infoAndar(run.andar).perigo === 'mar' && !no.limpa) {
      for (let k = 0; k < 3; k++) {
        const pos = this.posicaoLivre(MUNDO_L / 2, OY + 104, 50);
        this.criarPoca(pos.x, pos.y, 18, 'lama', 999);
      }
    }
    if (no.escadaAberta) this.criarEscada(false);
    if (no.comprado.saida) this.criarSaida(false);
    if (no.comprado.estudio) this.criarPortaEstudio(false);
    this.ondaExtra = !no.limpa && no.tipo === 'combate' && Math.random() < D.config.combate.chanceSegundaOnda;

    const [px, py] = chegada ? CHEGADA[chegada] : [MUNDO_L / 2, OY + 104];
    this.jogador.setPosition(px, py);
    this.jogador.setVelocity(0, 0);
    if (this.j2) {
      this.j2.setPosition(px + (px > MUNDO_L / 2 ? -16 : 16), py + 4);
      this.j2.setVelocity(0, 0);
    }
    this.posicionarFamiliares();

    for (const [tipo, c, r] of aCriar) {
      const ini = this.criarInimigo(tipo, c * TILE + 8, OY + r * TILE + 8, this.sortearElite(tipo));
      if (ini.ehChefe) this.chefe = ini;
    }
    this.semDanoChefe = !!this.chefe;
    if (!no.limpa && aCriar.length) this.fx.evento('sala', { x: this.jogador.x, y: this.jogador.y });
    this.temInimigos = aCriar.length > 0;
    if (!this.temInimigos && no.tipo !== 'tutorial') no.limpa = true;
    if (no.tipo === 'tutorial') this.licao(no);

    if (!no.limpa) {
      for (const d of portas) {
        for (const [r, c] of CELULAS_PORTA[d]) (this.portas.create(c * TILE + 8, OY + r * TILE + 8, 'porta') as Sprite).setDepth(2);
      }
    }

    this.escuridao.setVisible(no.escura);
    if (this.chefe) {
      Estado.chefe = { nome: this.chefe.def.nome.toUpperCase(), vida: this.chefe.vida, max: this.chefe.vidaMax };
      Som.tocar('chefeRugido');
      // o chefe fala quando você entra
      const fala = this.chefe.def.falas?.inicio;
      mostrarBanner(this.chefe.def.nome.toUpperCase(), fala ? `"${fala}"` : this.chefe.def.desc, CORES.perigo, fala ? 4 : 3);
      this.tremer(500, 0.006);
    } else if (no.tipo === 'loja' && primeiraVez) mostrarBanner('LOJA', 'Troque cera por armas e itens.', '#7fdc8a', 2.5);
    else if (no.tipo === 'descanso' && primeiraVez) mostrarBanner('DESCANSO', 'Nenhum monstro aqui. Tem um baú.', '#9fd0ff', 2.5);
    else if (no.tipo === 'fonte' && primeiraVez) mostrarBanner('FONTE DOS DESEJOS', 'Jogue cera e torça. Pode vir coisa boa... ou não.', '#7fd7ff', 3);
    else if (no.tipo === 'troca' && primeiraVez) mostrarBanner('ALTAR DA TROCA', 'Deixe um item seu e leve um mais raro.', '#c86bff', 3);
    else if (no.tipo === 'forja' && primeiraVez) mostrarBanner('A FORJA', 'A bigorna junta a sua arma atual com a próxima numa só.', '#ff7a3d', 3.5);
    else if (no.tipo === 'cassino' && primeiraVez) mostrarBanner('CASSINO', 'Tente a sorte... ou doe para as velinhas.', '#ff5a7a', 3);
    else if (no.tipo === 'amigo' && primeiraVez && no.amigo) {
      mostrarBanner(personagem(no.amigo).nome.toUpperCase(), 'Ei! Vem cá, tenho uma coisa para você.', personagem(no.amigo).cor, 3);
      Som.tocar('reliquia');
    } else if (no.tipo === 'secreta' && primeiraVez) {
      mostrarBanner('SALA SECRETA!', 'As paredes guardavam isto.', '#c86bff', 3);
      Som.tocar('reliquia');
      checarConquista('secreta');
    } else if (no.tipo === 'desafio' && !no.limpa && primeiraVez) {
      mostrarBanner('DESAFIO!', `Vença ${D.config.desafio.ondas} ondas. O prêmio é raro.`, CORES.perigo, 3);
      this.piscar(255, 40, 60, 160);
    }
    else if (no.intensidade > 1.2 && primeiraVez && !no.limpa) mostrarBanner('EMBOSCADA!', 'Muitos olhos no escuro...', CORES.perigo, 2);
    else if (no.escura && primeiraVez && !no.limpa) mostrarBanner('', 'Uma sala escura... sua chama é a única luz.', CORES.textoApagado, 2.2);
    this.tocarMusica(no);
    salvarPartida();
  }

  /** Música do andar no combate; uma mais calma na loja, tesouro e castiçal; metal no chefe. */
  private tocarMusica(no: NoSala) {
    const run = Estado.run!;
    let faixa: Faixa;
    if ((no.tipo === 'chefe' || no.tipo === 'desafio') && !no.limpa) faixa = 'chefe';
    else if (['loja', 'tesouro', 'castical', 'descanso', 'secreta', 'fonte', 'troca', 'amigo', 'forja', 'cassino'].includes(no.tipo)) faixa = 'calmo';
    else faixa = infoAndar(run.andar).musica as Faixa;
    Som.musica(faixa);
  }

  /** Portas que levam a uma sala de desafio ganham caveiras vermelhas dos lados. */
  private marcarDesafios(no: NoSala, portas: Dir[]) {
    const m = Estado.masmorra!;
    const lados: Record<Dir, [number, number][]> = {
      n: [[0, 8], [0, 11]], s: [[ROWS - 1, 8], [ROWS - 1, 11]], o: [[4, 0], [7, 0]], l: [[4, COLS - 1], [7, COLS - 1]],
    };
    for (const d of portas) {
      const v = m.vizinho(no, d);
      if (!v || v.tipo !== 'desafio' || v.limpa) continue;
      for (const [r, c] of lados[d]) {
        const x = c * TILE + 8;
        const y = OY + r * TILE + 8;
        const chave = this.textures.exists('caveira') ? 'caveira' : 'gota';
        this.decoracao.add(this.add.image(x, y, chave).setDepth(1.5).setTint(0xff4050));
        this.luzesFixas.push({ x, y, r: 16 });
      }
    }
  }

  /** Saída de luz: termina a partida vencendo (no lugar de descer mais). */
  private criarSaida(animar: boolean) {
    const x = MUNDO_L / 2 - 56;
    const y = OY + 120;
    const s = this.solidoBase(this.solidos, x, y, 'portal_luz', 0, 10, 6);
    s.setAlpha(animar ? 0 : 1);
    if (animar) this.tweens.add({ targets: s, alpha: 1, duration: 600 });
    this.interativos.push({ tipo: 'saida', x, y, spr: s });
    this.luzesFixas.push({ x, y: y - 6, r: 44 });
  }

  /** Porta do Estúdio (chefe secreto). */
  private criarPortaEstudio(animar: boolean) {
    const x = MUNDO_L / 2 + 56;
    const y = OY + 120;
    const s = this.solidoBase(this.solidos, x, y, 'portal_luz', 0, 10, 6).setTint(0x7fdc8a);
    if (animar) {
      s.setAlpha(0);
      this.tweens.add({ targets: s, alpha: 1, duration: 800 });
    }
    this.interativos.push({ tipo: 'estudio', x, y, spr: s });
    this.luzesFixas.push({ x, y: y - 6, r: 44 });
  }

  private irParaEstudio() {
    if (this.transicionando) return;
    this.transicionando = true;
    this.jogador.setVelocity(0, 0);
    Som.tocar('escada');
    const cam = this.cameras.main;
    cam.fadeOut(900, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      Estado.run!.estudio = true;
      Estado.masmorra = Masmorra.estudio();
      this.faseCriador = 1;
      this.entrarSala(Estado.masmorra.inicio, null);
      cam.fadeIn(900, 0, 0, 0);
      this.transicionando = false;
    });
  }

  private faseCriador = 1;
  private debugT = 0;

  /** As regras mudam no meio da luta contra O Criador. */
  private regrasDoCriador(dt: number) {
    const b = this.chefe;
    if (!b || b.tipo !== 'criador' || b.morto) return;
    const frac = b.vida / b.vidaMax;
    if (this.faseCriador === 1 && frac < 0.66) {
      this.faseCriador = 2;
      mostrarBanner('MODO DEBUG', '"Deixa eu mudar umas regrinhas... a sua arma agora troca sozinha."', '#7fdc8a', 4);
      this.escuridao.setVisible(true);
      this.piscar(127, 220, 138, 300);
      this.debugT = 0;
    }
    if (this.faseCriador === 2 || this.faseCriador === 3) {
      this.debugT += dt;
      if (this.debugT > 6) {
        this.debugT = 0;
        this.fx.executar(['trocarArma', {}], { x: this.jogador.x, y: this.jogador.y });
        popup(this.jogador.x, this.jogador.y - 26, 'PATCH!', '#7fdc8a', 16);
      }
    }
    if (this.faseCriador === 2 && frac < 0.33) {
      this.faseCriador = 3;
      mostrarBanner('PATCH FINAL', '"Tá bom, tá bom... os bichinhos vieram te ajudar."', '#7fdc8a', 4);
      this.escuridao.setVisible(false);
      this.fx.bichinhos();
      Som.tocar('latido');
      this.time.delayedCall(250, () => Som.tocar('miau'));
      this.time.delayedCall(500, () => Som.tocar('miau'));
    }
  }

  private criarEscada(animar: boolean) {
    this.escada = this.add.image(MUNDO_L / 2, OY + 120, 'escada').setDepth(2).setAlpha(animar ? 0 : 1);
    this.decoracao.add(this.escada);
    if (animar) this.tweens.add({ targets: this.escada, alpha: 1, duration: 600 });
  }

  /** Estandartes, fontes e caveiras do pack (só se existirem). */
  private decorar(no: NoSala) {
    const run = Estado.run!;
    if (this.textures.exists('estandarte')) {
      const n = totalQuadros(this, 'estandarte');
      for (const c of [3, 6, 13, 16]) {
        const h = hash(no.gx, no.gy * 7 + c, run.andar);
        if (h < 0.45) this.decoracao.add(this.add.image(c * TILE + 8, OY + 8, 'estandarte', Math.floor(h * 100) % n).setDepth(1.5));
      }
    }
    if (no.tipo === 'castical' && this.anims.exists('fonte')) {
      for (const c of [4, 15]) this.decoracao.add(this.add.sprite(c * TILE + 8, OY + 8, 'fonte').play('fonte').setDepth(1.5));
    }
    if (this.textures.exists('caveira')) {
      for (let k = 0; k < 3; k++) {
        const h = hash(no.gx * 13 + k, no.gy * 3, run.andar + 5);
        if (h > 0.5) continue;
        const c = 2 + (Math.floor(h * 1000) % (COLS - 4));
        const r = 2 + (Math.floor(h * 10000) % (ROWS - 4));
        if (this.grade[r][c] === '.') this.decoracao.add(this.add.image(c * TILE + 8, OY + r * TILE + 8, 'caveira').setDepth(0.5).setAlpha(0.8));
      }
    }
  }

  /** Objeto sólido apoiado na base do tile, com colisão só no pé (w x h). */
  private solidoBase(grupo: Phaser.Physics.Arcade.StaticGroup, x: number, y: number, chave: string, frame: number, w: number, h: number) {
    const s = grupo.create(x, y + 8, chave, frame) as Sprite;
    s.setOrigin(0.5, 1);
    const body = s.body as Phaser.Physics.Arcade.StaticBody;
    body.updateFromGameObject();
    body.setSize(w, h, false);
    body.setOffset((s.frame.realWidth - w) / 2, s.frame.realHeight - h);
    s.setDepth(10 + y);
    return s;
  }

  private criarPedestal(no: NoSala, ch: string, x: number, y: number) {
    const s = this.solidoBase(this.solidos, x, y, 'pedestal', 0, 12, 8);
    if (no.comprado[ch]) return;
    let img: Phaser.GameObjects.Image;
    let tipo: TipoInterativo;
    if (ch === 'R') {
      if (no.itemLoja === null) no.itemLoja = this.sortearItem(1);
      if (!no.itemLoja) return;
      img = this.add.image(x, y - 7, `icone_${no.itemLoja}`);
      tipo = 'loja_r';
    } else if (ch === 'A') {
      if (no.armaLoja === null) no.armaLoja = this.sortearArma();
      if (!no.armaLoja) return;
      img = this.add.image(x, y - 6, arma(no.armaLoja).sprite);
      tipo = 'loja_a';
    } else if (ch === 'M') {
      img = this.add.image(x, y - 6, 'caixa_municao');
      tipo = 'loja_m';
    } else if (ch === 'J') {
      if (no.ativoLoja === null) no.ativoLoja = this.sortearAtivo();
      if (!no.ativoLoja) return;
      img = this.add.image(x, y - 7, `icone_${no.ativoLoja}`);
      tipo = 'loja_j';
    } else {
      img = this.add.image(x, y - 6, 'vela_item');
      tipo = 'loja_v';
    }
    this.luzesFixas.push({ x, y: y - 6, r: 28 });
    img.setDepth(10 + y + 1);
    this.decoracao.add(img);
    this.tweens.add({ targets: img, y: img.y - 3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.interativos.push({ tipo, x, y, spr: s, item: img });
  }

  private mudarSala(dir: Dir) {
    if (this.transicionando) return;
    const destino = Estado.masmorra!.vizinho(Estado.sala!, dir);
    if (!destino) return;
    this.transicionando = true;
    this.jogador.setVelocity(0, 0);
    const cam = this.cameras.main;
    cam.fadeOut(110, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.entrarSala(destino, OPOSTO[dir]);
      cam.fadeIn(160, 0, 0, 0);
      this.transicionando = false;
    });
  }

  private proximoAndar() {
    if (this.transicionando) return;
    if (Estado.run!.modo === 'tutorial') return this.fimDoTutorial();
    this.transicionando = true;
    this.jogador.setVelocity(0, 0);
    Som.tocar('escada');
    const cam = this.cameras.main;
    cam.fadeOut(600, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const run = Estado.run!;
      run.andar++;
      this.gerarAndar();
      const info = infoAndar(run.andar);
      const sub = info.capitulo === 1 ? `Andar ${run.andar} de ${D.config.andares}`
        : info.capitulo === 2 ? 'Onde nem O Apagador tinha coragem de ir.'
        : info.capitulo === 3 ? info.descricao ?? ''
        : 'Modo infinito: até onde vai a sua chama?';
      const corAndar = info.capitulo === 3 ? '#ffd0a0' : info.capitulo > 1 ? '#c86bff' : CORES.chama;
      mostrarBanner(info.nome, sub, corAndar, 3.5);
      checarConquista('andar', run.andar);
      cam.fadeIn(600, 0, 0, 0);
      this.transicionando = false;
    });
  }

  // ===================== Loop =====================

  update(time: number, delta: number) {
    // fim da câmera lenta (contada em tempo real)
    if (this.escalaTempo < 1 && performance.now() > this.lentoAte) this.aplicarEscala(1);
    const dtReal = Math.min(delta / 1000, 0.05);
    const dt = dtReal * this.escalaTempo;
    Estado.pulso = Math.max(0, Estado.pulso - dtReal * 4);
    const k = this.teclas;
    const JD = Phaser.Input.Keyboard.JustDown;

    if (Estado.dev) return; // menu de desenvolvedor aberto: tudo parado
    if (JD(k.pausa) || JD(k.pausa2)) this.alternarPausa();
    if (JD(k.mudo)) Som.alternarMudo();
    if (Estado.pausado) {
      if (JD(k.sair)) this.sairParaMenu();
      return;
    }

    const run = Estado.run!;
    const s = run.stats;
    const cfg = D.config.combate;
    const j = this.jogador;

    if (j.morto || this.transicionando) {
      if (!j.morto) j.setVelocity(0, 0);
      this.atualizarAura();
      this.atualizarBalas(dt);
      this.desenharEscuridao(dt);
      return;
    }

    run.tempo += dt;
    j.invencivel -= dt;
    j.dashT -= dt;
    j.tiroRecarga -= dt;
    j.coice -= dt;
    j.atordoado -= dt;
    j.parryT -= dt;
    j.parryRecarga -= dt;
    this.lentoJogador -= dt;
    this.venenoJogador -= dt;
    this.furiaT -= dt;
    this.espelhoT -= dt;
    // Espelho de Mão: parry ligado o tempo todo
    if (this.espelhoT > 0) {
      j.parryT = Math.max(j.parryT, 0.05);
      j.refletidas = 0;
    }
    Estado.parryPronto = Phaser.Math.Clamp(1 - j.parryRecarga / D.config.parry.recarga, 0, 1);
    this.escurecerT -= dt;
    run.comboT -= dt;
    if (run.comboT <= 0) {
      run.combo = 0;
      this.ultimoMarco = 0;
    }
    const frenesi = run.combo >= D.config.frenesi.combo;
    Som.intenso = frenesi;
    if (j.dashCargas < s.dashes) {
      j.dashRecarga += dt;
      if (j.dashRecarga >= s.cooldownDash) {
        j.dashCargas++;
        j.dashRecarga = 0;
      }
    }
    this.atualizarRecarga(dt);

    // ---- entrada: movimento ----
    const mx = (k.D.isDown ? 1 : 0) - (k.A.isDown ? 1 : 0);
    const my = (k.S.isDown ? 1 : 0) - (k.W.isDown ? 1 : 0);
    const mov = new Phaser.Math.Vector2(mx, my);
    const andando = mov.lengthSq() > 0;
    if (andando) mov.normalize();

    // ---- entrada: mira (mouse ou setas) ----
    const ax = (k.dir.isDown ? 1 : 0) - (k.esq.isDown ? 1 : 0);
    const ay = (k.baixo.isDown ? 1 : 0) - (k.cima.isDown ? 1 : 0);
    const setas = !this.j2 && (ax !== 0 || ay !== 0);
    if (setas) {
      Estado.usandoMouse = false;
      j.mira.set(ax, ay).normalize();
    } else if (Estado.usandoMouse) {
      const p = this.input.activePointer;
      p.updateWorldPoint(this.cameras.main);
      const d = new Phaser.Math.Vector2(p.worldX - j.maoX, p.worldY - j.maoY);
      if (d.lengthSq() > 4) j.mira.copy(d.normalize());
    } else if (andando) {
      j.mira.copy(mov);
    }

    // ---- ações ----
    if (JD(k.dash) || JD(k.dash2) || (!this.j2 && JD(k.dash3))) this.tentarDash(andando ? mov : j.mira.clone());
    if (JD(k.parry)) this.tentarParry();
    this.atualizarJ2(dt, time);
    if (JD(k.ativo)) this.usarAtivo();
    if (JD(k.recarregar)) this.recarregar();
    if (JD(k.trocar)) this.trocarArma(1);
    if (JD(k.um)) this.selecionarArma(0);
    if (JD(k.dois)) this.selecionarArma(1);
    if (JD(k.tres)) this.selecionarArma(2);
    const mouseAtirando = this.input.activePointer.leftButtonDown() && Estado.usandoMouse;
    const atirando = mouseAtirando || setas || (!this.j2 && k.atirar.isDown) || k.atirar2.isDown;
    if (atirando) this.atirar();
    // a gatling esquenta enquanto atira e esfria parada
    const def = arma(this.armaAtual.id);
    if (def.aquecimento) this.aquecimento = Phaser.Math.Clamp(this.aquecimento + (atirando ? dt / def.aquecimento : -dt * 1.5), 0, 1);

    // ---- movimento ----
    const lento = this.lentoJogador > 0 ? 0.55 : 1;
    if (j.dashT > 0) {
      j.setVelocity(j.dashDir.x * cfg.velocidadeDash, j.dashDir.y * cfg.velocidadeDash);
      j.rastroT -= dt;
      if (j.rastroT <= 0) {
        j.rastroT = 0.02;
        this.fantasma(0x7fd7ff, 0.6);
      }
    } else if (j.atordoado > 0) {
      j.body.velocity.scale(Math.pow(0.01, dt));
    } else if (j.coice > 0) {
      j.body.velocity.scale(Math.pow(0.02, dt));
    } else {
      const vel = s.velocidade * (frenesi ? D.config.frenesi.velocidade : 1) * lento * this.lentidaoPoca() * this.fx.mult('velocidade');
      j.setVelocity(mov.x * vel, mov.y * vel);
    }
    if ((frenesi || this.furiaT > 0) && andando && j.dashT <= 0) {
      j.fantasmaT -= dt;
      if (j.fantasmaT <= 0) {
        j.fantasmaT = 0.05;
        this.fantasma(this.furiaT > 0 ? 0xff4a2e : 0xffd23f, 0.35);
      }
    }
    j.play(andando ? j.animAndar : j.animParado, true);
    j.setAlpha(this.baseAlpha * (j.invencivel > 0 ? (Math.floor(time / 60) % 2 ? 0.35 : 1) : 1));
    if (j.invencivel <= 0.55) {
      if (lento < 1) j.setTint(0x9fdcff);
      else if (this.venenoJogador > 0) j.setTint(0xa8ff8a);
      else j.clearTint();
    }
    j.setDepth(10 + j.y);
    j.atualizarArma(def.sprite);
    this.aplicarSkin(j.arma, def.id);
    this.atualizarAura();

    // ---- a chama queima sozinha (e o veneno queima mais) ----
    run.chama -= s.decaimento * (run.maldicao === 'pavio' ? 2 : 1) * dt + (this.venenoJogador > 0 ? 3 * dt : 0);
    if (Estado.deus) run.chama = s.chamaMax;
    // Contra o Relógio: passou do tempo, apaga
    if (run.desafio === 'relogio' && run.tempo > LIMITE_RELOGIO && !Estado.deus) {
      this.ultimaCausa = 'o relógio';
      run.chama = 0;
    }
    // resumo da partida: a chama ao longo do tempo e o momento em que quase apagou
    this.graficoT += dt;
    if (this.graficoT >= 3) {
      this.graficoT = 0;
      const g = (run.grafico ??= []);
      g.push(Math.max(0, Math.round((run.chama / s.chamaMax) * 100)));
      if (g.length > 400) run.grafico = g.filter((_, k) => k % 2 === 0);
    }
    const pct = (run.chama / s.chamaMax) * 100;
    if (pct > 0 && (!run.quase || pct < run.quase.pct)) run.quase = { pct: Math.round(pct * 10) / 10, tempo: run.tempo, andar: run.andar };
    if (run.chama <= 0) {
      if (!this.ultimaCausa || this.venenoJogador > 0) this.ultimaCausa = this.venenoJogador > 0 ? 'veneno' : 'a chama acabou sozinha';
      this.morrer();
      return;
    }

    // ---- inimigos ----
    this.atualizarPerigo(dt);
    this.atualizarEvento(dt);
    this.regrasDoCriador(dt);
    const ritmoSala = this.fatorTempo * (this.evento === 'furia' ? 1.3 : 1);
    for (const ini of this.listaInimigos()) {
      ini.atualizar(dt * ritmoSala, this);
      if (ini.morto) continue;
      if (ini.vida <= 0) {
        this.matarInimigo(ini);
        continue;
      }
      ini.setDepth(10 + ini.y);
      this.destravarInimigo(ini, dt);
    }
    if (this.chefe && Estado.chefe) Estado.chefe.vida = Math.max(0, this.chefe.vida);
    if (this.chefe && !this.chefe.furiaAnunciada && this.chefe.def.ia !== 'chefe_padrao' && this.chefe.vida < this.chefe.vidaMax * 0.5) {
      this.chefe.furiaAnunciada = true;
      this.anunciarFuria(this.chefe);
    }

    if (j.parryT > 0) this.verificarParry();
    if (j.dashT > 0 && !j.raspou) this.verificarEsquiva();
    this.atualizarBalas(dt);
    this.atualizarProjeteis(dt);
    this.atualizarFamiliares(dt);
    this.atualizarTorres(dt);
    this.fx.atualizar(dt);
    if (j.dashT > 0) this.fx.duranteDash();
    this.atualizarEspinhos();
    this.atualizarPocas(dt);
    this.emitirPopups();

    // ---- gotas de cera atraídas pela vela ----
    const sala = Estado.sala!;
    const raioIma = 50 + s.ima * 120;
    for (const obj of this.gotas.getChildren()) {
      const g = obj as Sprite;
      const t = (g.getData('t') as number) + dt;
      g.setData('t', t);
      if (t < 0.3) continue;
      const d = Phaser.Math.Distance.Between(g.x, g.y, j.x, j.y + 4);
      if (d < raioIma || sala.limpa) {
        const v = new Phaser.Math.Vector2(j.x - g.x, j.y + 4 - g.y).normalize().scale(sala.limpa ? 230 : 170);
        g.setDrag(0, 0);
        g.setVelocity(v.x, v.y);
      }
    }

    this.verificarItensChao();

    // ---- sala limpa? (ou mais uma onda) ----
    if (!sala.limpa && this.temInimigos && this.inimigos.countActive(true) === 0) {
      if (sala.tipo === 'desafio' && sala.ondas > 0) this.ondaDesafio();
      else if (this.ondaExtra) this.novaOnda();
      else this.salaLimpa();
    }

    this.verificarInteracoes(JD(k.usar));
    if (run.modo === 'tutorial') this.atualizarTutorial();

    if (this.escada && sala.limpa && Phaser.Math.Distance.Between(this.escada.x, this.escada.y, j.x, j.y + 4) < 9) this.proximoAndar();

    // ---- saídas pelas portas ----
    const cx = j.body.center.x;
    const cy = j.body.center.y;
    if (cx < 4) this.mudarSala('o');
    else if (cx > MUNDO_L - 4) this.mudarSala('l');
    else if (cy < OY + 4) this.mudarSala('n');
    else if (cy > MUNDO_A - 4) this.mudarSala('s');

    this.desenharEfeitos();
    this.desenharEscuridao(dt);
  }

  private listaInimigos() {
    return this.inimigos.getChildren().slice() as Inimigo[];
  }

  /** O perigo de cada andar de "O Outro Lado" (só nas salas com monstros). */
  private atualizarPerigo(dt: number) {
    const perigo = infoAndar(Estado.run!.andar).perigo;
    const sala = Estado.sala!;
    this.fatorTempo = 1;
    if (!perigo || sala.limpa || !this.temInimigos) return;
    this.perigoT += dt;
    const j = this.jogador;
    switch (perigo) {
      case 'cinzas':
        // brasas caem do céu perto de você (com aviso no chão)
        if (this.perigoT > 1.1) {
          this.perigoT = 0;
          const x = Phaser.Math.Clamp(j.x + (Math.random() - 0.5) * 140, 24, MUNDO_L - 24);
          const y = Phaser.Math.Clamp(j.y + (Math.random() - 0.5) * 100, OY + 24, MUNDO_A - 24);
          this.marcaAlvo(x, y, 14, 800);
          this.time.delayedCall(800, () => !j.morto && Estado.sala === sala && this.explosaoInimiga(x, y, 14, 10));
        }
        break;
      case 'tempo': {
        // ciclo de 7s: normal, TIC (monstros quase parados), TAC (monstros acelerados)
        const c = this.perigoT % 7;
        const antes = (this.perigoT - dt) % 7;
        if (c >= 2 && antes < 2) popup(j.x, j.y - 26, 'TIC', '#9fd0ff', 24);
        if (c >= 3.5 && antes < 3.5) popup(j.x, j.y - 26, 'TAC', '#ff4a2e', 24);
        this.fatorTempo = c >= 2 && c < 3.5 ? 0.2 : c >= 3.5 && c < 5 ? 1.7 : 1;
        break;
      }
      case 'mar':
        // uma onda de balas atravessa a sala de uma parede à outra
        if (this.perigoT > 8) {
          this.perigoT = 0;
          const esquerda = Math.random() < 0.5;
          this.paredeDeBalas(esquerda ? 10 : MUNDO_L - 10, OY + 96, esquerda ? 0 : Math.PI, 70, 12);
          mostrarBanner('', 'UMA ONDA!', '#7fb8ff', 1);
        }
        break;
    }
  }

  /** Monstro preso numa parede ou fora da sala por mais de 1,5s volta para um lugar livre. */
  private destravarInimigo(ini: Inimigo, dt: number) {
    if (!ini.body?.enable || ini.fase === 'surgindo' || ini.atravessa) return;
    const c = Math.floor(ini.body.center.x / TILE);
    const r = Math.floor((ini.body.center.y - OY) / TILE);
    const preso = r < 1 || r > ROWS - 2 || c < 1 || c > COLS - 2 || !CHAO.includes(this.grade[r]?.[c] ?? '#');
    const t = preso ? ((ini.getData('presoT') as number) ?? 0) + dt : 0;
    ini.setData('presoT', t);
    if (t < 1.5) return;
    const pos = this.posicaoLivre(this.jogador.x, this.jogador.y, 60);
    ini.setPosition(pos.x, pos.y);
    ini.body.reset(pos.x, pos.y);
    ini.setData('presoT', 0);
    this.faiscas(pos.x, pos.y, 0xb06bff, 8);
  }

  contarInimigos(tipo: string) {
    return this.listaInimigos().filter((i) => i.tipo === tipo && !i.morto).length;
  }

  // ===================== Armas =====================

  private get armaAtual(): ArmaRun {
    const run = Estado.run!;
    return run.armas[run.armaAtual];
  }

  private penteMax(def: ArmaDef) {
    return Math.max(1, Math.round(def.pente * Estado.run!.stats.pente));
  }

  private atirar() {
    const j = this.jogador;
    const run = Estado.run!;
    const s = run.stats;
    const a = this.armaAtual;
    const def = arma(a.id);
    if (run.desafio === 'pacifista') return; // você não atira: os bichinhos lutam
    if (j.recarregando > 0 || j.tiroRecarga > 0 || j.dashT > 0) return;
    if (a.pente <= 0) {
      if (a.reserva === 0) {
        Som.tocar('semMunicao');
        avisar('SEM MUNIÇÃO! Troque de arma (Q)', CORES.perigo);
        j.tiroRecarga = 0.3;
      } else this.recarregar();
      return;
    }
    const mods = modsDoTiro(run.itens, a.id);
    a.pente--;
    const frenesi = run.combo >= D.config.frenesi.combo ? D.config.frenesi.cadencia : 1;
    const esquentando = def.aquecimento && !mods.semAquecimento ? 1 + 3 * (1 - this.aquecimento) : 1;
    j.tiroRecarga = (def.cadencia * s.cadencia * frenesi * esquentando * (this.furiaT > 0 ? 0.6 : 1)) / this.fx.mult('cadencia');
    this.disparar(def, mods);
    this.fx.evento('tiro', { x: j.maoX, y: j.maoY });
    if (mods.duploTiro && Math.random() < mods.duploTiro) this.time.delayedCall(70, () => !j.morto && this.disparar(def, mods));
    if (a.pente === 0 && a.reserva !== 0) this.recarregar();
  }

  /** Sai o tiro (sem gastar munição): projéteis, clarão, cartucho, coice. */
  private disparar(def: ArmaDef, mods: Mods, atirador?: Jogador) {
    const j = atirador ?? this.jogador;
    const s = Estado.run!.stats;
    const ang0 = j.mira.angle();
    const bx = j.maoX + Math.cos(ang0) * 11;
    const by = j.maoY + 1 + Math.sin(ang0) * 11;
    const dano = def.dano * s.dano * (this.furiaT > 0 ? 2 : 1) * this.fx.mult('dano');

    if (mods.laser) {
      const n = 1 + (mods.multiplos ?? 0);
      for (let i = 0; i < n; i++) this.laser(bx, by, ang0 + (i - (n - 1) / 2) * 0.12, def, mods, dano);
    } else {
      const total = def.projeteis + (mods.multiplos ?? 0);
      const espalhada = def.projeteis > 1;
      const abertura = espalhada ? def.dispersao + (mods.multiplos ?? 0) * 6 : 10 * (total - 1);
      for (let i = 0; i < total; i++) {
        let ang = ang0 + Phaser.Math.DegToRad((Math.random() - 0.5) * def.dispersao);
        if (total > 1) ang = ang0 + Phaser.Math.DegToRad(abertura * (i / (total - 1) - 0.5) + (Math.random() - 0.5) * (espalhada ? 6 : def.dispersao));
        const velBase = def.velocidade * (mods.velBala ?? 1);
        const vel = velBase * (espalhada ? 0.85 + Math.random() * 0.3 : 1);
        const vida = ((def.alcance * s.alcance) / velBase) * (espalhada ? 0.8 + Math.random() * 0.4 : 1);
        this.criarBala(bx, by, ang, vel, vida, def, mods, dano);
      }
      for (let i = 0; i < (mods.traseiro ?? 0); i++) {
        const vel = def.velocidade * (mods.velBala ?? 1);
        this.criarBala(j.maoX, j.maoY, ang0 + Math.PI, vel, (def.alcance * s.alcance) / vel, def, mods, dano);
      }
    }

    this.fx.aoDisparar(bx, by, ang0, def, mods, dano);
    // clarão do cano, cartucho, coice e tremida
    if (def.bala !== 'chama') {
      const clarao = this.add.image(bx, by, 'clarao').setRotation(ang0).setDepth(4600).setScale(def.projeteis > 1 ? 1.4 : 1);
      this.tweens.add({ targets: clarao, alpha: 0, scale: 0.3, duration: 70, onComplete: () => clarao.destroy() });
      this.flashes.push({ x: bx, y: by, r: def.projeteis > 1 ? 46 : 32, t: 0.05, cor: this.cor(def.cor) });
      if (def.bala !== 'granada' && def.bala !== 'orbe' && !mods.laser) this.cartucho(j.maoX, j.maoY);
    }
    if (def.recuo) {
      j.coice = 0.08;
      j.setVelocity(-Math.cos(ang0) * def.recuo, -Math.sin(ang0) * def.recuo);
    }
    this.tremer(60, def.tremor);
    // a TETE late baixinho a cada tiro (o latido alto fica para quando ela aparece)
    Som.tocar(def.som === 'latido' ? 'latidoTiro' : def.som);
  }

  private criarBala(x: number, y: number, ang: number, vel: number, vida: number, def: ArmaDef, mods: Mods, dano: number, fragmento = false) {
    const textura = fragmento ? 'chumbo' : def.bala;
    const b = this.balas.create(x, y, textura) as Sprite;
    const body = b.body as Corpo;
    const tam = (mods.tamanho ?? 1) * (fragmento ? 0.8 : 1);
    const r = textura === 'chumbo' ? 1.5 : textura === 'bala_grande' || textura === 'orbe' || textura === 'latido' || textura === 'miau' ? 3 : 2;
    body.setCircle(r, b.width / 2 - r, b.height / 2 - r);
    const cor = def.id === 'vela_romana' ? Phaser.Utils.Array.GetRandom(ARCO_IRIS) : this.cor(def.cor);
    if (textura !== 'granada' && textura !== 'orbe') b.setTint(cor);
    b.setRotation(textura === 'latido' || textura === 'miau' ? 0 : ang);
    b.setDepth(4500);
    // balas viram traçantes esticadas na direção do tiro
    if (['bala', 'chumbo', 'bala_grande'].includes(textura)) b.setScale(2.2 * tam, tam);
    else b.setScale(tam);
    b.setVelocity(Math.cos(ang) * vel, Math.sin(ang) * vel);
    const espelho = infoAndar(Estado.run!.andar).perigo === 'espelho';
    const ricochete = fragmento ? 0 : (mods.ricochete ?? 0) + (espelho ? 1 : 0);
    if (ricochete > 0) b.setBounce(1);
    const bumerangue = !fragmento && !!mods.bumerangue;
    b.setData({
      id: ++this.idBala,
      dano: dano * (fragmento ? 0.5 : 1),
      vida: bumerangue ? vida * 2 : vida,
      vidaTotal: vida,
      vel,
      perfura: mods.perfura ?? 0,
      explosao: fragmento ? (mods.fragmentoExplode ? 10 : 0) : mods.explosao ?? 0,
      queima: !!mods.queima || Estado.run!.stats.queimar > 0,
      veneno: !!mods.veneno,
      congela: mods.congela ?? 0,
      eletrico: fragmento ? 0 : mods.eletrico ?? 0,
      fragmenta: fragmento ? 0 : mods.fragmenta ?? 0,
      teleguiado: mods.teleguiado ?? 0,
      ricochete,
      espectral: !!mods.espectral,
      bumerangue,
      voltando: false,
      atrator: !fragmento && !!mods.atrator,
      empurrao: def.empurrao * Estado.run!.stats.empurrao,
      chama: textura === 'chama',
      girar: textura === 'serra' || textura === 'orbe',
      reto: textura === 'latido' || textura === 'miau', // texto ("AU!", "MIAU") fica em pé
      cor,
      mods,
      arma: def.id,
      tam,
    });
    if (textura === 'chama') {
      b.setBlendMode(Phaser.BlendModes.ADD).setScale(0.5 * tam);
      this.tweens.add({ targets: b, scale: 2 * tam, alpha: 0.2, duration: vida * 1000 });
    }
    return b;
  }

  /** Laser: instantâneo, atravessa inimigos e para na parede. */
  private laser(x: number, y: number, ang: number, def: ArmaDef, mods: Mods, dano: number) {
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const alcance = def.alcance * Estado.run!.stats.alcance;
    let fim = alcance;
    for (let d = 4; d < alcance; d += 3) {
      const c = Math.floor((x + dx * d) / TILE);
      const r = Math.floor((y + dy * d - OY) / TILE);
      const ch = this.grade[r]?.[c];
      if (ch === undefined || ((ch === '#' || ch === 'p' || ch === 'o') && !mods.espectral)) {
        fim = d;
        break;
      }
    }
    const fx = x + dx * fim;
    const fy = y + dy * fim;
    const acertados = this.listaInimigos().filter((ini) => {
      if (ini.morto || ini.fase === 'surgindo' || ini.intangivel) return false;
      const t = Phaser.Math.Clamp((ini.x - x) * dx + (ini.y - y) * dy, 0, fim);
      return Phaser.Math.Distance.Between(x + dx * t, y + dy * t, ini.x, ini.y) < ini.displayWidth * 0.4 + 3 * (mods.tamanho ?? 1);
    });
    for (const ini of acertados) {
      this.aplicarAcerto(ini, dano, new Phaser.Math.Vector2(dx, dy), {
        empurrao: def.empurrao, queima: !!mods.queima, veneno: !!mods.veneno, congela: mods.congela ?? 0,
        eletrico: mods.eletrico ?? 0, explosao: mods.explosao ?? 0, fragmenta: 0, mods, x: ini.x, y: ini.y,
      });
    }
    // feixe grosso colorido com miolo branco
    const g = this.add.graphics().setDepth(5200).setBlendMode(Phaser.BlendModes.ADD);
    const cor = this.cor(def.cor);
    g.lineStyle(4 * (mods.tamanho ?? 1), cor, 0.8).lineBetween(x, y, fx, fy);
    g.lineStyle(1.5, 0xffffff, 1).lineBetween(x, y, fx, fy);
    this.tweens.add({ targets: g, alpha: 0, duration: 160, onComplete: () => g.destroy() });
    for (let d = 0; d < fim; d += 24) this.flashes.push({ x: x + dx * d, y: y + dy * d, r: 20, t: 0.08, cor });
    this.faiscas(fx, fy, cor, 5);
  }

  private atualizarBalas(dt: number) {
    const inimigos = this.listaInimigos();
    const j = this.jogador;
    for (const obj of this.balas.getChildren().slice()) {
      const b = obj as Sprite;
      const body = b.body as Corpo;
      const vida = (b.getData('vida') as number) - dt;
      b.setData('vida', vida);
      if (vida <= 0) {
        this.fimDaBala(b);
        continue;
      }
      const vel = b.getData('vel') as number;
      // teleguiada: curva em direção ao monstro mais perto
      const tele = b.getData('teleguiado') as number;
      if (tele > 0 && !b.getData('voltando')) {
        let alvo: Inimigo | null = null;
        let melhor = 150;
        for (const ini of inimigos) {
          if (ini.morto || ini.fase === 'surgindo') continue;
          const d = Phaser.Math.Distance.Between(b.x, b.y, ini.x, ini.y);
          if (d < melhor) {
            melhor = d;
            alvo = ini;
          }
        }
        if (alvo) {
          const atual = Math.atan2(body.velocity.y, body.velocity.x);
          const desejado = Math.atan2(alvo.y - b.y, alvo.x - b.x);
          const novo = Phaser.Math.Angle.RotateTo(atual, desejado, tele * 2 * dt);
          body.velocity.setToPolar(novo, body.velocity.length());
        }
      }
      // bumerangue: passada a metade do caminho, volta para a vela
      if (b.getData('bumerangue')) {
        const passou = (b.getData('vidaTotal') as number) * 2 - vida;
        if (!b.getData('voltando') && passou > (b.getData('vidaTotal') as number) * 0.5) {
          b.setData('voltando', true);
          b.setData('id', ++this.idBala); // pode acertar de novo na volta
        }
        if (b.getData('voltando')) {
          body.velocity.setToPolar(Math.atan2(j.y - b.y, j.x - b.x), vel * 1.1);
          if (Phaser.Math.Distance.Between(b.x, b.y, j.x, j.y) < 10) {
            b.destroy();
            continue;
          }
        }
      }
      // buraco negro: puxa monstros e engole balas inimigas
      if (b.getData('atrator')) {
        for (const ini of inimigos) {
          if (ini.morto || ini.ehChefe) continue;
          const d = Phaser.Math.Distance.Between(b.x, b.y, ini.x, ini.y);
          if (d < 90 && d > 4) ini.body.velocity.add(new Phaser.Math.Vector2(b.x - ini.x, b.y - ini.y).normalize().scale(160 * (1 - d / 90) + 40));
        }
        for (const p of this.projeteis.getChildren().slice()) {
          const ps = p as Sprite;
          if (Phaser.Math.Distance.Between(b.x, b.y, ps.x, ps.y) < 30) this.estourarProjetil(ps);
        }
      }
      if (b.getData('girar')) b.rotation += dt * 14;
      else if (b.getData('reto')) b.setScale((b.getData('tam') as number) * (1 + Math.sin(b.getData('vida') * 30) * 0.12));
      else if (body.velocity.lengthSq() > 1) b.setRotation(Math.atan2(body.velocity.y, body.velocity.x));
      if (b.x < -10 || b.x > MUNDO_L + 10 || b.y < OY - 10 || b.y > MUNDO_A + 10) {
        b.destroy();
        continue;
      }
      // acerto no desenho do monstro (o corpo físico fica só nos pés)
      const raio = 2 * (b.getData('tam') as number);
      for (const ini of inimigos) {
        if (ini.morto || ini.fase === 'surgindo') continue;
        if (Math.abs(b.x - ini.x) < ini.displayWidth * 0.38 + raio && Math.abs(b.y - ini.y) < ini.displayHeight * 0.42 + raio) {
          this.balaAcertou(b, ini);
          if (!b.active) break;
        }
      }
    }
  }

  /** A bala acabou o alcance: explode, se fragmenta ou só some. */
  private fimDaBala(b: Sprite) {
    if (!b.active) return;
    if (b.getData('explosao')) this.explodir(b.x, b.y, b.getData('explosao'), b.getData('dano'), b.getData('mods'));
    if (b.getData('fragmenta')) this.fragmentar(b);
    b.destroy();
  }

  private balaNaParede(b: Sprite, parede?: Sprite) {
    if (!b.active) return;
    if (parede?.getData('secreta')) this.racharParede(parede.getData('secreta') as Dir, b.getData('dano') as number);
    const ric = b.getData('ricochete') as number;
    if (ric > 0) {
      b.setData('ricochete', ric - 1);
      this.faiscas(b.x, b.y, b.getData('cor'), 2);
      Som.tocar('impacto');
      return; // a física já refletiu a velocidade (bounce = 1)
    }
    if (b.getData('explosao')) this.explodir(b.x, b.y, b.getData('explosao'), b.getData('dano'), b.getData('mods'));
    else if (!b.getData('chama')) {
      this.faiscas(b.x, b.y, 0xffd27f, 2);
      Som.tocar('impacto');
    }
    if (b.getData('bumerangue') && !b.getData('voltando')) {
      b.setData('voltando', true);
      return;
    }
    b.destroy();
  }

  private balaNoCaixote(b: Sprite, cx: Sprite) {
    if (!b.active) return;
    this.danificarCaixote(cx, 1);
    this.balaNaParede(b);
  }

  private balaAcertou(b: Sprite, ini: Inimigo) {
    if (!b.active || ini.morto || ini.fase === 'surgindo' || ini.intangivel) return;
    const id = b.getData('id') as number;
    if (ini.atingidoPor.has(id)) return;
    ini.atingidoPor.add(id);
    const dir = (b.body as Corpo).velocity.clone().normalize();

    // o Pavio Negro dá parry: enquanto o anel dele brilha, seus tiros voltam para você
    if (ini.refletindo > 0) {
      const ang = Math.atan2(this.jogador.y - ini.y, this.jogador.x - ini.x) + (Math.random() - 0.5) * 0.3;
      this.criarProjetil(b.x, b.y, ang, 150, Math.round(ini.def.projetil?.dano ?? 12), false);
      this.faiscas(b.x, b.y, 0xb06bff, 4);
      if (Math.random() < 0.25) Som.tocar('parry');
      b.destroy();
      return;
    }

    // o escudeiro bloqueia tiros que vêm de frente (o escudo gira devagar: dá para flanquear)
    if (ini.def.ia === 'escudo' && ini.escudoVida > 0 && ini.congelado <= 0 && ini.sub !== 'tranco' && !this.fx.tem('haki')) {
      const frente = new Phaser.Math.Vector2(Math.cos(ini.escudoAng), Math.sin(ini.escudoAng));
      if (dir.dot(frente) < -0.4) {
        const dano = b.getData('dano') as number;
        ini.escudoVida -= dano;
        this.faiscas(b.x, b.y, 0xcfd8dc, 4);
        Som.tocar('impacto');
        if (ini.escudoVida <= 0) {
          // escudo quebrado: daqui para frente leva dano normal
          popup(ini.x, ini.y - 14, 'ESCUDO QUEBROU!', '#ffe066', 16);
          this.faiscas(ini.x, ini.y, 0xcfd8dc, 14, 16);
          Som.tocar('quebrar');
        } else if (Math.random() < 0.3) popup(ini.x, ini.y - 12, 'BLOQUEIO', '#cfd8dc', 8);
        // um pouco do dano passa (e conta para matar)
        this.ferirInimigo(ini, dano * 0.25, dir, undefined, 20, true);
        if (!b.getData('espectral')) b.destroy();
        return;
      }
    }

    const noChefe = ini.ehChefe && b.getData('refletida') ? D.config.parry.danoNoChefe : 1;
    const crit = this.fx.usarCritico() || Math.random() < D.config.critico.chance + Estado.run!.stats.critico;
    // Faísca Negra: às vezes o golpe sai 2,5x mais forte
    const negra = this.fx.tem('raioNegro') && Math.random() < 0.08;
    const dano = (b.getData('dano') as number) * (crit ? D.config.critico.multiplicador : 1) * noChefe * (negra ? 2.5 : 1);
    if (negra) {
      popup(ini.x, ini.y - 18, 'FAÍSCA NEGRA!', '#e2452b', 16);
      this.flashes.push({ x: ini.x, y: ini.y, r: 50, t: 0.12, cor: 0x1b1325 });
      this.faiscas(ini.x, ini.y, 0xe2452b, 10, 16);
      this.camaraLenta(0.2, 120);
    }
    if (crit) {
      popup(ini.x, ini.y - ini.displayHeight * 0.5, `${Math.round(dano * 10)}!`, CORES.ouro, 24);
      Som.tocar('critico');
    }
    this.aplicarAcerto(ini, dano, dir, {
      empurrao: b.getData('empurrao'), queima: b.getData('queima'), veneno: b.getData('veneno'), congela: b.getData('congela'),
      eletrico: b.getData('eletrico'), explosao: b.getData('explosao'), fragmenta: b.getData('fragmenta'), mods: b.getData('mods'),
      x: b.x, y: b.y, semPopup: crit,
    });
    this.fx.evento('acertar', { x: b.x, y: b.y, alvo: ini });
    if (crit) this.fx.evento('critico', { x: b.x, y: b.y, alvo: ini });
    if (b.getData('explosao') || b.getData('fragmenta')) {
      if (b.getData('fragmenta')) this.fragmentar(b);
      b.destroy();
      return;
    }
    const perfura = b.getData('perfura') as number;
    if (perfura > 0) b.setData('perfura', perfura - 1);
    else b.destroy();
  }

  /** Dano + todos os efeitos da bala (fogo, veneno, gelo, raio, explosão). */
  private aplicarAcerto(ini: Inimigo, dano: number, dir: Phaser.Math.Vector2, e: Acerto) {
    this.ferirInimigo(ini, dano, dir, undefined, e.empurrao, e.semPopup);
    this.fx.aposAcerto(ini, dano);
    if (ini.morto) {
      if (e.eletrico) this.raio(e.x, e.y, dano, e.eletrico, new Set([ini]));
      if (e.explosao) this.explodir(e.x, e.y, e.explosao, dano, e.mods);
      return;
    }
    if (e.queima) ini.aplicarStatus('queima', 2);
    if (e.veneno) ini.aplicarStatus('veneno', 3);
    if (e.congela && Math.random() < e.congela) {
      if (ini.congelado <= 0) popup(ini.x, ini.y - 12, 'CONGELOU', '#bfefff', 8);
      ini.aplicarStatus('congelado', 1.6);
    }
    if (e.eletrico) this.raio(ini.x, ini.y, dano, e.eletrico, new Set([ini]));
    if (e.explosao) this.explodir(e.x, e.y, e.explosao, dano, e.mods);
  }

  /** Raio em cadeia: pula para os monstros mais próximos. */
  private raio(x: number, y: number, dano: number, saltos: number, ja: Set<Inimigo>) {
    let ox = x;
    let oy = y;
    const g = this.add.graphics().setDepth(5200).setBlendMode(Phaser.BlendModes.ADD);
    for (let i = 0; i < saltos; i++) {
      let alvo: Inimigo | null = null;
      let melhor = 70;
      for (const ini of this.listaInimigos()) {
        if (ini.morto || ja.has(ini)) continue;
        const d = Phaser.Math.Distance.Between(ox, oy, ini.x, ini.y);
        if (d < melhor) {
          melhor = d;
          alvo = ini;
        }
      }
      if (!alvo) break;
      ja.add(alvo);
      g.lineStyle(1.5, 0x8fe3ff, 1);
      g.beginPath();
      g.moveTo(ox, oy);
      for (let k = 1; k <= 4; k++) {
        const t = k / 4;
        const tremido = k < 4 ? (Math.random() - 0.5) * 8 : 0;
        g.lineTo(ox + (alvo.x - ox) * t + tremido, oy + (alvo.y - oy) * t + tremido);
      }
      g.strokePath();
      this.flashes.push({ x: alvo.x, y: alvo.y, r: 24, t: 0.08, cor: 0x8fe3ff });
      const ax = alvo.x;
      const ay = alvo.y;
      this.ferirInimigo(alvo, dano * 0.6, null, 'raio');
      ox = ax;
      oy = ay;
    }
    Som.tocar('zap');
    this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
  }

  private fragmentar(b: Sprite) {
    const n = b.getData('fragmenta') as number;
    const def = arma(b.getData('arma'));
    const mods = b.getData('mods') as Mods;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      this.criarBala(b.x, b.y, ang, 220, 0.3, def, mods, b.getData('dano'), true);
    }
  }

  private explodir(x: number, y: number, raio: number, dano: number, mods?: Mods) {
    const grande = raio > 20;
    Som.tocar('explosao');
    this.tremer(grande ? 220 : 90, grande ? 0.012 : 0.004);
    this.flashes.push({ x, y, r: raio * 2.4, t: 0.15, cor: 0xff9a2e });
    const anel = this.add.circle(x, y, raio, 0xffb43a, 0.5).setDepth(4600).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: anel, scale: 1.4, alpha: 0, duration: 260, onComplete: () => anel.destroy() });
    this.faiscas(x, y, 0xff9a2e, grande ? 18 : 8, raio * 0.9);
    this.faiscas(x, y, 0xffe066, grande ? 10 : 4, raio * 0.6);
    for (const ini of this.listaInimigos()) {
      if (ini.morto || ini.intangivel) continue;
      const d = Phaser.Math.Distance.Between(x, y, ini.body.center.x, ini.body.center.y);
      if (d > raio + ini.body.width / 2) continue;
      const dir = new Phaser.Math.Vector2(ini.x - x, ini.y - y).normalize();
      this.ferirInimigo(ini, dano * (1 - d / (raio * 1.6)), dir, 'explosao', 220);
      if (mods?.congela && !ini.morto) ini.aplicarStatus('congelado', 1.6);
    }
    for (const obj of this.projeteis.getChildren().slice()) {
      const p = obj as Sprite;
      if (Phaser.Math.Distance.Between(x, y, p.x, p.y) < raio) this.estourarProjetil(p);
    }
    for (const obj of this.caixotes.getChildren().slice()) {
      const c = obj as Sprite;
      if (Phaser.Math.Distance.Between(x, y, c.x, c.y - 8) < raio + 8) this.danificarCaixote(c, 3);
    }
    this.explosaoNasParedes(x, y, raio);
  }

  /** Explosões abrem as paredes rachadas de uma vez. */
  explosaoNasParedes(x: number, y: number, raio: number) {
    for (const obj of this.paredes.getChildren()) {
      const w = obj as Sprite;
      const dir = w.getData('secreta') as Dir | undefined;
      if (dir && Phaser.Math.Distance.Between(x, y, w.x, w.y) < raio + 12) {
        this.racharParede(dir, 999);
        return;
      }
    }
  }

  /** Tiros vão rachando a passagem secreta até ela abrir. */
  private racharParede(dir: Dir, dano: number) {
    const sala = Estado.sala!;
    const total = (this.danoRachada.get(dir) ?? 0) + dano;
    this.danoRachada.set(dir, total);
    if (total < D.config.secreta.vidaParede) {
      for (const obj of this.paredes.getChildren()) {
        const w = obj as Sprite;
        if (w.getData('secreta') === dir) this.tweens.add({ targets: w, x: w.x + 1, duration: 30, yoyo: true });
      }
      return;
    }
    this.danoRachada.delete(dir);
    Estado.masmorra!.abrir(sala, dir);
    Estado.masmorra!.marcarVisitada(sala);
    for (const obj of this.paredes.getChildren().slice()) {
      const w = obj as Sprite;
      if (w.getData('secreta') !== dir) continue;
      const r = Math.floor((w.y - OY) / TILE);
      const c = Math.floor(w.x / TILE);
      this.grade[r][c] = '.';
      this.faiscas(w.x, w.y, 0x9a93a3, 12, 16);
      this.faiscas(w.x, w.y, 0xc86bff, 6, 12);
      w.destroy();
    }
    for (const img of this.decoracao.getChildren().slice() as Phaser.GameObjects.Image[]) {
      if (img.texture?.key !== 'rachadura') continue;
      const r = Math.floor((img.y - OY) / TILE);
      const c = Math.floor(img.x / TILE);
      if (CELULAS_PORTA[dir].some(([rr, cc]) => rr === r && cc === c)) img.destroy();
    }
    Som.tocar('explosao');
    Som.tocar('reliquia');
    this.tremer(250, 0.01);
    this.piscar(200, 120, 255, 120);
    mostrarBanner('PASSAGEM SECRETA!', '', '#c86bff', 2);
  }

  private cartucho(x: number, y: number) {
    const c = this.add.image(x, y, 'cartucho').setDepth(9);
    const lado = this.jogador.mira.x < 0 ? 1 : -1;
    this.tweens.add({
      targets: c, x: x + lado * (6 + Math.random() * 6), y: y + 6 + Math.random() * 4, angle: 360 * lado, duration: 260, ease: 'Quad.out',
      onComplete: () => this.tweens.add({ targets: c, alpha: 0, delay: 600, duration: 300, onComplete: () => c.destroy() }),
    });
  }

  private recarregar() {
    const j = this.jogador;
    const a = this.armaAtual;
    const def = arma(a.id);
    if (j.recarregando > 0 || a.pente >= this.penteMax(def) || a.reserva === 0) return;
    j.recarregando = def.recarga * Estado.run!.stats.recarga;
    // a TETE rosna enquanto recarrega
    Som.tocar(def.som === 'latido' ? 'rosnado' : 'recarga');
    this.fx.evento('recarregar', { x: j.x, y: j.y });
  }

  private atualizarRecarga(dt: number) {
    const j = this.jogador;
    if (j.recarregando <= 0) {
      Estado.recarregando = 0;
      return;
    }
    const a = this.armaAtual;
    const def = arma(a.id);
    const total = def.recarga * Estado.run!.stats.recarga;
    j.recarregando -= dt;
    Estado.recarregando = Phaser.Math.Clamp(1 - j.recarregando / total, 0, 1);
    if (j.recarregando <= 0) {
      const falta = this.penteMax(def) - a.pente;
      const pega = a.reserva < 0 ? falta : Math.min(falta, a.reserva);
      a.pente += pega;
      if (a.reserva >= 0) a.reserva -= pega;
      Estado.recarregando = 0;
      Som.tocar('recargaFim');
    }
  }

  private selecionarArma(i: number) {
    const run = Estado.run!;
    if (i >= run.armas.length || i === run.armaAtual) return;
    run.armaAtual = i;
    this.jogador.recarregando = 0;
    this.jogador.tiroRecarga = 0.15;
    this.aquecimento = 0;
    Som.tocar('trocarArma');
    const nova = arma(this.armaAtual.id);
    if (nova.som === 'latido') Som.tocar('latido'); // a TETE chega latindo
    else if (nova.som === 'miau') Som.tocar('miau');
    avisar(nova.nome.toUpperCase(), CORES.chama);
  }

  private trocarArma(delta: number) {
    const run = Estado.run!;
    if (run.armas.length < 2) return;
    this.selecionarArma((run.armaAtual + delta + run.armas.length) % run.armas.length);
  }

  // ===================== Combate =====================

  private tentarDash(dir: Phaser.Math.Vector2) {
    const j = this.jogador;
    const run = Estado.run!;
    if (j.morto || j.dashCargas <= 0 || j.dashT > 0 || j.atordoado > 0 || dir.lengthSq() === 0) return;
    if (run.desafio === 'sem_esquiva') return; // Pés de Chumbo
    j.dashCargas--;
    j.dashT = D.config.combate.duracaoDash;
    j.dashDir.copy(dir).normalize();
    j.rastroT = 0;
    j.raspou = false;
    run.chama = Math.max(1, run.chama - D.config.combate.custoDash);
    Som.tocar('dash');
    this.fx.evento('dash', { x: j.x, y: j.y });
    if (this.projeteis.countActive(true) > 0) this.tuto.dashes++;
  }

  ferirInimigo(ini: Inimigo, dano: number, dir: Phaser.Math.Vector2 | null, fonte?: 'queima' | 'veneno' | 'explosao' | 'raio', empurrao = 60, semPopup = false) {
    if (ini.morto) return;
    ini.vida -= dano;
    if (!semPopup) ini.danoAcum += dano;
    if (!fonte || fonte === 'explosao' || fonte === 'raio') ini.piscar();
    if (dir && empurrao > 0 && !ini.ehChefe) {
      const resist = ini.tipo === 'orc' || ini.tipo === 'escudeiro' || ini.tipo === 'lesma' ? 0.35 : 1;
      ini.setVelocity(dir.x * empurrao * 1.4 * resist, dir.y * empurrao * 1.4 * resist);
      ini.atordoado = Math.min(0.16, (empurrao / 900) * resist);
      if (ini.def.ia === 'perseguir' && empurrao >= 100) {
        ini.sub = 'descansar';
        ini.timer = 0.3;
        ini.alerta = false;
      }
    }
    if (!fonte) Som.tocar('acerto');
    const cor = fonte === 'queima' ? 0xff8a3d : fonte === 'veneno' ? 0x9cff6b : fonte === 'raio' ? 0x8fe3ff : 0xfff4d6;
    this.faiscas(ini.x, ini.y, cor, fonte ? 2 : 3);
    if (ini.vida <= 0) this.matarInimigo(ini);
  }

  private matarInimigo(ini: Inimigo) {
    if (ini.morto) return;
    ini.morto = true;
    const run = Estado.run!;
    const s = run.stats;
    run.mortes++;
    Estado.meta.inimigosTotal++;
    this.contarMaestria();
    this.fx.evento('matar', { x: ini.x, y: ini.y, alvo: ini });
    checarConquista('mortes', Estado.meta.inimigosTotal);
    this.faiscas(ini.x, ini.y, 0xcfc2e0, 10);
    this.faiscas(ini.x, ini.y, 0xff9a2e, 6);
    Som.tocar('morteInimigo');
    if (ini.danoAcum > 0) popup(ini.x, ini.y - ini.displayHeight * 0.4, `${Math.round(ini.danoAcum * 10)}`, '#fff4d6', 16);
    this.flashes.push({ x: ini.x, y: ini.y, r: 34, t: 0.08, cor: 0xff7a3d });
    this.anelLuz(ini.x, ini.y, 0xfff4d6, 14);
    if (s.roubaVida) run.chama = Math.min(s.chamaMax, run.chama + s.roubaVida);
    if (ini.elite) {
      const e = D.config.elite;
      this.leque(ini.x, ini.y, Math.random() * Math.PI, e.anelMorte, 360, 80, Math.round(ini.dano * 0.8));
      this.soltarCera(ini.x, ini.y, e.cera);
      this.camaraLenta(0.15, 120);
      this.piscar(255, 60, 90, 90);
      Som.tocar('eliteMorte');
      popup(ini.x, ini.y - 16, 'ELITE!', '#ff5a7a', 16);
    }
    // abóbora morta antes de explodir: explode nos outros monstros
    if (ini.def.ia === 'kamikaze') this.explodir(ini.x, ini.y, ini.def.explosao ?? 30, 6);
    if (infoAndar(run.andar).perigo === 'coracao' && !ini.ehChefe) this.criarPoca(ini.x, ini.y + 4, 12, 'fogo', 4);
    const [a, b] = ini.def.cera;
    this.soltarCera(ini.x, ini.y, Phaser.Math.Between(a, b) * (this.evento === 'furia' ? 2 : 1));
    // pegou o ladrão: devolve a cera em dobro
    const roubada = ini.getData('roubou') as number | undefined;
    if (ini.def.ia === 'ladrao') {
      this.soltarCera(ini.x, ini.y, (roubada ?? 0) * 2 + 5);
      popup(ini.x, ini.y - 16, 'PEGUEI!', CORES.ouro, 16);
    }

    // combo: mortes em sequência dão cera bônus
    run.combo++;
    run.comboT = D.config.combate.janelaCombo;
    run.melhorCombo = Math.max(run.melhorCombo, run.combo);
    checarConquista('combo', run.combo);
    if (run.combo % 10 === 0) this.fx.evento('combo', { x: ini.x, y: ini.y });
    if (run.combo >= 5 && run.combo % 5 === 0) {
      this.soltarCera(ini.x, ini.y, 2 + Math.floor(run.combo / 5));
      Som.tocar('combo');
    }
    if (D.config.frenesi.marcos.includes(run.combo) && run.combo > this.ultimoMarco) {
      this.ultimoMarco = run.combo;
      this.marcoCombo(run.combo);
    }

    // às vezes cai munição (se alguma arma usar munição)
    const precisa = run.armas.some((w) => w.reserva >= 0);
    if (precisa && !ini.ehChefe && Math.random() < D.config.combate.chanceMunicao * (1 + s.sorte * 0.5)) {
      this.criarItemChao('municao', 'municao', ini.x, ini.y, true);
    }
    if (ini.def.divide) {
      for (const lado of [-1, 1]) {
        const filho = this.criarInimigo(ini.def.divide, ini.x + lado * 6, ini.y);
        filho.t = 0.4;
        filho.setAlpha(1);
      }
    }
    if (ini.ehChefe) this.chefeDerrotado(ini.x, ini.y, ini.tipo);
    ini.destroy();
  }

  /** Some sem dar cera nem combo (abóbora que explodiu sozinha). */
  matarSemRecompensa(ini: Inimigo) {
    if (ini.morto) return;
    ini.morto = true;
    this.faiscas(ini.x, ini.y, 0xff9a2e, 10);
    ini.destroy();
  }

  criarInimigo(tipo: string, x: number, y: number, elite = false) {
    const ini = new Inimigo(this, x, y, tipo, Estado.run!.andar, elite);
    // a Moeda Maldita deixa os monstros mais fortes
    ini.vidaMax *= Estado.run!.stats.vidaInimigos;
    // modo infinito: os chefes ficam mais duros a cada profundeza
    const alem = Estado.run!.andar - marcos().acendedor;
    if (ini.ehChefe && alem > 0) {
      const f = D.config.infinito;
      ini.vidaMax = Math.max(ini.vidaMax, f.vidaChefeBase) * (1 + f.vidaChefePorAndar * alem);
    }
    ini.vida = ini.vidaMax;
    this.inimigos.add(ini);
    ini.configurar();
    return ini;
  }

  criarProjetil(x: number, y: number, ang: number, vel: number, dano: number, comSom = true, efeito?: 'lento' | 'veneno') {
    const textura = efeito === 'lento' ? 'bala_gelo' : efeito === 'veneno' ? 'bala_veneno' : 'bala_inimiga';
    const p = this.projeteis.create(x, y, textura, 0) as Sprite;
    p.setData({ dano, efeito });
    p.setDepth(4500);
    (p.body as Corpo).setCircle(3, 1, 1);
    const v = vel * D.config.velocidadeBalasInimigas * Estado.run!.stats.balasInimigas;
    p.setVelocity(Math.cos(ang) * v, Math.sin(ang) * v);
    if (comSom) Som.tocar('tiro');
    if (infoAndar(Estado.run!.andar).perigo === 'espelho' && vel > 0) {
      p.setBounce(1);
      p.setData('quica', 1);
    }
    return p;
  }

  /** Vários projéteis em leque (dispersão em graus; 360 = anel). */
  leque(x: number, y: number, ang: number, qtd: number, dispersao: number, vel: number, dano: number, efeito?: 'lento' | 'veneno') {
    for (let i = 0; i < qtd; i++) {
      let a = ang;
      if (dispersao >= 360) a = ang + (i / qtd) * Math.PI * 2;
      else if (qtd > 1) a = ang + Phaser.Math.DegToRad(dispersao) * (i / (qtd - 1) - 0.5);
      this.criarProjetil(x, y, a, vel, dano, false, efeito);
    }
    Som.tocar('tiro');
  }

  /** Frasco de veneno arremessado: cai onde você estava e vira uma poça. */
  frasco(x: number, y: number, tx: number, ty: number, vel: number, dano: number, dist: number) {
    const p = this.criarProjetil(x, y, Math.atan2(ty - y, tx - x), vel, dano, true, 'veneno');
    p.setData('vidaProj', dist / (vel * D.config.velocidadeBalasInimigas * Estado.run!.stats.balasInimigas));
    p.setData('poca', true);
    p.setScale(1.4);
  }

  private atualizarProjeteis(dt: number) {
    const t = this.time.now;
    for (const obj of this.projeteis.getChildren().slice()) {
      const p = obj as Sprite;
      p.setFrame(Math.floor(t / 80) % 2); // pisca
      const mina = p.getData('mina') as number | undefined;
      if (mina !== undefined) {
        p.setData('mina', mina - dt);
        p.setAlpha(mina > 0 ? 0.5 : Math.floor(t / 120) % 2 ? 0.6 : 1);
        if (mina <= 0 && Phaser.Math.Distance.Between(p.x, p.y, this.jogador.x, this.jogador.y + 4) < 20) {
          this.explosaoInimiga(p.x, p.y, 20, p.getData('dano') as number);
          p.destroy();
          continue;
        }
      }
      const vida = p.getData('vidaProj') as number | undefined;
      if (vida !== undefined) {
        p.setData('vidaProj', vida - dt);
        if (vida - dt <= 0) {
          this.estourarProjetil(p);
          continue;
        }
      }
      if (p.x < -8 || p.x > MUNDO_L + 8 || p.y < OY - 8 || p.y > MUNDO_A + 8) p.destroy();
    }
  }

  private estourarProjetil(p: Sprite) {
    if (!p.active) return;
    if (p.getData('poca')) {
      this.criarPoca(p.x, p.y, 16, 'veneno', 5);
      Som.tocar('vidro');
    }
    const ef = p.getData('efeito');
    this.faiscas(p.x, p.y, ef === 'veneno' ? 0x9cff6b : ef === 'lento' ? 0x8fe3ff : 0xc86bff, 4);
    p.destroy();
  }

  /** Explosão que machuca o jogador (abóbora, pulo do ogro). */
  explosaoInimiga(x: number, y: number, raio: number, dano: number) {
    Som.tocar('explosao');
    this.tremer(220, 0.012);
    this.flashes.push({ x, y, r: raio * 2.2, t: 0.15, cor: 0xff4a2e });
    const anel = this.add.circle(x, y, raio, 0xff4a2e, 0.45).setDepth(4600).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: anel, scale: 1.3, alpha: 0, duration: 260, onComplete: () => anel.destroy() });
    this.faiscas(x, y, 0xff4a2e, 14, raio);
    const j = this.jogador;
    if (Phaser.Math.Distance.Between(x, y, j.x, j.y + 4) < raio + 4) {
      this.ultimaCausa = 'uma explosão';
      this.ferirJogador(dano, x, y);
    }
    for (const obj of this.caixotes.getChildren().slice()) {
      const c = obj as Sprite;
      if (Phaser.Math.Distance.Between(x, y, c.x, c.y - 8) < raio + 8) this.danificarCaixote(c, 3);
    }
    this.explosaoNasParedes(x, y, raio);
  }

  /** Mina dos goblins e dos chefes: arma em 0,8s e explode quando você chega perto. */
  criarMinaInimiga(x: number, y: number, dano: number) {
    if (this.projeteis.countActive(true) > 260) return;
    const m = this.criarProjetil(x, y, 0, 0, dano, false);
    m.setTint(0xff4a2e).setScale(1.3);
    m.setData({ mina: 0.8, vidaProj: 9 });
    (m.body as Corpo).setImmovable(true);
  }

  /** O Relojoeiro solta o tempo: todas as balas paradas disparam na sua direção. */
  acelerarProjeteis(vel: number) {
    const j = this.jogador;
    for (const obj of this.projeteis.getChildren()) {
      const p = obj as Sprite;
      if (p.getData('mina') !== undefined) continue;
      const a = Math.atan2(j.y - p.y, j.x - p.x) + (Math.random() - 0.5) * 0.25;
      p.setVelocity(Math.cos(a) * vel, Math.sin(a) * vel);
    }
    this.piscar(255, 230, 120, 120);
  }

  /** Uma fila de balas atravessando a sala, com um buraco de 3 balas para escapar. */
  paredeDeBalas(x: number, y: number, ang: number, vel: number, dano: number) {
    const px = -Math.sin(ang);
    const py = Math.cos(ang);
    const n = 24;
    const buraco = Phaser.Math.Between(6, n - 9);
    for (let k = 0; k < n; k++) {
      if (k >= buraco && k < buraco + 3) continue;
      const d = (k - n / 2) * 14;
      this.criarProjetil(x + px * d, y + py * d, ang, vel, dano, k === 0);
    }
  }

  anunciarFuria(ini: Inimigo) {
    popup(ini.x, ini.y - 30, 'FÚRIA!', '#ff4a2e', 24);
    this.piscar(255, 60, 40, 160);
    const fala = ini.def.falas?.furia;
    if (fala) mostrarBanner(ini.def.nome.toUpperCase(), `"${fala}"`, CORES.perigo, 3);
  }

  faiscasPublicas(x: number, y: number, cor: number) {
    this.faiscas(x, y, cor, 10, 14);
  }

  /** Linha vermelha piscando: aviso de investida. */
  linhaAviso(x: number, y: number, ang: number, comp: number, ms: number) {
    const g = this.add.graphics().setDepth(5200);
    g.lineStyle(2, 0xff3040, 0.6).lineBetween(x, y, x + Math.cos(ang) * comp, y + Math.sin(ang) * comp);
    this.tweens.add({ targets: g, alpha: 0.15, duration: 90, yoyo: true, repeat: Math.floor(ms / 180), onComplete: () => g.destroy() });
  }

  /** Círculo vermelho no chão: aviso de onde algo vai cair. */
  marcaAlvo(x: number, y: number, raio: number, ms: number) {
    const c = this.add.circle(x, y + 4, raio, 0xff3040, 0.15).setStrokeStyle(1.5, 0xff3040, 0.9).setDepth(3);
    this.tweens.add({ targets: c, scale: 0.4, duration: ms, onComplete: () => c.destroy() });
  }

  criarPoca(x: number, y: number, r: number, tipo: 'veneno' | 'lama' | 'fogo', duracao: number) {
    if (this.pocas.length > 40) return;
    const cor = tipo === 'veneno' ? 0x5fcf4b : tipo === 'fogo' ? 0xff7a2e : 0x6b4a2a;
    const g = this.add.ellipse(x, y, r * 2, r * 1.3, cor, 0.38).setStrokeStyle(1, cor, 0.7).setDepth(3);
    g.setScale(0.3);
    this.tweens.add({ targets: g, scale: 1, duration: 200 });
    this.pocas.push({ x, y, r, tipo, t: duracao, g });
  }

  private atualizarPocas(dt: number) {
    const j = this.jogador;
    for (const p of this.pocas.slice()) {
      p.t -= dt;
      if (p.t < 0.6) p.g.setAlpha(Math.max(0, p.t / 0.6));
      if (p.t <= 0) {
        p.g.destroy();
        this.pocas.splice(this.pocas.indexOf(p), 1);
        continue;
      }
      if (j.dashT > 0 || p.tipo === 'lama') continue;
      const dx = (j.x - p.x) / p.r;
      const dy = (j.y + 6 - p.y) / (p.r * 0.65);
      if (dx * dx + dy * dy < 1) this.venenoJogador = Math.max(this.venenoJogador, 0.6);
    }
  }

  private lentidaoPoca() {
    const j = this.jogador;
    for (const p of this.pocas) {
      if (p.tipo !== 'lama') continue;
      const dx = (j.x - p.x) / p.r;
      const dy = (j.y + 6 - p.y) / (p.r * 0.65);
      if (dx * dx + dy * dy < 1) return 0.6;
    }
    return 1;
  }

  /** O doutor da peste cura os monstros por perto. */
  curarInimigos(x: number, y: number, raio: number, fracao: number, exceto: Inimigo) {
    const anel = this.add.circle(x, y, raio, 0x5fcf6b, 0.12).setStrokeStyle(1, 0x5fcf6b, 0.8).setDepth(3);
    this.tweens.add({ targets: anel, alpha: 0, scale: 1.2, duration: 500, onComplete: () => anel.destroy() });
    for (const ini of this.listaInimigos()) {
      if (ini.morto || ini === exceto || ini.vida >= ini.vidaMax) continue;
      if (Phaser.Math.Distance.Between(x, y, ini.x, ini.y) > raio) continue;
      ini.vida = Math.min(ini.vidaMax, ini.vida + ini.vidaMax * fracao);
      popup(ini.x, ini.y - 12, '+', '#7fdc8a', 16);
    }
    Som.tocar('cura');
  }

  private atualizarEspinhos() {
    if (!this.espinhos.length) return;
    // ciclo de 2,4s: baixo → aviso → subindo → em pé (machuca)
    const t = (this.time.now / 1000) % 2.4;
    const frame = t < 1.4 ? 0 : t < 1.6 ? 1 : t < 1.8 ? 2 : 3;
    const j = this.jogador;
    const jc = Math.floor(j.body.center.x / TILE);
    const jr = Math.floor((j.body.center.y - OY) / TILE);
    const max = totalQuadros(this, 'espinhos') - 1;
    for (const e of this.espinhos) {
      e.img.setFrame(Math.min(frame, max));
      if (frame >= 2 && e.r === jr && e.c === jc && j.dashT <= 0) {
        this.ultimaCausa = 'espinhos';
        this.ferirJogador(10, e.img.x, e.img.y - 6);
      }
    }
  }

  private danificarCaixote(c: Sprite, dano: number) {
    if (!c.active) return;
    const vida = (c.getData('vida') as number) - dano;
    c.setData('vida', vida);
    this.tweens.add({ targets: c, x: c.x + 1, duration: 30, yoyo: true });
    if (vida > 0) return;
    const [r, col] = (c.getData('cel') as string).split(',').map(Number);
    this.grade[r][col] = '.';
    Estado.sala!.quebrados.push(c.getData('cel'));
    this.faiscas(c.x, c.y - 8, 0x9a5a2e, 10, 14);
    Som.tocar('quebrar');
    const sorte = Estado.run!.stats.sorte;
    const rnd = Math.random();
    if (rnd < 0.25 + sorte * 0.05) this.soltarCera(c.x, c.y - 8, Phaser.Math.Between(1, 2));
    else if (rnd < 0.33 + sorte * 0.05) this.criarItemChao('municao', 'municao', c.x, c.y - 8, true);
    else if (rnd < 0.36 + sorte * 0.05) this.criarItemChao('vela', 'vela', c.x, c.y - 8, true);
    c.destroy();
  }

  private contato(ini: Inimigo) {
    if (ini.morto || ini.fase === 'surgindo') return;
    if (ini.def.ia === 'ladrao') return this.roubar(ini);
    if (this.jogador.parryT > 0) {
      this.parryCorpoACorpo(ini);
      return;
    }
    const s = Estado.run!.stats;
    if (s.espinhos > 0 && ini.espinhoCd <= 0) {
      ini.espinhoCd = 0.5;
      const d = new Phaser.Math.Vector2(ini.x - this.jogador.x, ini.y - this.jogador.y).normalize();
      this.ferirInimigo(ini, s.espinhos, d, undefined, 120);
      if (ini.morto) return;
    }
    this.ultimaCausa = ini.def.nome;
    this.ferirJogador(ini.dano, ini.x, ini.y);
  }

  /** Retorna true se o golpe pegou (não estava invencível nem foi bloqueado). */
  private ferirJogador(dano: number, fx: number, fy: number) {
    const j = this.jogador;
    if (j.morto || j.invencivel > 0 || j.dashT > 0 || this.transicionando || Estado.deus) return false;
    if (this.escudoAtivo) {
      this.escudoAtivo = false;
      j.invencivel = 0.5;
      popup(j.x, j.y - 18, 'ESCUDO!', '#f2e3c2', 16);
      Som.tocar('parry');
      this.anelLuz(j.maoX, j.maoY, 0xf2e3c2, 26);
      return false;
    }
    const run = Estado.run!;
    this.semDanoChefe = false;
    dano *= run.stats.danoRecebido;
    run.chama -= dano;
    j.invencivel = D.config.combate.invencivelAposDano;
    j.atordoado = 0.15;
    const d = new Phaser.Math.Vector2(j.x - fx, j.y - fy);
    if (d.lengthSq() < 0.01) d.set(0, 1);
    d.normalize();
    j.setVelocity(d.x * 160, d.y * 160);
    this.tremer(150, 0.008);
    this.piscar(160, 20, 20, 80);
    Som.tocar('dano');
    j.setTintFill(0xff4040);
    this.faiscas(j.x, j.y, 0xffb43a, 6);
    popup(j.x, j.y - 16, `-${Math.round(dano)}`, CORES.perigo, 16);
    if (run.chama <= 0) this.morrer();
    else this.fx.evento('dano', { x: j.x, y: j.y });
    return true;
  }

  private efeitoNoJogador(efeito?: 'lento' | 'veneno') {
    if (efeito === 'lento') this.lentoJogador = 1.5;
    if (efeito === 'veneno') this.venenoJogador = 2.5;
  }

  private novaOnda() {
    this.ondaExtra = false;
    const run = Estado.run!;
    const pool = Object.entries(D.inimigos).filter(([, d]) => d.custo > 0 && !d.chefe && d.andarMin <= run.andar).map(([id]) => id);
    const n = 3 + Math.min(run.andar, D.config.infinito.orcamentoMaxAndar) * 2;
    for (let i = 0; i < n; i++) {
      const p = this.posicaoLivre(this.jogador.x, this.jogador.y, 80);
      const tipo = Phaser.Math.RND.pick(pool);
      this.criarInimigo(tipo, p.x, p.y, this.sortearElite(tipo));
    }
    Som.tocar('onda');
    this.piscar(255, 60, 60, 120);
    mostrarBanner('MAIS UMA ONDA!', '', CORES.perigo, 1.6);
  }

  // ===================== Cera, itens e objetos =====================

  private soltarCera(x: number, y: number, n: number) {
    // andar amaldiçoado: a cera vem em dobro
    if (Estado.run?.maldicao) n *= 2;
    for (let i = 0; i < n; i++) {
      const g = this.gotas.create(x, y, 'gota') as Sprite;
      const a = Math.random() * Math.PI * 2;
      const v = 50 + Math.random() * 60;
      g.setVelocity(Math.cos(a) * v, Math.sin(a) * v);
      g.setDrag(200, 200);
      g.setBounce(0.5);
      g.setData('t', 0);
      g.setDepth(9);
      (g.body as Corpo).setSize(6, 6);
    }
  }

  private coletarGota(g: Sprite) {
    if (!g.active || (g.getData('t') as number) < 0.3) return;
    g.destroy();
    const run = Estado.run!;
    const valor = Math.max(1, Math.round(run.stats.ceraBonus));
    run.cera += valor;
    run.ceraTotal += valor;
    run.chama = Math.min(run.stats.chamaMax, run.chama + D.config.combate.curaPorGota * run.stats.curaCera);
    Som.tocar('cera');
  }

  /** Sorteia um item que você ainda não tem, pesando pela raridade (e pela sorte). */
  private sortearItem(raridadeMin: number): string | null {
    const run = Estado.run!;
    const livres = D.itens.filter((r) => r.raridade >= raridadeMin && !run.itens.includes(r.id) && !run.reservadas.includes(r.id) && !bloqueado('item', r.id) && (!r.exclusivo || r.exclusivo === run.personagem));
    if (!livres.length) return null;
    const pesos = D.config.raridade.pesos;
    const sorte = run.stats.sorte;
    const lista = livres.map((r) => [r, (pesos[r.raridade - 1] ?? 10) + (r.raridade >= 3 ? sorte * 6 : 0)] as const);
    const total = lista.reduce((s, [, p]) => s + p, 0);
    let x = Math.random() * total;
    for (const [r, p] of lista) {
      if ((x -= p) <= 0) {
        run.reservadas.push(r.id);
        return r.id;
      }
    }
    return null;
  }

  private sortearArma(): string | null {
    const run = Estado.run!;
    const livres = D.armas.filter((a) => a.raridade > 0 && !run.armas.some((w) => w.id === a.id) && !run.reservadas.includes(a.id) && !bloqueado('arma', a.id) && (!a.exclusivo || a.exclusivo === run.personagem));
    if (!livres.length) return null;
    const pesos = D.config.raridade.pesos;
    const lista = livres.map((a) => [a, pesos[a.raridade - 1] ?? 10] as const);
    const total = lista.reduce((s, [, p]) => s + p, 0);
    let x = Math.random() * total;
    for (const [a, p] of lista) {
      if ((x -= p) <= 0) {
        run.reservadas.push(a.id);
        return a.id;
      }
    }
    return null;
  }

  private sortearAtivo(): string | null {
    const run = Estado.run!;
    const livres = D.ativos.filter((a) => a.id !== run.ativo?.id && !run.reservadas.includes(a.id) && !bloqueado('ativo', a.id));
    if (!livres.length) return null;
    const id = Phaser.Math.RND.pick(livres).id;
    run.reservadas.push(id);
    return id;
  }

  private cor(hex: string) {
    return Phaser.Display.Color.HexStringToColor(hex).color;
  }

  /** Item no chão. "salvar" guarda na sala para quando voltar. */
/**
   * Item no chão. "salvar" guarda na sala para quando voltar.
   * Itens, ativos e armas ficam num pedestal (como no Isaac); com "animar", o pedestal sobe do chão
   * e o item cai em cima dele com um feixe de luz.
   */
  private criarItemChao(tipo: TipoItemChao, id: string, x: number, y: number, salvar: boolean, op: { pedestal?: boolean; animar?: boolean } = {}) {
    let chave = tipo === 'item' || tipo === 'ativo' ? `icone_${id}` : tipo === 'arma' ? arma(id).sprite : tipo === 'vela' ? 'vela_item' : 'caixa_municao';
    // Maldição da Cegueira: itens viram "?"
    if (Estado.run?.maldicao === 'cegueira' && (tipo === 'item' || tipo === 'ativo')) chave = 'item_misterio';
    const usaPedestal = op.pedestal ?? (tipo === 'item' || tipo === 'ativo' || tipo === 'arma');
    // o item flutua um pouco acima do pedestal
    const yItem = usaPedestal ? y - 4 : y;
    const img = this.add.image(x, yItem, chave).setDepth(12 + y);
    const it: ItemChao = { tipo, id, img };
    if (usaPedestal) {
      it.base = this.add.image(x, y + 4, 'pedestal').setDepth(10 + y);
      img.setData('pedestalChao', true);
    }
    const flutuar = () => this.tweens.add({ targets: img, y: yItem - 3, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    if (op.animar) {
      // pedestal sobe do chão, o item cai do alto e quica
      if (it.base) {
        it.base.setScale(1, 0).setAlpha(0);
        this.tweens.add({ targets: it.base, scaleY: 1, alpha: 1, duration: 260, ease: 'Back.out' });
      }
      img.setY(yItem - 46).setAlpha(0);
      this.tweens.add({ targets: img, alpha: 1, duration: 120 });
      this.tweens.add({
        targets: img, y: yItem, duration: 420, delay: 120, ease: 'Bounce.out',
        onComplete: () => {
          this.faiscas(x, yItem, 0xffe066, 10, 12);
          this.anelLuz(x, yItem + 4, 0xffe066, 16);
          flutuar();
        },
      });
      const feixe = this.add.rectangle(x, yItem - 30, 10, 70, 0xffe066, 0.35).setDepth(4600).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: feixe, scaleX: 0.1, alpha: 0, duration: 700, onComplete: () => feixe.destroy() });
      this.flashes.push({ x, y: yItem, r: 40, t: 0.3, cor: 0xffe066 });
      Som.tocar(tipo === 'arma' ? 'pegarArma' : 'reliquia');
    } else flutuar();
    this.itensChao.push(it);
    if (salvar) Estado.sala!.itensChao.push({ tipo, id, x, y });
    return it;
  }

  private removerItemChao(it: ItemChao) {
    this.itensChao = this.itensChao.filter((i) => i !== it);
    const sala = Estado.sala!;
    const idx = sala.itensChao.findIndex((i) => i.tipo === it.tipo && i.id === it.id);
    if (idx >= 0) sala.itensChao.splice(idx, 1);
    this.faiscas(it.img.x, it.img.y, 0xffe066, 8);
    it.img.destroy();
    // o pedestal afunda no chão
    const base = it.base;
    if (base) this.tweens.add({ targets: base, scaleY: 0, alpha: 0, duration: 300, ease: 'Quad.in', onComplete: () => base.destroy() });
  }

  private verificarItensChao() {
    const j = this.jogador;
    const run = Estado.run!;
    this.trocaPendente = null;
    this.trocaAtivo = null;
    for (const it of this.itensChao.slice()) {
      // o ímã puxa os itens soltos
      if (run.stats.ima && !it.img.getData('pedestal') && !it.img.getData('pedestalChao') && it.tipo !== 'arma') {
        const d = Phaser.Math.Distance.Between(it.img.x, it.img.y, j.x, j.y);
        if (d < 90 && d > 6) {
          it.img.x += ((j.x - it.img.x) / d) * 1.5;
          it.img.y += ((j.y - it.img.y) / d) * 1.5;
        }
      }
      const d = Phaser.Math.Distance.Between(it.img.x, it.img.y, j.x, j.y + 2);
      if (d > (it.img.getData('pedestal') || it.img.getData('pedestalChao') ? 18 : 13)) continue;
      if (it.tipo === 'item') {
        if (it.img.getData('pedestal')) Estado.sala!.comprado.I = true;
        this.pegarItem(it.id);
        this.removerItemChao(it);
      } else if (it.tipo === 'municao') {
        this.encherMunicao(1.5);
        Som.tocar('municao');
        avisar('+ MUNIÇÃO', '#a3d977');
        this.removerItemChao(it);
      } else if (it.tipo === 'ativo') {
        // sem ativo: pega na hora; com um na mão: [E] troca (o velho fica no chão)
        if (run.ativo) this.trocaAtivo = it;
        else this.pegarAtivo(it);
      } else if (it.tipo === 'vela') {
        run.chama = Math.min(run.stats.chamaMax, run.chama + 20);
        Som.tocar('cera');
        popup(j.x, j.y - 16, '+20', CORES.chama, 16);
        this.removerItemChao(it);
      } else if (run.desafio === 'so_tete' && !run.armas.some((w) => w.id === it.id)) {
        // Só a TETE: outra arma vira cera
        popup(it.img.x, it.img.y - 12, 'SÓ A TETE!', '#f0d29c', 16);
        this.soltarCera(it.img.x, it.img.y, 3);
        this.removerItemChao(it);
      } else if (run.armas.some((w) => w.id === it.id)) {
        this.encherMunicao(2, it.id);
        Som.tocar('municao');
        avisar('+ MUNIÇÃO', '#a3d977');
        this.removerItemChao(it);
      } else if (run.armas.length < D.config.maxArmas) {
        this.pegarArma(it);
      } else this.trocaPendente = it;
    }
  }

  private pegarArma(it: ItemChao) {
    const run = Estado.run!;
    run.armas.push(novaArma(it.id));
    run.armaAtual = run.armas.length - 1;
    this.jogador.recarregando = 0;
    this.aquecimento = 0;
    this.anunciarArma(arma(it.id));
    this.removerItemChao(it);
    this.verificarSinergias();
  }

  /** Troca a arma atual pela do chão (a antiga fica no lugar). */
  private trocarPelaDoChao(it: ItemChao) {
    const run = Estado.run!;
    const antiga = run.armas[run.armaAtual];
    const { x, y } = it.img;
    this.removerItemChao(it);
    run.armas[run.armaAtual] = novaArma(it.id);
    this.jogador.recarregando = 0;
    this.aquecimento = 0;
    this.time.delayedCall(10, () => this.criarItemChao('arma', antiga.id, x + 14, y + 6, true, { animar: true }));
    this.anunciarArma(arma(it.id));
    this.verificarSinergias();
  }

  /** Banner da arma nova com o tier; as míticas ganham festa. */
  private anunciarArma(def: ArmaDef) {
    const r = raridade(def.raridade);
    mostrarBanner(def.nome.toUpperCase(), `[${r.nome}] ${def.desc}`, r.cor, def.raridade >= 4 ? 4 : 2.5);
    Som.tocar('pegarArma');
    if (def.raridade >= 5) {
      Som.tocar('frenesi');
      this.piscar(255, 160, 60, 220);
      this.camaraLenta(0.3, 500);
      this.anelLuz(this.jogador.maoX, this.jogador.maoY, 0xff9a2e, 50);
    } else if (def.raridade >= 4) this.anelLuz(this.jogador.maoX, this.jogador.maoY, 0xc86bff, 40);
    // a TETE late quando chega (e as gatas miam), em qualquer tier (fusões também)
    if (def.som === 'latido' || def.som === 'miau') this.time.delayedCall(250, () => Som.tocar(def.som));
  }

  private pegarAtivo(it: ItemChao) {
    const run = Estado.run!;
    const def = ativo(it.id)!;
    const antigo = run.ativo;
    const { x, y } = it.img;
    if (it.img.getData('pedestal')) Estado.sala!.comprado.J = true;
    this.removerItemChao(it);
    run.ativo = { id: def.id, carga: def.carga };
    if (antigo) this.time.delayedCall(10, () => this.criarItemChao('ativo', antigo.id, x + 14, y + 10, true, { animar: true }));
    mostrarBanner(`${def.maldito ? 'MALDITO: ' : ''}${def.nome.toUpperCase()}`, `${def.desc}  [C] usa`, def.maldito ? '#c86bff' : def.cor, 3.5);
    Som.tocar('reliquia');
    this.anelLuz(this.jogador.maoX, this.jogador.maoY, this.cor(def.cor), 30);
  }

  private encherMunicao(pentes: number, so?: string) {
    for (const w of Estado.run!.armas) {
      if (w.reserva < 0 || (so && w.id !== so)) continue;
      const def = arma(w.id);
      w.reserva = Math.min(def.municao, w.reserva + Math.round(def.pente * pentes));
    }
  }

  private pegarItem(id: string) {
    const run = Estado.run!;
    const antes = run.stats;
    run.itens.push(id);
    run.stats = calcularStats(run, Estado.meta);
    run.stats.chamaMax = Math.max(10, run.stats.chamaMax);
    if (run.stats.chamaMax > antes.chamaMax) run.chama += run.stats.chamaMax - antes.chamaMax;
    run.chama = Math.min(run.chama, run.stats.chamaMax); // itens que tiram chama máxima
    if (run.stats.dashes > antes.dashes) this.jogador.dashCargas += run.stats.dashes - antes.dashes;
    const it = item(id)!;
    if (it.especial === 'cura') run.chama = run.stats.chamaMax;
    checarConquista('malditos', run.itens.filter((i) => item(i)?.maldito).length);
    // mostra as etiquetas do item e quanto falta para as sinergias
    const dica = dicaDeEtiquetas(id, run.itens);
    if (dica.linha) Estado.dica = { ...dica, vida: 4.5 };
    // itens malditos: o banner deixa claro que tem um preço
    if (it.maldito) {
      mostrarBanner(`MALDITO: ${it.nome.toUpperCase()}`, it.desc, '#c86bff', 4);
      this.piscar(120, 40, 160, 120);
    } else mostrarBanner(it.nome.toUpperCase(), it.desc, it.cor, 3.5);
    Som.tocar('reliquia');
    this.anelLuz(this.jogador.maoX, this.jogador.maoY, this.cor(it.cor), 30);
    this.atualizarAparencia();
    this.posicionarFamiliares();
    this.fx.recarregarItens();
    if (it.especial === 'escudo') this.escudoAtivo = true;
    this.time.delayedCall(900, () => this.verificarSinergias());
  }

  /** Anuncia sinergias novas (itens que combinam entre si ou com uma arma). */
  private verificarSinergias() {
    const run = Estado.run!;
    const tags = contarTags(run.itens);
    const armasRun = run.armas.map((w) => w.id);
    for (const s of D.sinergias) {
      if (run.sinergias.includes(s.id)) continue;
      if (!sinergiaCompleta(s, run.itens, armasRun, tags)) continue;
      run.sinergias.push(s.id);
      const nova = !Estado.meta.sinergiasVistas.includes(s.id);
      if (nova) {
        Estado.meta.sinergiasVistas.push(s.id);
        salvarMeta(Estado.meta);
        checarConquista('sinergias', Estado.meta.sinergiasVistas.length);
      }
      if (s.transformacao) {
        // transformação: festa maior que sinergia
        mostrarBanner(`TRANSFORMAÇÃO: ${s.nome}!`, s.desc, '#ff8ac8', 5);
        this.piscar(255, 255, 255, 400);
        this.camaraLenta(0.2, 900);
        this.tremer(400, 0.01);
        for (let k = 0; k < 4; k++) this.time.delayedCall(k * 120, () => this.anelLuz(this.jogador.maoX, this.jogador.maoY, 0xff8ac8, 30 + k * 15));
      } else mostrarBanner(nova ? `NOVA SINERGIA: ${s.nome}` : `SINERGIA: ${s.nome}`, s.desc, CORES.ouro, 4);
      Som.tocar('frenesi');
      this.piscar(255, 210, 63, 150);
      this.camaraLenta(0.4, 350);
      this.anelLuz(this.jogador.maoX, this.jogador.maoY, 0xffd23f, 40);
      run.stats = calcularStats(run, Estado.meta);
      run.chama = Math.min(run.chama, run.stats.chamaMax);
      this.atualizarAparencia();
      this.posicionarFamiliares();
      this.fx.recarregarItens();
    }
  }

  /** A vela muda de cara com os itens. */
  private atualizarAparencia() {
    const run = Estado.run!;
    // a aura ganha a cor da transformação mais recente
    const cores: Record<string, number> = { dourada: 0xffd23f, vermelha: 0xff4a2e, azul: 0x4f9dff, verde: 0x7fe84f, branca: 0xffffff, ciano: 0x7fe8ff, roxa: 0xb06bff };
    const tr = D.sinergias.filter((x) => x.transformacao && run.sinergias.includes(x.id)).pop();
    this.corAura = tr?.visual?.chama ? cores[tr.visual.chama] ?? 0xffa040 : 0xffa040;
    const ap = aparenciaDosItens(run.itens);
    this.baseAlpha = ap.alpha;
    const j = this.jogador;
    const pers = personagem(j.personagem);
    if (pers.tipo !== 'vela' && pers.tipo !== 'chama') return;
    // a base do personagem (cor da cera, chama, acessórios) e os itens por cima
    if (ap.chama === 'padrao' && pers.chama) ap.chama = pers.chama;
    ap.chamas = Math.max(ap.chamas, pers.chamas ?? 1);
    ap.acessorios = [...(pers.acessorios ?? []), ...ap.acessorios];
    const chave = aplicarAparencia(this, ap, { id: pers.id, corpo: pers.corpo, cores: pers.cores });
    const andando = j.anims.currentAnim?.key === j.animAndar;
    j.setTexture(chave, 0);
    j.play(andando ? j.animAndar : j.animParado, false);
    for (const g of this.gemeas) g.setTexture(chave, 0).play(`heroi_${pers.id}_parado`);
  }

  // ---------- familiares: orbes e velinha gêmea ----------

  private posicionarFamiliares() {
    const esp = especiais(Estado.run!.itens);
    while (this.orbes.length < esp.orbes) {
      this.orbes.push(this.add.image(this.jogador.x, this.jogador.y, 'bala_grande').setTint(0xffe0a0).setScale(1.6).setDepth(4600));
    }
    while (this.gemeas.length < esp.gemeas) {
      const g = this.add.sprite(this.jogador.x - 12, this.jogador.y + 4, this.jogador.texture.key, 0).setScale(0.6).setDepth(10);
      if (this.jogador.personagem === 'vela') g.play('heroi_vela_parado');
      this.gemeas.push(g);
    }
    this.gemeas.forEach((g, i) => g.setPosition(this.jogador.x - 12 - i * 8, this.jogador.y + 4));
  }

  private atualizarFamiliares(dt: number) {
    const j = this.jogador;
    const s = Estado.run!.stats;
    const t = this.time.now / 1000;
    this.danoOrbe -= dt;
    this.orbes.forEach((o, i) => {
      const a = t * 3 + (i / this.orbes.length) * Math.PI * 2;
      o.setPosition(j.maoX + Math.cos(a) * 18, j.maoY + Math.sin(a) * 18);
      for (const p of this.projeteis.getChildren().slice()) {
        const ps = p as Sprite;
        if (Phaser.Math.Distance.Between(o.x, o.y, ps.x, ps.y) < 6) this.estourarProjetil(ps);
      }
      if (this.danoOrbe <= 0) {
        for (const ini of this.listaInimigos()) {
          if (!ini.morto && Phaser.Math.Distance.Between(o.x, o.y, ini.x, ini.y) < 10) this.ferirInimigo(ini, 1.5 * s.dano, null, 'raio');
        }
      }
    });
    if (this.danoOrbe <= 0) this.danoOrbe = 0.25;

    if (!this.gemeas.length) return;
    const esp = especiais(Estado.run!.itens);
    this.tiroGemea -= dt;
    const lado = j.flipX ? 1 : -1;
    this.gemeas.forEach((g, i) => {
      g.x += (j.x + lado * (12 + i * 8) - g.x) * Math.min(1, dt * 6);
      g.y += (j.y + 4 - g.y) * Math.min(1, dt * 6);
      g.setDepth(10 + g.y);
      g.setFlipX(j.flipX);
    });
    if (this.tiroGemea > 0) return;
    this.tiroGemea = esp.gemeaDupla ? 0.3 : 0.6;
    const pistola = arma('pistola');
    for (const g of this.gemeas) {
      let alvo: Inimigo | null = null;
      let melhor = 160;
      for (const ini of this.listaInimigos()) {
        if (ini.morto || ini.fase === 'surgindo') continue;
        const d = Phaser.Math.Distance.Between(g.x, g.y, ini.x, ini.y);
        if (d < melhor) {
          melhor = d;
          alvo = ini;
        }
      }
      if (!alvo) continue;
      const ang = Math.atan2(alvo.y - g.y, alvo.x - g.x);
      this.criarBala(g.x, g.y - 4, ang, 260, 0.7, pistola, {}, 1 * s.dano).setScale(1.4, 0.7);
      Som.tocar('pistola');
    }
  }

  private verificarInteracoes(apertou: boolean) {
    const j = this.jogador;
    let alvo: Interativo | null = null;
    let melhor = 22;
    for (const it of this.interativos) {
      const d = Phaser.Math.Distance.Between(j.x, j.y, it.x, it.y);
      if (d < melhor) {
        melhor = d;
        alvo = it;
      }
    }
    if (alvo) {
      Estado.prompt = this.textoInteracao(alvo);
      if (apertou) this.interagir(alvo);
    } else if (this.trocaPendente) {
      Estado.prompt = `[E] Trocar ${arma(this.armaAtual.id).nome} por ${arma(this.trocaPendente.id).nome}`;
      if (apertou) this.trocarPelaDoChao(this.trocaPendente);
    } else if (this.trocaAtivo) {
      const novo = ativo(this.trocaAtivo.id)!;
      Estado.prompt = `[E] Trocar ${ativo(Estado.run!.ativo!.id)!.nome} por ${novo.nome}: ${novo.desc}`;
      if (apertou) this.pegarAtivo(this.trocaAtivo);
    } else Estado.prompt = '';
  }

  private textoInteracao(it: Interativo) {
    const p = D.config.precos;
    const sala = Estado.sala!;
    switch (it.tipo) {
      case 'castical':
        return `[E] Acender o castiçal · ${p.castical} cera`;
      case 'bau':
        return '[E] Abrir o baú';
      case 'loja_r': {
        const r = item(sala.itemLoja ?? '');
        if (r && Estado.run!.maldicao === 'cegueira') return `[E] Item misterioso · ${p.item} cera`;
        return r ? `[E] ${r.nome}: ${r.desc} · ${p.item} cera` : '';
      }
      case 'loja_a':
        return sala.armaLoja ? `[E] ${arma(sala.armaLoja).nome} · ${p.arma} cera` : '';
      case 'loja_m':
        return `[E] Caixa de munição · ${p.municao} cera`;
      case 'loja_v':
        return `[E] Vela nova (chama cheia) · ${p.vela} cera`;
      case 'loja_j': {
        const a = ativo(sala.ativoLoja ?? '');
        return a ? `[E] ${a.nome}: ${a.desc} · ${p.ativo} cera` : '';
      }
      case 'saida':
        return '[E] Levar a luz para casa (termina a partida vencendo)';
      case 'estudio':
        return '[E] Entrar no Estúdio (chefe secreto)';
      case 'fonte':
        return sala.usos >= 5 ? 'A fonte secou.' : '[E] Jogar 8 de cera na fonte';
      case 'troca': {
        const ultimo = this.itemParaTrocar();
        return ultimo ? `[E] Trocar ${item(ultimo)!.nome} por um item mais raro` : 'Você não tem um item para trocar.';
      }
      case 'forja': {
        const run = Estado.run!;
        if (run.armas.length < 2) return 'A bigorna precisa de 2 armas para fundir.';
        const a = arma(run.armas[run.armaAtual].id).nome;
        const b = arma(run.armas[(run.armaAtual + 1) % run.armas.length].id).nome;
        return `[E] Fundir ${a} + ${b} numa arma só`;
      }
      case 'slot':
        return sala.usos >= 10 ? 'O caça-níquel quebrou de tanto girar.' : '[E] Jogar no caça-níquel · 5 cera';
      case 'doacao': {
        const d = Estado.meta.doado;
        return d >= 100 ? `[E] Doar 5 cera (você já doou ${d}. Obrigado!)` : `[E] Doar 5 cera para as velinhas (${d}/100)`;
      }
      case 'amigo':
        return sala.comprado.Z ? `[E] Falar com ${personagem(sala.amigo ?? 'luiz').nome}` : `[E] Falar com ${personagem(sala.amigo ?? 'luiz').nome} (presente!)`;
    }
  }

  private interagir(it: Interativo) {
    const run = Estado.run!;
    const sala = Estado.sala!;
    const p = D.config.precos;
    const remover = () => (this.interativos = this.interativos.filter((i) => i !== it));
    const pagar = (preco: number) => {
      if (run.cera < preco) {
        Som.tocar('erro');
        mostrarBanner('', `Você precisa de ${preco} de cera`, CORES.perigo, 1.4);
        return false;
      }
      run.cera -= preco;
      return true;
    };
    const vendido = (ch: string) => {
      sala.comprado[ch] = true;
      it.item?.destroy();
      Som.tocar('compra');
      remover();
    };

    switch (it.tipo) {
      case 'castical':
        if (!pagar(p.castical)) return;
        sala.casticalAceso = true;
        it.spr.play('castical_aceso');
        this.luzesFixas.push({ x: it.x, y: it.y - 6, r: 64 });
        run.chama = run.stats.chamaMax;
        Som.tocar('acender');
        this.faiscas(it.x, it.y - 8, 0xffe066, 14);
        mostrarBanner('CASTIÇAL ACESO', 'Sua chama foi restaurada.', CORES.chama);
        remover();
        break;
      case 'bau': {
        sala.comprado.T = true;
        it.spr.play('bau_abrir');
        this.luzesFixas = this.luzesFixas.filter((l) => !(l.x === it.x && l.y === it.y));
        Som.tocar('bau');
        const sorte = run.stats.sorte;
        const r = Math.random();
        if (r < 0.08) {
          const id = this.sortearAtivo();
          if (id) this.criarItemChao('ativo', id, it.x, it.y + 20, true, { animar: true });
          else this.soltarCera(it.x, it.y + 12, 6);
        } else if (r < 0.24 + sorte * 0.05) {
          const id = this.sortearItem(1);
          if (id) this.criarItemChao('item', id, it.x, it.y + 20, true, { animar: true });
          else this.soltarCera(it.x, it.y + 12, 6);
        } else if (r < 0.36) {
          const id = this.sortearArma();
          if (id) this.criarItemChao('arma', id, it.x, it.y + 20, true, { animar: true });
          else this.soltarCera(it.x, it.y + 12, 6);
        } else {
          this.soltarCera(it.x, it.y + 12, Phaser.Math.Between(4, 7));
          if (Math.random() < 0.5) this.criarItemChao('municao', 'municao', it.x + 10, it.y + 16, true);
        }
        remover();
        break;
      }
      case 'loja_r': {
        const id = sala.itemLoja;
        if (!id || !pagar(p.item)) return;
        vendido('R');
        this.pegarItem(id);
        break;
      }
      case 'loja_a': {
        const id = sala.armaLoja;
        if (!id || !pagar(p.arma)) return;
        vendido('A');
        this.criarItemChao('arma', id, it.x, it.y + 22, true, { animar: true });
        break;
      }
      case 'loja_j': {
        const id = sala.ativoLoja;
        if (!id || !pagar(p.ativo)) return;
        vendido('J');
        this.criarItemChao('ativo', id, it.x, it.y + 22, true, { animar: true });
        break;
      }
      case 'saida':
        remover();
        this.sairComALuz();
        break;
      case 'estudio':
        remover();
        this.irParaEstudio();
        break;
      case 'fonte':
        if (sala.usos >= 5 || !pagar(8)) return;
        sala.usos++;
        this.desejo(it.x, it.y);
        break;
      case 'troca': {
        const velho = this.itemParaTrocar();
        if (!velho) {
          Som.tocar('erro');
          return;
        }
        sala.comprado.Q = true;
        remover();
        this.trocarNoAltar(velho, it.x, it.y);
        break;
      }
      case 'amigo':
        this.falarComAmigo(it.x, it.y);
        break;
      case 'forja':
        if (run.armas.length < 2) {
          Som.tocar('erro');
          return;
        }
        sala.comprado.B = true;
        remover();
        this.forjar(it);
        break;
      case 'slot':
        if (sala.usos >= 10 || this.girando || !pagar(5)) return;
        sala.usos++;
        this.jogarCacaNiquel(it);
        break;
      case 'doacao':
        if (!pagar(5)) return;
        this.doar(it);
        break;
      case 'loja_m':
        if (!pagar(p.municao)) return;
        vendido('M');
        this.encherMunicao(99);
        avisar('MUNIÇÃO CHEIA', '#a3d977');
        break;
      case 'loja_v':
        if (!pagar(p.vela)) return;
        vendido('V');
        run.chama = run.stats.chamaMax;
        mostrarBanner('VELA NOVA', 'Chama restaurada.', CORES.chama, 2);
        break;
    }
  }

  private salaLimpa() {
    const sala = Estado.sala!;
    sala.limpa = true;
    for (const obj of this.portas.getChildren()) {
      const p = obj as Sprite;
      this.faiscas(p.x, p.y, 0x9a93a3, 4);
    }
    this.portas.clear(true, true);
    Som.tocar('porta');
    Som.tocar('salaLimpa');
    const run = Estado.run!;
    if (run.stats.curaSala) {
      run.chama = Math.min(run.stats.chamaMax, run.chama + run.stats.curaSala);
      popup(this.jogador.x, this.jogador.y - 30, `+${run.stats.curaSala}`, CORES.chama, 16);
    }
    this.carregarAtivo();
    if (sala.tipo === 'tutorial') {
      const ultima = (sala.etapa ?? 0) >= D.salas.tutorial.length - 1;
      Estado.instrucao = ultima ? 'Pronto! Desça a escada para terminar o tutorial.' : 'Muito bem! Siga pela porta da direita.';
      if (ultima) {
        sala.escadaAberta = true;
        this.criarEscada(true);
      }
    }
    this.fx.evento('limpar', { x: this.jogador.x, y: this.jogador.y });
    this.time.delayedCall(50, () => salvarPartida());
    if (sala.tipo === 'desafio') this.desafioVencido();
    this.camaraLenta(0.3, 450);
    popup(this.jogador.x, this.jogador.y - 18, 'LIMPO!', '#7fdc8a', 24);
    this.tweens.add({ targets: this.cameras.main, zoom: ZOOM * 1.06, duration: 110, yoyo: true, ease: 'Quad.out' });
    // recompensa: às vezes aparece um baú
    if (sala.tipo === 'combate' && Math.random() < D.config.combate.chanceBau * (1 + Estado.run!.stats.sorte * 0.5)) {
      const p = this.posicaoLivre(MUNDO_L / 2, OY + 96, 0);
      const s = this.solidoBase(this.solidos, p.x, p.y, 'bau', 0, 14, 10);
      this.interativos.push({ tipo: 'bau', x: p.x, y: p.y, spr: s });
      this.luzesFixas.push({ x: p.x, y: p.y, r: 18 });
      popup(p.x, p.y - 14, 'BAÚ!', CORES.ouro, 16);
    } else if (sala.tipo === 'combate' && Math.random() < 0.3) this.soltarCera(MUNDO_L / 2, OY + 96, 2);
  }

  private chefeDerrotado(x: number, y: number, tipo: string) {
    Estado.chefe = null;
    this.chefe = null;
    const run = Estado.run!;
    Som.tocar('explosao');
    Som.musica(null);
    this.tremer(700, 0.012);
    this.camaraLenta(0.2, 900);
    this.piscar(255, 255, 255, 200);
    for (const obj of this.projeteis.getChildren().slice()) this.estourarProjetil(obj as Sprite);
    for (const ini of this.listaInimigos()) if (!ini.morto && !ini.ehChefe) this.matarInimigo(ini);
    this.soltarCera(x, y, 12);
    // O Criador: o final secreto
    if (tipo === 'criador') {
      checarConquista('chefe', 'criador');
      mostrarBanner('O CRIADOR', `"${D.inimigos.criador.falas?.morte ?? 'GG.'}"`, '#7fdc8a', 4);
      this.time.delayedCall(3500, () => this.terminar(true));
      return;
    }
    // quantas vezes cada chefe já caiu (O Pavio Negro precisa cair 2 vezes para abrir "O Outro Lado")
    const meta = Estado.meta;
    meta.chefesMortos[tipo] = (meta.chefesMortos[tipo] ?? 0) + 1;
    salvarMeta(meta);
    checarConquista('chefe', tipo);
    checarConquista('chefeVezes', tipo);
    if (this.semDanoChefe) checarConquista('intocavel');
    run.outroLado ||= meta.conquistas.includes('negro2');

    const m = marcos();
    const a = run.andar;
    // O Apagador sem o Abismo liberado: o fim da história (a primeira vez é sempre assim)
    if (a === m.apagador && !run.abismo) {
      mostrarBanner('O APAGADOR CAIU', 'A Chama Primeira está livre...', CORES.ouro, 3);
      this.time.delayedCall(2600, () => this.terminar(true));
      return;
    }
    // depois do Apagador, do Pavio Negro e do Acendedor dá para sair pela luz (um final para cada)
    const saida = a >= m.apagador;
    const descer = a !== m.abismo || run.outroLado;
    const nome = (D.inimigos[tipo]?.nome ?? 'O chefe').toUpperCase();
    const ultimaFala = D.inimigos[tipo]?.falas?.morte;
    if (a === m.apagador) mostrarBanner('O APAGADOR CAIU', 'Leve a luz para casa... ou desça ao ABISMO.', CORES.ouro, 4);
    else if (a === m.abismo && descer) mostrarBanner('A SOMBRA CAIU', 'Saia pela luz... ou atravesse para O OUTRO LADO.', '#c86bff', 4.5);
    else if (a === m.abismo) {
      const faltam = Math.max(1, 2 - (meta.chefesMortos[tipo] ?? 0));
      mostrarBanner('A SOMBRA CAIU', `Saia pela luz. (Vença O Pavio Negro mais ${faltam} vez para abrir O OUTRO LADO)`, '#c86bff', 5);
    } else if (a === m.acendedor) mostrarBanner('O ACENDEDOR CAIU', 'A primeira chama se apagou. Saia pela luz... ou desça para sempre.', CORES.ouro, 5);
    else if (saida) mostrarBanner(`${nome} CAIU`, 'Saia com a vitória... ou desça mais fundo.', '#c86bff', 4);
    else mostrarBanner('CHEFE DERROTADO', 'Pegue sua recompensa e desça.', CORES.ouro, 3);
    // as últimas palavras do chefe aparecem primeiro
    if (ultimaFala) {
      const depois = Estado.banner;
      mostrarBanner(nome, `"${ultimaFala}"`, CORES.texto, 2.4);
      this.time.delayedCall(2400, () => depois && (Estado.banner = { ...depois, vida: depois.vida }));
    }
    // a recompensa e a escada ficam salvas NA SALA na hora: se você sair e voltar, continuam lá
    const sala = Estado.sala!;
    sala.escadaAberta = descer;
    if (saida) sala.comprado.saida = true;
    if (a === m.acendedor && ['apagador', 'negro', 'acendedor'].every((f) => meta.finais.includes(f))) {
      sala.comprado.estudio = true;
      this.time.delayedCall(4000, () => mostrarBanner('UMA PORTA ESTRANHA...', 'Alguém está te esperando no Estúdio.', '#7fdc8a', 3.5));
    }
    const escolha = saida;
    const id = this.sortearItem(2) ?? this.sortearItem(1);
    if (id) sala.itensChao.push({ tipo: 'item', id, x: MUNDO_L / 2, y: OY + 80 });
    this.time.delayedCall(800, () => {
      if (Estado.sala !== sala) return; // já saiu: aparece quando voltar
      Som.musica('calmo');
      if (id) this.criarItemChao('item', id, MUNDO_L / 2, OY + 80, false, { animar: true });
      if (descer) this.criarEscada(true);
      if (escolha) this.criarSaida(true);
      if (sala.comprado.estudio) this.criarPortaEstudio(true);
    });
  }

  // ===================== Eventos surpresa =====================

  private iniciarEvento() {
    const opcoes = ['apagao', 'chuva', 'tortas', 'ladrao', 'furia'] as const;
    this.evento = opcoes[Math.floor(Math.random() * opcoes.length)];
    this.eventoT = 0;
    const textos: Record<string, [string, string, string]> = {
      apagao: ['APAGÃO!', 'Só a sua chama ilumina... por enquanto.', '#9fd0ff'],
      chuva: ['CHUVA DE CERA!', 'Cai cera do teto. Pegue o que puder!', CORES.ouro],
      tortas: ['BALAS TORTAS!', 'Nesta sala as balas fazem curva.', '#c86bff'],
      ladrao: ['UM LADRÃO!', 'Ele quer a sua cera. Não deixe ele fugir!', CORES.ouro],
      furia: ['SALA EM FÚRIA!', 'Monstros mais rápidos... e o dobro de cera.', CORES.perigo],
    };
    const [t, d, cor] = textos[this.evento];
    mostrarBanner(`EVENTO: ${t}`, d, cor, 2.6);
    Som.tocar('onda');
    if (this.evento === 'apagao') this.escuridao.setVisible(true);
    if (this.evento === 'ladrao') {
      const pos = this.posicaoLivre(this.jogador.x, this.jogador.y, 90);
      this.criarInimigo('ladrao', pos.x, pos.y);
    }
  }

  private atualizarEvento(dt: number) {
    if (!this.evento) return;
    this.eventoT += dt;
    switch (this.evento) {
      case 'apagao':
        if (this.eventoT > 12) {
          this.escuridao.setVisible(Estado.sala!.escura);
          this.evento = null;
          mostrarBanner('', 'A luz voltou.', CORES.textoApagado, 1.5);
        }
        break;
      case 'chuva':
        if (this.eventoT > 8) this.evento = null;
        else if (Math.floor(this.eventoT / 0.3) !== Math.floor((this.eventoT - dt) / 0.3)) {
          const pos = this.posicaoLivre(MUNDO_L / 2, OY + 96, 0);
          this.soltarCera(pos.x, pos.y, 1);
        }
        break;
      case 'tortas':
        for (const obj of this.projeteis.getChildren()) {
          const pr = obj as Sprite;
          if (pr.getData('mina') !== undefined) continue;
          let lado = pr.getData('curva') as number | undefined;
          if (lado === undefined) pr.setData('curva', (lado = Math.random() < 0.5 ? -1 : 1));
          pr.body!.velocity.rotate(lado * 1.4 * dt);
        }
        break;
    }
  }

  /** O ladrão encostou: leva cera. */
  private roubar(ini: Inimigo) {
    if (ini.getData('roubou')) return;
    const run = Estado.run!;
    const qtd = Math.min(run.cera, 15);
    run.cera -= qtd;
    ini.setData('roubou', Math.max(1, qtd));
    ini.timer = 4;
    popup(ini.x, ini.y - 14, `-${qtd} CERA!`, CORES.perigo, 16);
    Som.tocar('erro');
  }

  ladraoFugiu(ini: Inimigo) {
    popup(ini.x, ini.y - 14, 'FUGIU!', CORES.perigo, 16);
    this.faiscas(ini.x, ini.y, 0xffd23f, 10);
    this.matarSemRecompensa(ini);
  }

  // ===================== Tutorial =====================

  private static LICOES = [
    'ANDAR E ATIRAR: WASD anda, o MOUSE mira e o CLIQUE atira. Destrua os 3 bonecos.',
    'ESQUIVA: ESPAÇO dá um dash e você fica intocável. Dê 3 dashes no meio das balas. Passar raspando = ESQUIVA PERFEITA!',
    'PARRY: CLIQUE DIREITO (ou F) bem quando a bala chega e ela volta dourada. Rebata 3 balas.',
    'ITENS: passe por cima dos pedestais para pegar. O item ATIVO se usa com C. Pegue os dois e use o ativo.',
    'SEGREDOS: caixotes quebram com tiros e escondem cera. PAREDES RACHADAS escondem salas secretas. Quebre os caixotes.',
    'COMBATE: monstros soltam CERA, que cura a chama e paga a loja. A chama queima sozinha: não pare! Derrote todos.',
  ];

  private licao(no: NoSala) {
    const etapa = no.etapa ?? 0;
    Estado.instrucao = no.limpa ? 'Muito bem! Siga pela porta da direita.' : Jogo.LICOES[etapa];
    this.tuto = { dashes: 0, parries: Estado.run!.parries, ativo: false };
  }

  /** Confere o objetivo da lição desta sala. */
  private atualizarTutorial() {
    const sala = Estado.sala!;
    if (sala.tipo !== 'tutorial' || sala.limpa) return;
    const run = Estado.run!;
    let feito = false;
    switch (sala.etapa) {
      case 1:
        feito = this.tuto.dashes >= 3;
        break;
      case 2:
        feito = run.parries - this.tuto.parries >= 3;
        break;
      case 3:
        feito = run.itens.length > 0 && this.tuto.ativo;
        break;
      case 4:
        feito = this.caixotes.countActive(true) === 0;
        break;
    }
    if (!feito) return;
    for (const ini of this.listaInimigos()) this.matarSemRecompensa(ini);
    for (const obj of this.projeteis.getChildren().slice()) this.estourarProjetil(obj as Sprite);
    this.salaLimpa();
  }

  private fimDoTutorial() {
    Estado.meta.tutorialFeito = true;
    salvarMeta(Estado.meta);
    Estado.instrucao = '';
    this.transicionando = true;
    mostrarBanner('TUTORIAL COMPLETO!', 'Agora é com você. Boa sorte lá embaixo.', CORES.ouro, 3);
    Som.tocar('frenesi');
    this.cameras.main.fadeOut(1400, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Menu'));
  }

  // ===================== Salas especiais =====================

  /** Fonte dos Desejos: o que sai depende da sorte. */
  private desejo(x: number, y: number) {
    const r = Math.random() - Estado.run!.stats.sorte * 0.03;
    const j = this.jogador;
    Som.tocar('cera');
    this.faiscas(x, y - 8, 0x7fd7ff, 10);
    if (r < 0.28) {
      popup(x, y - 20, 'Plim... nada.', '#9fd0ff', 16);
    } else if (r < 0.46) {
      Estado.run!.chama = Estado.run!.stats.chamaMax;
      popup(j.x, j.y - 20, 'CHAMA CHEIA!', CORES.chama, 16);
      this.anelLuz(j.maoX, j.maoY, 0xffb43a, 30);
    } else if (r < 0.64) {
      this.soltarCera(x, y + 10, 14);
      popup(x, y - 20, 'A fonte devolveu em dobro!', CORES.ouro, 16);
    } else if (r < 0.8) {
      this.itemSurpresa(x + (Math.random() < 0.5 ? -30 : 30), y + 20);
      popup(x, y - 20, 'UM DESEJO REALIZADO!', CORES.ouro, 16);
    } else if (r < 0.9) {
      const id = this.sortearAtivo();
      if (id) this.criarItemChao('ativo', id, x + 30, y + 20, true, { animar: true });
      popup(x, y - 20, 'UM PRESENTE ATIVO!', CORES.ouro, 16);
    } else {
      // a fonte se irrita
      popup(x, y - 20, 'A FONTE SE IRRITOU!', CORES.perigo, 16);
      this.piscar(255, 40, 60, 160);
      for (let k = 0; k < 3; k++) {
        const pos = this.posicaoLivre(j.x, j.y, 60);
        this.criarInimigo(k ? 'esqueleto' : 'chifrudo', pos.x, pos.y, k === 0);
      }
    }
  }

  /** O item que vai para o Altar da Troca: o último que você pegou (menos os exclusivos). */
  private itemParaTrocar() {
    const run = Estado.run!;
    return [...run.itens].reverse().find((id) => !item(id)?.exclusivo) ?? null;
  }

  private trocarNoAltar(velho: string, x: number, y: number) {
    const run = Estado.run!;
    const antes = item(velho)!;
    run.itens.splice(run.itens.lastIndexOf(velho), 1);
    run.sinergias = [];
    run.stats = calcularStats(run, Estado.meta);
    run.chama = Math.min(run.chama, run.stats.chamaMax);
    this.fx.recarregarItens();
    this.atualizarAparencia();
    this.verificarSinergias();
    const novo = this.sortearItem(Math.min(3, antes.raridade + 1)) ?? this.sortearItem(1);
    this.piscar(200, 120, 255, 200);
    Som.tocar('reliquia');
    this.anelLuz(x, y - 6, 0xc86bff, 40);
    mostrarBanner('TROCA FEITA', `${antes.nome} ficou no altar.`, '#c86bff', 2.5);
    if (novo) this.criarItemChao('item', novo, x, y + 26, true, { animar: true });
  }

  /** Os amigos: cada um fala uma coisa e dá um presente (uma vez por sala). */
  private falarComAmigo(x: number, y: number) {
    const sala = Estado.sala!;
    const quem = sala.amigo ?? 'luiz';
    const nome = personagem(quem).nome.toUpperCase();
    const cor = personagem(quem).cor;
    if (sala.comprado.Z) {
      const repeticoes: Record<string, string[]> = {
        luiz: ['Tá gostando do jogo? Fala sério.', 'Se achar um bug, me conta!', 'Vai, a Catedral precisa de você.'],
        ana: ['Não esquece de mim lá embaixo, tá?', 'Toma cuidado com o escuro.', 'Eu fico aqui torcendo!'],
        henrique: ['Bora, vela! Mais uma sala!', 'Treino é treino, jogo é jogo.', 'Se apanhar, levanta e vai de novo.'],
      };
      const lista = repeticoes[quem] ?? repeticoes.luiz;
      mostrarBanner(nome, lista[Math.floor(Math.random() * lista.length)], cor, 2.5);
      return;
    }
    sala.comprado.Z = true;
    Som.tocar('reliquia');
    this.anelLuz(x, y - 10, Phaser.Display.Color.HexStringToColor(cor).color, 40);
    if (quem === 'luiz') {
      // o criador dá uma arma rara
      mostrarBanner(nome, 'E aí! Fiz esse jogo pra você. Toma, separei uma arma das boas.', cor, 4);
      const opcoes = D.armas.filter((a) => a.raridade >= 3 && !a.exclusivo && !Estado.run!.armas.some((w) => w.id === a.id) && !bloqueado('arma', a.id));
      const a = opcoes[Math.floor(Math.random() * opcoes.length)];
      if (a) this.criarItemChao('arma', a.id, x + 40, y + 24, true, { animar: true });
    } else if (quem === 'ana') {
      // a Ana enche a sua chama e dá um item de coração
      mostrarBanner(nome, 'Cuidado aí embaixo! Toma, pra sua chama não apagar.', cor, 4);
      const run = Estado.run!;
      run.chama = run.stats.chamaMax;
      const opcoes = D.itens.filter((i) => i.tags?.includes('coracao') && !run.itens.includes(i.id) && !i.exclusivo && !i.maldito && !bloqueado('item', i.id));
      const it = opcoes[Math.floor(Math.random() * opcoes.length)];
      if (it) this.criarItemChao('item', it.id, x + 40, y + 24, true, { animar: true });
    } else {
      // o Henrique dá um abraço (escudo), cera e um ativo
      mostrarBanner(nome, 'Bora! Abraço de urso, um troco pra loja e um brinquedo novo.', cor, 4);
      this.escudoAtivo = true;
      this.soltarCera(x - 30, y + 20, 12);
      const at = this.sortearAtivo();
      if (at) this.criarItemChao('ativo', at, x + 40, y + 24, true, { animar: true });
    }
  }

  /** Um baú aparece no chão (Caneta do Criador, salas especiais). */
  criarBauEm(x: number, y: number) {
    const s = this.solidoBase(this.solidos, x, y, 'bau', 0, 14, 10);
    s.setScale(1, 0);
    this.tweens.add({ targets: s, scaleY: 1, duration: 300, ease: 'Back.out' });
    this.interativos.push({ tipo: 'bau', x, y, spr: s });
    this.luzesFixas.push({ x, y, r: 18 });
    popup(x, y - 14, 'BAÚ!', CORES.ouro, 16);
    Som.tocar('bau');
  }

  /** Um item sorteado aparece num pedestal, com a animação de chegada. */
  itemSurpresa(x: number, y: number) {
    const id = this.sortearItem(1);
    if (id) this.criarItemChao('item', id, x, y, true, { animar: true });
    else this.soltarCera(x, y, 6);
  }

  /** Saída de luz depois de um chefe: depois do Apagador mostra o final; mais fundo, vai direto para a vitória. */
  private sairComALuz() {
    if (this.fimAgendado || this.transicionando) return;
    this.transicionando = true;
    this.jogador.setVelocity(0, 0);
    Som.tocar('acender');
    this.piscar(255, 240, 200, 600);
    this.time.delayedCall(700, () => this.terminar(true));
  }

  // ===================== Salas de desafio =====================

  private ondaDesafio() {
    const sala = Estado.sala!;
    const total = D.config.desafio.ondas;
    sala.ondas--;
    const run = Estado.run!;
    const nivel = Math.min(run.andar, D.config.infinito.orcamentoMaxAndar);
    const pool = Object.entries(D.inimigos).filter(([, d]) => d.custo > 0 && !d.chefe && d.andarMin <= run.andar).map(([id]) => id);
    const n = 4 + nivel * 2;
    for (let i = 0; i < n; i++) {
      const p = this.posicaoLivre(this.jogador.x, this.jogador.y, 80);
      const tipo = Phaser.Math.RND.pick(pool);
      // a última onda tem mais elites
      const elite = this.sortearElite(tipo) || (sala.ondas === 0 && i < 2 && tipo !== 'zumbi');
      this.criarInimigo(tipo, p.x, p.y, elite);
    }
    Som.tocar('onda');
    this.piscar(255, 40, 60, 140);
    mostrarBanner(`ONDA ${total - sala.ondas}/${total}`, sala.ondas === 0 ? 'A última!' : '', CORES.perigo, 1.6);
  }

  private desafioVencido() {
    const cx = MUNDO_L / 2;
    const cy = OY + 96;
    mostrarBanner('DESAFIO VENCIDO!', 'Pegue o seu prêmio.', CORES.ouro, 3);
    Som.tocar('frenesi');
    checarConquista('desafio');
    const id = this.sortearItem(3) ?? this.sortearItem(2) ?? this.sortearItem(1);
    if (id) this.criarItemChao('item', id, cx - 16, cy, true, { animar: true });
    const at = Math.random() < 0.5 ? this.sortearAtivo() : null;
    if (at) this.criarItemChao('ativo', at, cx + 16, cy, true, { animar: true });
    else this.soltarCera(cx + 14, cy, 8);
  }

  // ===================== Itens ativos =====================

  /** Limpar uma sala carrega o item ativo (como no Binding of Isaac). */
  private carregarAtivo() {
    const run = Estado.run!;
    if (!run.ativo) return;
    const def = ativo(run.ativo.id)!;
    if (run.ativo.carga >= def.carga) return;
    run.ativo.carga = Math.min(def.carga, run.ativo.carga + (this.fx.tem('grimorio') ? 2 : 1));
    if (run.ativo.carga >= def.carga) {
      avisar(`${def.nome.toUpperCase()} PRONTO! [C]`, def.cor);
      Som.tocar('recargaFim');
    }
  }

  private usarAtivo() {
    const run = Estado.run!;
    const j = this.jogador;
    if (!run.ativo || j.morto || this.transicionando || Estado.pausado) return;
    const def = ativo(run.ativo.id)!;
    if (run.ativo.carga < def.carga) {
      Som.tocar('erro');
      avisar(`RECARREGANDO ${run.ativo.carga}/${def.carga} (limpe salas)`, CORES.textoApagado);
      return;
    }
    run.ativo.carga = 0;
    this.tuto.ativo = true;
    const s = run.stats;
    const cor = this.cor(def.cor);
    this.anelLuz(j.maoX, j.maoY, cor, 40);
    popup(j.x, j.y - 22, def.nome.toUpperCase(), def.cor, 16);
    switch (def.efeito) {
      case 'bomba':
        this.explodir(j.x, j.y, 52, 14 * s.dano);
        break;
      case 'sopro':
        for (const obj of this.projeteis.getChildren().slice()) this.estourarProjetil(obj as Sprite);
        for (const ini of this.listaInimigos()) {
          if (ini.morto || ini.ehChefe) continue;
          const d = new Phaser.Math.Vector2(ini.x - j.x, ini.y - j.y).normalize();
          this.ferirInimigo(ini, 1 * s.dano, d, undefined, 260);
        }
        this.piscar(190, 230, 255, 160);
        Som.tocar('parry');
        break;
      case 'relogio':
        for (const ini of this.listaInimigos()) if (!ini.morto) ini.aplicarStatus('congelado', 4);
        for (const obj of this.projeteis.getChildren()) (obj as Sprite).body!.velocity.scale(0.25);
        this.camaraLenta(0.3, 500);
        Som.tocar('esquiva');
        break;
      case 'cura':
        run.chama = Math.min(s.chamaMax, run.chama + 40);
        popup(j.x, j.y - 34, '+40', CORES.chama, 16);
        Som.tocar('acender');
        break;
      case 'espelho':
        this.espelhoT = 3;
        Som.tocar('parryTentativa');
        break;
      case 'furia':
        this.furiaT = 6;
        this.piscar(255, 60, 40, 140);
        Som.tocar('frenesi');
        break;
      case 'teleporte': {
        const alvo = this.destinoTeleporte();
        this.faiscas(j.x, j.y, cor, 14, 14);
        j.setPosition(alvo.x, alvo.y);
        j.invencivel = Math.max(j.invencivel, 0.5);
        this.explodir(alvo.x, alvo.y, 30, 6 * s.dano);
        this.posicionarFamiliares();
        break;
      }
      case 'dado':
        this.rolarDado();
        break;
      case 'torre': {
        const t = this.add.sprite(j.x, j.y + 2, 'castical', 1).setOrigin(0.5, 1).setDepth(10 + j.y).play('castical_aceso');
        this.torres.push({ spr: t, t: 10, tiro: 0 });
        Som.tocar('acender');
        break;
      }
      case 'composto':
        for (const e of def.efeitos ?? []) this.fx.executar(e, { x: j.x, y: j.y });
        break;
      case 'sino': {
        // maldito: limpa a sala, mas cobra chama
        run.chama = Math.max(1, run.chama - 30);
        popup(j.x, j.y - 34, '-30', CORES.perigo, 16);
        for (const ini of this.listaInimigos()) {
          if (ini.morto) continue;
          if (ini.ehChefe) this.ferirInimigo(ini, ini.vidaMax * 0.15, null, 'raio');
          else this.matarInimigo(ini);
        }
        Som.tocar('chefeRugido');
        this.piscar(200, 100, 255, 300);
        this.tremer(400, 0.012);
        break;
      }
    }
  }

  /** Vela Fugaz: vai para onde o mouse aponta (ou na direção da mira), sem entrar em paredes. */
  private destinoTeleporte() {
    const j = this.jogador;
    let tx: number;
    let ty: number;
    if (Estado.usandoMouse) {
      const p = this.input.activePointer;
      p.updateWorldPoint(this.cameras.main);
      tx = p.worldX;
      ty = p.worldY;
    } else {
      tx = j.x + j.mira.x * 80;
      ty = j.y + j.mira.y * 80;
    }
    // volta pelo caminho até achar chão livre
    for (let k = 0; k <= 20; k++) {
      const x = Phaser.Math.Linear(tx, j.x, k / 20);
      const y = Phaser.Math.Linear(ty, j.y, k / 20);
      const c = Math.floor(x / TILE);
      const r = Math.floor((y - OY) / TILE);
      if (r >= 1 && r <= ROWS - 2 && c >= 1 && c <= COLS - 2 && CHAO.includes(this.grade[r][c])) return { x, y };
    }
    return { x: j.x, y: j.y };
  }

  /** Dado de Cera: troca os itens (e ativos) do chão, do pedestal e da loja por outros. */
  private rolarDado() {
    const sala = Estado.sala!;
    let rolou = 0;
    for (const it of this.itensChao) {
      if (it.tipo !== 'item' && it.tipo !== 'ativo') continue;
      const novo = it.tipo === 'item' ? this.sortearItem(1) : this.sortearAtivo();
      if (!novo) continue;
      const salvo = sala.itensChao.find((i) => i.tipo === it.tipo && i.id === it.id);
      if (salvo) salvo.id = novo;
      if (it.img.getData('pedestal')) {
        if (it.tipo === 'item') sala.itemTesouro = novo;
        else sala.ativoPedestal = novo;
      }
      it.id = novo;
      it.img.setTexture(`icone_${novo}`);
      this.faiscas(it.img.x, it.img.y, 0xffffff, 10);
      rolou++;
    }
    for (const it of this.interativos) {
      if (it.tipo === 'loja_r' && sala.itemLoja) {
        const novo = this.sortearItem(1);
        if (novo) {
          sala.itemLoja = novo;
          it.item?.setTexture(`icone_${novo}`);
          rolou++;
        }
      } else if (it.tipo === 'loja_j' && sala.ativoLoja) {
        const novo = this.sortearAtivo();
        if (novo) {
          sala.ativoLoja = novo;
          it.item?.setTexture(`icone_${novo}`);
          rolou++;
        }
      }
    }
    Som.tocar(rolou ? 'reliquia' : 'erro');
    if (!rolou) avisar('NADA PARA ROLAR AQUI', CORES.textoApagado);
  }

  /** Castiçal Portátil: atira no monstro mais perto por 10 segundos. */
  private atualizarTorres(dt: number) {
    if (!this.torres.length) return;
    const pistola = arma('pistola');
    const s = Estado.run!.stats;
    this.torres = this.torres.filter((t) => {
      t.t -= dt;
      t.tiro -= dt;
      if (t.t <= 0) {
        this.faiscas(t.spr.x, t.spr.y - 10, 0xffd23f, 10);
        t.spr.destroy();
        return false;
      }
      if (t.t < 2) t.spr.setAlpha(Math.floor(t.t * 8) % 2 ? 0.4 : 1);
      if (t.tiro <= 0) {
        let alvo: Inimigo | null = null;
        let melhor = 200;
        for (const ini of this.listaInimigos()) {
          if (ini.morto || ini.fase === 'surgindo') continue;
          const d = Phaser.Math.Distance.Between(t.spr.x, t.spr.y, ini.x, ini.y);
          if (d < melhor) {
            melhor = d;
            alvo = ini;
          }
        }
        if (alvo) {
          t.tiro = 0.22;
          const ang = Math.atan2(alvo.y - (t.spr.y - 12), alvo.x - t.spr.x);
          this.criarBala(t.spr.x, t.spr.y - 12, ang, 280, 0.8, pistola, {}, 1.2 * s.dano).setTint(0xffd23f).setData('cor', 0xffd23f);
          Som.tocar('pistola');
        }
      }
      return true;
    });
  }

  // ===================== Parry, esquiva, câmera lenta e efeitos =====================

  private tentarParry() {
    const j = this.jogador;
    if (j.morto || j.parryRecarga > 0 || this.transicionando) return;
    const cfg = D.config.parry;
    j.parryT = cfg.janela + Estado.run!.stats.janelaParry;
    j.parryRecarga = cfg.recarga;
    j.parrySucesso = false;
    j.refletidas = 0;
    Som.tocar('parryTentativa');
    const anel = this.add.circle(j.maoX, j.maoY, cfg.raio, 0xffffff, 0).setStrokeStyle(2, 0xffe066, 1).setDepth(5200).setScale(0.5);
    this.tweens.add({ targets: anel, scale: 1.1, alpha: 0, duration: j.parryT * 1000, onComplete: () => anel.destroy() });
  }

  /** Durante a janela do parry, balas por perto são rebatidas. */
  private verificarParry() {
    const j = this.jogador;
    const raio = D.config.parry.raio;
    for (const obj of this.projeteis.getChildren().slice()) {
      const p = obj as Sprite;
      if (Phaser.Math.Distance.Between(p.x, p.y, j.maoX, j.maoY) < raio) this.refletir(p);
    }
  }

  /** Rebate a bala inimiga como uma bala dourada no inimigo mais próximo. */
  private refletir(p: Sprite) {
    if (!p.active) return;
    const j = this.jogador;
    // passou do limite: a bala só some (ainda te protege, mas não vira bala sua)
    if (j.refletidas >= D.config.parry.maxRefletidas + Estado.run!.stats.parryExtra) {
      this.faiscas(p.x, p.y, 0xffe066, 3);
      p.destroy();
      this.sucessoParry();
      return;
    }
    j.refletidas++;
    const alvo = this.listaInimigos()
      .filter((i) => !i.morto)
      .sort((a, b) => Phaser.Math.Distance.Between(a.x, a.y, p.x, p.y) - Phaser.Math.Distance.Between(b.x, b.y, p.x, p.y))[0];
    const v = (p.body as Corpo).velocity;
    const ang = alvo ? Math.atan2(alvo.y - p.y, alvo.x - p.x) : Math.atan2(-v.y, -v.x);
    const b = this.criarBala(p.x, p.y, ang, 380, 1.2, arma('pistola'), { perfura: 2, queima: true }, D.config.parry.dano * Estado.run!.stats.dano);
    b.setTexture('bala_grande').setTint(0xffe066).setScale(2, 1.2);
    b.setData('cor', 0xffe066);
    b.setData('refletida', true);
    b.setData('empurrao', 180);
    this.faiscas(p.x, p.y, 0xffe066, 6);
    p.destroy();
    this.sucessoParry();
  }

  private parryCorpoACorpo(ini: Inimigo) {
    if (ini.getData('aparado')) return;
    ini.setData('aparado', true);
    this.time.delayedCall(300, () => ini.active && ini.setData('aparado', false));
    const j = this.jogador;
    const d = new Phaser.Math.Vector2(ini.x - j.x, ini.y - j.y).normalize();
    this.ferirInimigo(ini, D.config.parry.dano * Estado.run!.stats.dano * 1.5, d, undefined, 260);
    if (!ini.morto && !ini.ehChefe) ini.atordoado = 0.9;
    this.sucessoParry();
  }

  private sucessoParry() {
    const j = this.jogador;
    if (j.parrySucesso) return;
    j.parrySucesso = true;
    const run = Estado.run!;
    j.parryRecarga = 0.12; // acertou: pode aparar de novo logo
    j.parryT = Math.max(j.parryT, 0.08);
    j.invencivel = Math.max(j.invencivel, 0.3);
    j.dashCargas = Math.min(run.stats.dashes, j.dashCargas + 1);
    run.chama = Math.min(run.stats.chamaMax, run.chama + D.config.parry.cura);
    run.parries++;
    checarConquista('parry', run.parries);
    this.fx.evento('parry', { x: j.maoX, y: j.maoY });
    run.combo++;
    run.comboT = D.config.combate.janelaCombo;
    Som.tocar('parry');
    this.camaraLenta(0.12, 140);
    this.piscar(255, 255, 255, 70);
    this.tremer(100, 0.006);
    popup(j.x, j.y - 20, 'PARRY!', '#ffe066', 24);
    this.anelLuz(j.maoX, j.maoY, 0xffe066, 30);
    this.flashes.push({ x: j.maoX, y: j.maoY, r: 60, t: 0.12, cor: 0xffe066 });
  }

  /** Passar raspando por uma bala ou monstro durante o dash. */
  private verificarEsquiva() {
    const j = this.jogador;
    const raio = D.config.esquiva.raio + Estado.run!.stats.raioEsquiva;
    for (const obj of this.projeteis.getChildren()) {
      const p = obj as Sprite;
      if (Phaser.Math.Distance.Between(p.x, p.y, j.maoX, j.maoY + 3) < raio) return this.esquivaPerfeita();
    }
    for (const ini of this.listaInimigos()) {
      if (!ini.morto && ini.fase === 'ativo' && Phaser.Math.Distance.Between(ini.x, ini.y, j.x, j.y) < raio) return this.esquivaPerfeita();
    }
  }

  private esquivaPerfeita() {
    const j = this.jogador;
    const run = Estado.run!;
    const cfg = D.config.esquiva;
    j.raspou = true;
    j.invencivel = Math.max(j.invencivel, 0.35);
    run.chama = Math.min(run.stats.chamaMax, run.chama + cfg.cura);
    run.combo++;
    run.comboT = D.config.combate.janelaCombo;
    this.camaraLenta(cfg.camaraLenta, cfg.duracaoMs * run.stats.lentoExtra);
    Som.tocar('esquiva');
    popup(j.x, j.y - 20, 'ESQUIVA!', '#7fd7ff', 16);
    this.anelLuz(j.maoX, j.maoY, 0x7fd7ff, 24);
    this.flashes.push({ x: j.maoX, y: j.maoY, r: 40, t: 0.15, cor: 0x7fd7ff });
  }

  private marcoCombo(n: number) {
    const nomes: Record<number, string> = {
      10: 'FRENESI!', 20: 'MASSACRE!', 30: 'INFERNAL!', 50: 'APOCALIPSE!', 75: 'IMPARÁVEL!', 100: 'DEUS DA CERA!',
    };
    mostrarBanner(nomes[n] ?? 'COMBO!', `COMBO x${n}`, CORES.ouro, 1.8);
    Som.tocar('frenesi');
    this.piscar(255, 210, 63, 120);
    this.camaraLenta(0.4, 300);
    this.soltarCera(this.jogador.x, this.jogador.y - 10, Math.floor(n / 5));
  }

  /** Câmera lenta: escala < 1 deixa tudo mais devagar por msReal milissegundos de verdade. */
  camaraLenta(escala: number, msReal: number) {
    this.lentoAte = Math.max(this.lentoAte, performance.now() + msReal);
    if (escala < this.escalaTempo) this.aplicarEscala(escala);
  }

  private aplicarEscala(e: number) {
    this.escalaTempo = e;
    this.physics.world.timeScale = 1 / e; // na física, maior = mais lento
    this.tweens.timeScale = e;
    this.time.timeScale = e;
    this.anims.globalTimeScale = e;
    Estado.camaraLenta = e < 1;
  }

  private piscar(r: number, g: number, b: number, ms: number) {
    if (Opcoes.flashes) this.cameras.main.flash(ms, r, g, b, true);
  }

  private anelLuz(x: number, y: number, cor: number, raio: number) {
    const a = this.add.circle(x, y, raio * 0.3, cor, 0).setStrokeStyle(2, cor, 1).setDepth(5200).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: a, scale: 3.3, alpha: 0, duration: 260, onComplete: () => a.destroy() });
  }

  private fantasma(cor: number, alpha: number) {
    const j = this.jogador;
    const f = this.add.image(j.x, j.y, j.texture.key, j.frame.name).setFlipX(j.flipX).setTintFill(cor).setAlpha(alpha).setDepth(5150);
    f.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: f, alpha: 0, duration: 220, onComplete: () => f.destroy() });
  }

  /** Escudo da Casca de Cera (anel em volta da vela). */
  private desenharEfeitos() {
    const g = this.efeitos;
    g.clear();
    const j = this.jogador;
    if (this.escudoAtivo) g.lineStyle(1, 0xf2e3c2, 0.5 + Math.sin(this.time.now / 150) * 0.2).strokeCircle(j.maoX, j.maoY + 2, 12);
    // Espelho de Mão: anel dourado girando
    if (this.espelhoT > 0) {
      const a0 = this.time.now / 120;
      g.lineStyle(2, 0xffe066, this.espelhoT < 0.8 ? 0.4 : 0.9);
      for (let k = 0; k < 3; k++) g.beginPath().arc(j.maoX, j.maoY, 18, a0 + k * 2.1, a0 + k * 2.1 + 1.2).strokePath();
    }
  }

  /** Junta o dano de cada monstro e solta um número a cada 120ms (com a submetralhadora seriam centenas).
   *  O número mostrado é o dano x10, só para ficar mais gostoso de ver. */
  private emitirPopups() {
    const agora = this.time.now;
    for (const ini of this.listaInimigos()) {
      if (ini.danoAcum <= 0 || agora - ini.ultimoPopup < 120) continue;
      const v = ini.danoAcum;
      ini.danoAcum = 0;
      ini.ultimoPopup = agora;
      popup(ini.x + (Math.random() - 0.5) * 8, ini.y - ini.displayHeight * 0.4, `${Math.round(v * 10)}`, '#fff4d6', 16);
    }
  }

  private sortearElite(tipo: string) {
    const d = D.inimigos[tipo];
    if (!d || d.chefe || tipo === 'slime_mini' || tipo === 'zumbi' || d.ia === 'alvo' || d.ia === 'canhao') return false;
    if (Estado.run!.modo === 'tutorial') return false;
    const e = D.config.elite;
    return Math.random() < Math.min(D.config.infinito.eliteMax, e.chance + (Estado.run!.andar - 1) * e.chancePorAndar);
  }

  // ===================== Maestria, Forja e Cassino =====================

  /** Skin da arma (Armaria 3D): pinta a arma na mão. */
  private aplicarSkin(img: Phaser.GameObjects.Image, id: string) {
    const t = tintaSkin(Estado.meta.skins[id], this.time.now / 1000);
    if (t === null) {
      if (img.isTinted) img.clearTint();
    } else img.setTint(t);
  }

  /** Cada abate conta para a maestria da arma na mão; níveis liberam skins. */
  private contarMaestria() {
    const id = this.armaAtual.id;
    if (ehFusao(id)) return;
    const m = Estado.meta;
    const antes = m.maestria[id] ?? 0;
    m.maestria[id] = antes + 1;
    const nv = nivelMaestria(antes + 1);
    if (nv > nivelMaestria(antes)) {
      Estado.toasts.push({ titulo: `Maestria: ${arma(id).nome}`, texto: `Skin ${SKINS[nv].nome} liberada! Escolha na Armaria 3D.`, vida: 5 });
      salvarMeta(m);
    }
  }

  /** A bigorna: a arma atual e a próxima viram uma só. */
  private forjar(it: Interativo) {
    const run = Estado.run!;
    const iA = run.armaAtual;
    const iB = (iA + 1) % run.armas.length;
    const a = run.armas[iA].id;
    const b = run.armas[iB].id;
    const def = fundir(this, a, b);
    (run.fusoes ??= []).push({ a, b });
    run.armas = run.armas.filter((_, k) => k !== iA && k !== iB);
    run.armas.push(novaArma(def.id));
    run.armaAtual = run.armas.length - 1;
    this.jogador.recarregando = 0;
    this.aquecimento = 0;
    // marteladas
    for (let k = 0; k < 3; k++) {
      this.time.delayedCall(k * 260, () => {
        Som.tocar('bigorna');
        this.tremer(120, 0.006);
        this.faiscas(it.x, it.y - 8, 0xff9a2e, 14, 22);
        this.flashes.push({ x: it.x, y: it.y - 6, r: 60, t: 0.1, cor: 0xff7a3d });
      });
    }
    this.time.delayedCall(800, () => {
      this.piscar(255, 160, 60, 260);
      this.camaraLenta(0.3, 600);
      this.anelLuz(it.x, it.y - 6, 0xffd23f, 60);
      this.anunciarArma(def);
      mostrarBanner(`FUSÃO: ${def.nome.toUpperCase()}`, def.desc, raridade(def.raridade).cor, 4);
      this.verificarSinergias();
      salvarPartida();
    });
  }

  private girando = false;

  /** Caça-níquel: 3 rodinhas; 3 iguais dão o prêmio, 2 iguais um troco. */
  private jogarCacaNiquel(it: Interativo) {
    const run = Estado.run!;
    const caveira = this.textures.exists('caveira') ? 'caveira' : 'item_misterio';
    const simbolos: [string, string, number][] = [
      ['cera', 'gota', 30], ['chama', 'vela_item', 25], ['item', 'icone_mola', 15], ['caveira', caveira, 18], ['tete', 'arma_tete', 12],
    ];
    const total = simbolos.reduce((a, s) => a + s[2], 0);
    const sortear = () => {
      let r = Math.random() * total;
      for (const sm of simbolos) if ((r -= sm[2]) < 0) return sm;
      return simbolos[0];
    };
    const resultado = [sortear(), sortear(), sortear()];
    this.girando = true;
    Som.tocar('cacaNiquel');
    const rodas = [-11, 0, 11].map((dx) => this.add.image(it.x + dx, it.y - 34, 'gota').setDepth(4700));
    rodas.forEach((img, k) => {
      let n = 0;
      const voltas = 8 + k * 4;
      this.time.addEvent({
        delay: 70, repeat: voltas,
        callback: () => {
          n++;
          const sm = n > voltas ? resultado[k] : simbolos[(n + k) % simbolos.length];
          img.setTexture(sm[1]).setScale(sm[1] === 'arma_tete' ? 0.6 : 1);
          if (n > voltas) {
            Som.tocar('menu');
            this.tweens.add({ targets: img, y: img.y - 3, duration: 80, yoyo: true });
          }
        },
      });
    });
    this.time.delayedCall(70 * 18 + 250, () => {
      this.girando = false;
      const ids = resultado.map((r) => r[0]);
      const tres = ids[0] === ids[1] && ids[1] === ids[2];
      const dois = !tres && (ids[0] === ids[1] || ids[1] === ids[2] || ids[0] === ids[2]);
      if (tres) {
        Som.tocar('jackpot');
        this.piscar(255, 210, 63, 200);
        this.anelLuz(it.x, it.y - 20, 0xffd23f, 50);
        switch (ids[0]) {
          case 'cera':
            mostrarBanner('JACKPOT!', 'Chuva de cera!', CORES.ouro, 2.5);
            this.soltarCera(it.x, it.y + 14, 20);
            break;
          case 'chama':
            mostrarBanner('JACKPOT!', 'Chama cheia!', CORES.chama, 2.5);
            run.chama = run.stats.chamaMax;
            break;
          case 'item': {
            mostrarBanner('JACKPOT!', 'Um item!', CORES.ouro, 2.5);
            const id = this.sortearItem(1);
            if (id) this.criarItemChao('item', id, it.x, it.y + 26, true, { animar: true });
            else this.soltarCera(it.x, it.y + 14, 12);
            break;
          }
          case 'caveira': {
            mostrarBanner('AZAR!', 'Três caveiras... eles vieram cobrar.', CORES.perigo, 2.5);
            const pool = Object.entries(D.inimigos).filter(([, d]) => d.custo > 0 && !d.chefe && d.andarMin <= run.andar).map(([id]) => id);
            for (let k = 0; k < 3; k++) {
              const pos = this.posicaoLivre(this.jogador.x, this.jogador.y, 70);
              this.criarInimigo(Phaser.Math.RND.pick(pool), pos.x, pos.y);
            }
            break;
          }
          case 'tete':
            mostrarBanner('JACKPOT DA TETE!', 'A TETE, a NIX e a YUUMI vieram ajudar por 60 segundos!', '#f0d29c', 3.5);
            Som.tocar('latido');
            this.time.delayedCall(250, () => Som.tocar('miau'));
            this.fx.bichinhos();
            break;
        }
      } else if (dois) {
        popup(it.x, it.y - 40, 'QUASE! +TROCO', CORES.ouro, 16);
        Som.tocar('moeda');
        this.soltarCera(it.x, it.y + 14, 4);
      } else popup(it.x, it.y - 40, 'NADA...', CORES.textoApagado, 16);
      this.time.delayedCall(900, () => rodas.forEach((r) => r.destroy()));
    });
  }

  /** Máquina de doação: 100 de cera doada liberam a Moedinha. Às vezes vem uma bênção. */
  private doar(it: Interativo) {
    const meta = Estado.meta;
    const run = Estado.run!;
    const antes = meta.doado;
    meta.doado += 5;
    Som.tocar('moeda');
    popup(it.x, it.y - 24, '+5 DOADOS', '#ff8ac8', 16);
    this.faiscas(it.x, it.y - 12, 0xff5a7a, 5);
    if (Math.random() < 0.12) {
      run.chama = Math.min(run.stats.chamaMax, run.chama + 15);
      popup(this.jogador.x, this.jogador.y - 20, 'BÊNÇÃO! +15', CORES.chama, 16);
      Som.tocar('acender');
    }
    if (antes < 100 && meta.doado >= 100) mostrarBanner('CORAÇÃO DE OURO', 'Você doou 100 de cera. Alguém quer te conhecer...', '#ff8ac8', 4);
    checarConquista('doacao', meta.doado);
    salvarMeta(meta);
  }

  // ===================== Fim de partida =====================

  private morrer() {
    const j = this.jogador;
    if (j.morto) return;
    // Palito de Reserva: reacende uma vez por partida
    const run0 = Estado.run!;
    if (this.fx.tem('renascer') && !run0.renasceu) {
      run0.renasceu = true;
      run0.chama = run0.stats.chamaMax * 0.5;
      j.invencivel = 2;
      for (const obj of this.projeteis.getChildren().slice()) this.estourarProjetil(obj as Sprite);
      mostrarBanner('REACENDEU!', 'O Palito de Reserva acendeu a sua chama de novo.', '#ff9a2e', 3);
      Som.tocar('acender');
      this.piscar(255, 160, 60, 300);
      this.camaraLenta(0.3, 800);
      this.anelLuz(j.maoX, j.maoY, 0xff9a2e, 60);
      return;
    }
    j.morto = true;
    Estado.run!.chama = 0;
    Estado.prompt = '';
    this.raioMorte = 40;
    this.escuridao.setVisible(true);
    j.setVelocity(0, 0);
    j.anims.stop();
    j.setTint(0x777777);
    j.arma.setVisible(false);
    if (this.j2) {
      this.j2.setTint(0x777777).setVelocity(0, 0);
      this.j2.anims.stop();
      this.j2.arma.setVisible(false);
      this.j2.morto = true;
    }
    Som.tocar('morte');
    Som.musica('derrota');
    for (let i = 0; i < 4; i++) this.time.delayedCall(i * 200, () => this.faiscas(j.x, j.y - 8, 0x8a8a8a, 5));
    this.tweens.add({ targets: j, alpha: 0, scaleY: 0.6, y: j.y + 3, duration: 1200, delay: 300 });
    this.time.delayedCall(2000, () => this.terminar(false));
  }

  private terminar(vitoria: boolean) {
    if (this.fimAgendado) return;
    this.fimAgendado = true;
    const run = Estado.run!;
    const meta = Estado.meta;
    let ganho = Math.floor(run.ceraTotal / 5) + (run.andar - 1) * 5 + Math.floor(run.melhorCombo / 5) + (vitoria ? 30 : 0);
    meta.ceraDourada += ganho;
    meta.melhorAndar = Math.max(meta.melhorAndar, run.andar);
    meta.melhorCombo = Math.max(meta.melhorCombo, run.melhorCombo);
    if (vitoria) meta.vitorias++;
    // desafio vencido: prêmio e conquistas
    const dsf = desafio(run.desafio);
    let desafioVencido = false;
    if (vitoria && dsf && !meta.desafiosFeitos.includes(dsf.id)) {
      meta.desafiosFeitos.push(dsf.id);
      meta.ceraDourada += dsf.premio;
      ganho += dsf.premio;
      desafioVencido = true;
      checarConquista('desafios', meta.desafiosFeitos.length);
    }
    apagarPartida();
    this.registrarPartida(vitoria);
    salvarMeta(meta);
    this.scene.stop('HUD');
    const m = marcos();
    const a = run.andar;
    // um final para cada chefe: O Apagador, O Pavio Negro e O Acendedor
    const finais: Record<number, [string, string, string]> = {
      [m.apagador]: ['final', 'A CHAMA VENCEU!', 'apagador'],
      [m.abismo]: ['final2', 'A SOMBRA FOI ABRAÇADA', 'negro'],
      [m.acendedor]: ['final3', 'O PRIMEIRO AMANHECER', 'acendedor'],
    };
    const fim = vitoria && !run.estudio ? finais[a] : undefined;
    let titulo = vitoria ? 'A CHAMA VENCEU!' : 'A CHAMA SE APAGOU';
    if (run.estudio) {
      titulo = vitoria ? 'O JOGO É SEU!' : 'O CRIADOR VENCEU... DESSA VEZ';
      if (vitoria && !meta.finais.includes('criador')) meta.finais.push('criador');
    }
    if (fim) titulo = fim[1];
    else if (run.estudio) titulo = vitoria ? 'O JOGO É SEU!' : 'O CRIADOR VENCEU... DESSA VEZ';
    else if (vitoria) titulo = `A LUZ VOLTOU DE ${infoAndar(a).nome}!`;
    else if (a > m.apagador) titulo = `APAGOU EM ${infoAndar(a).nome}`;
    if (fim && !meta.finais.includes(fim[2])) meta.finais.push(fim[2]);
    if (desafioVencido && dsf) titulo = `DESAFIO VENCIDO: ${dsf.nome.toUpperCase()}`;
    const dadosFim = {
      vitoria, andar: run.andar, mortes: run.mortes, tempo: run.tempo, ganho, titulo,
      diario: run.modo === 'diario' ? { pontos: this.pontosDiario, recorde: meta.diario[String(sementeDoDia())]?.pontos ?? this.pontosDiario } : undefined,
      reliquias: run.itens.length, combo: run.melhorCombo, armas: run.armas.map((w) => arma(w.id).nome),
      itens: run.itens.slice(), sinergias: run.sinergias.slice(),
      personagem: run.personagem, grafico: run.grafico ?? [], quase: run.quase, semente: run.semente,
      desafio: dsf?.nome, desafioPremio: desafioVencido ? dsf?.premio : undefined,
    };
    salvarMeta(meta);
    // venceu um dos chefes finais: primeiro os quadrinhos daquele final, depois a tela de vitória
    if (fim) this.scene.start('Historia', { conjunto: fim[0], depois: 'Fim', dadosFim });
    else this.scene.start('Fim', dadosFim);
  }

  /** Guarda o resumo da partida para a tela de estatísticas. */
  private registrarPartida(vitoria: boolean) {
    const run = Estado.run!;
    const meta = Estado.meta;
    const m = marcos();
    const fim = !vitoria ? undefined : run.estudio ? 'criador' : ({ [m.apagador]: 'apagador', [m.abismo]: 'negro', [m.acendedor]: 'acendedor' } as Record<number, string>)[run.andar];
    meta.historico.unshift({
      quando: Date.now(), personagem: run.personagem, modo: run.modo, andar: run.andar, tempo: Math.round(run.tempo), vitoria, fim,
      causa: vitoria ? undefined : this.ultimaCausa || 'desconhecido', mortes: run.mortes, combo: run.melhorCombo, itens: run.itens.length,
      armas: run.armas.map((w) => w.id),
    });
    meta.historico = meta.historico.slice(0, 40);
    const pp = (meta.porPersonagem[run.personagem] ??= { partidas: 0, vitorias: 0, melhorAndar: 0, finais: [] });
    pp.partidas++;
    if (vitoria) pp.vitorias++;
    pp.melhorAndar = Math.max(pp.melhorAndar, run.andar);
    if (fim && !pp.finais.includes(fim)) pp.finais.push(fim);
    if (vitoria && fim) checarConquista('marca', run.personagem);
    for (const id of run.itens) meta.itensPegos[id] = (meta.itensPegos[id] ?? 0) + 1;
    if (!vitoria) meta.causas[this.ultimaCausa || 'desconhecido'] = (meta.causas[this.ultimaCausa || 'desconhecido'] ?? 0) + 1;
    meta.tempoTotal += run.tempo;
    // desafio diário: pontos e recorde do dia
    if (run.modo === 'diario') {
      const pontos = run.andar * 1000 + run.mortes * 5 + run.melhorCombo * 10 + (vitoria ? 5000 : 0) - Math.floor(run.tempo / 2);
      const dia = String(sementeDoDia());
      const antes = meta.diario[dia];
      if (!antes || pontos > antes.pontos) meta.diario[dia] = { pontos, andar: run.andar, vitoria };
      this.pontosDiario = pontos;
    }
  }

  private pontosDiario = 0;

  alternarPausa() {
    if (this.jogador.morto) return;
    Estado.pausado = !Estado.pausado;
    if (Estado.pausado) {
      this.physics.pause();
      this.anims.pauseAll();
      this.tweens.pauseAll();
      this.time.paused = true;
    } else {
      this.physics.resume();
      this.anims.resumeAll();
      this.tweens.resumeAll();
      this.time.paused = false;
      // o ENTER/ESPAÇO usado no menu da pausa não pode virar um dash ao voltar
      this.input.keyboard?.resetKeys();
    }
    this.input.setDefaultCursor(Estado.pausado ? 'default' : 'none');
    Som.abafarMusica(Estado.pausado);
  }

  /** Pausa → RECOMEÇAR: joga fora esta partida e começa outra com o mesmo personagem. */
  recomecar() {
    const coop = !!Estado.run?.coop;
    apagarPartida();
    this.alternarPausa();
    Estado.pausado = false;
    Som.abafarMusica(false);
    this.scene.stop('HUD');
    this.scene.start('Jogo', { modo: coop ? 'dupla' : 'novo' });
  }

  sairParaMenu() {
    salvarPartida();
    this.alternarPausa();
    Estado.pausado = false;
    Som.abafarMusica(false);
    this.scene.stop('HUD');
    this.scene.start('Menu');
  }

  // ===================== Utilidades usadas pelos inimigos =====================

  posicaoLivre(longeX: number, longeY: number, distMin: number) {
    for (let i = 0; i < 80; i++) {
      const c = Phaser.Math.Between(2, COLS - 3);
      const r = Phaser.Math.Between(2, ROWS - 3);
      if (!CHAO.includes(this.grade[r][c])) continue;
      const x = c * TILE + 8;
      const y = OY + r * TILE + 8;
      if (Phaser.Math.Distance.Between(x, y, longeX, longeY) >= distMin) return { x, y };
    }
    return { x: MUNDO_L / 2, y: OY + 104 };
  }

  escurecer(segundos: number) {
    this.escurecerT = segundos;
  }

  tremer(ms: number, intensidade: number) {
    if (Opcoes.tremor && intensidade > 0) this.cameras.main.shake(ms, intensidade);
  }

  private faiscas(x: number, y: number, cor: number, n: number, alcance = 12) {
    for (let i = 0; i < n; i++) {
      const p = this.add.image(x, y, 'pixel').setTint(cor).setDepth(4600).setScale(0.5 + Math.random() * 0.5);
      const a = Math.random() * Math.PI * 2;
      const d = 4 + Math.random() * alcance;
      this.tweens.add({
        targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 4, alpha: 0, duration: 250 + Math.random() * 200,
        onComplete: () => p.destroy(),
      });
    }
  }

  // ===================== Luz e escuridão =====================

  private luz(x: number, y: number, r: number, alpha = 1, cor?: number, forca = 0.35) {
    if (r <= 0) return;
    const escura = this.escuridao.visible;
    if (escura) this.escuridao.stamp('luz', undefined, x, y - OY, { scale: r / 32, erase: true, alpha });
    // nas salas iluminadas o brilho colorido é mais discreto
    if (cor !== undefined) this.brilho.stamp('luz', undefined, x, y - OY, { scale: (r / 32) * 0.8, tint: cor, alpha: escura ? forca : forca * 0.45 });
  }

  private desenharEscuridao(dt: number) {
    const cfg = D.config.luz;
    const run = Estado.run!;
    const s = run.stats;
    const j = this.jogador;
    const agora = this.time.now;
    const rt = this.escuridao;
    this.brilho.clear();
    if (rt.visible) {
      rt.clear();
      rt.fill(0x05030a, cfg.escuridao);
    }
    const pulso = Estado.pulso;

    const frac = Phaser.Math.Clamp(run.chama / s.chamaMax, 0, 1);
    let raio = (cfg.raioMin + (cfg.raioMax - cfg.raioMin) * frac) * s.luz;
    if (this.escurecerT > 0) raio *= 0.6;
    raio += Math.sin(agora / 90) * 1.5 + Math.sin(agora / 37) * 0.8 + pulso * 5;
    if (j.morto) {
      this.raioMorte = Math.max(0, this.raioMorte - dt * 25);
      raio = Math.min(raio, this.raioMorte);
    }
    this.luz(j.maoX, j.maoY - 2, raio, 1, 0xff9a2e, 0.1 + pulso * 0.06);
    if (this.j2) this.luz(this.j2.maoX, this.j2.maoY - 2, raio * 0.85, 1, 0xff8ac8, 0.1);

    for (const l of this.luzesFixas) this.luz(l.x, l.y, l.r + Math.sin(agora / 70 + l.x) * 2 + pulso * 4, 1, 0xffa040, 0.15 + pulso * 0.1);
    if (this.escada && Estado.sala?.limpa) this.luz(this.escada.x, this.escada.y, 26, 1, 0xffe066, 0.2);
    for (const it of this.itensChao) {
      const tier = it.tipo === 'arma' ? arma(it.id).raridade : 0;
      const cor = tier >= 2 ? this.cor(raridade(tier).cor) : 0xffe066;
      this.luz(it.img.x, it.img.y, tier >= 5 ? 34 + pulso * 10 : 22, 1, cor, tier >= 4 ? 0.5 : 0.25);
    }
    for (const g of this.gotas.getChildren()) this.luz((g as Sprite).x, (g as Sprite).y, 10, 0.8);
    for (const p of this.projeteis.getChildren()) {
      const ps = p as Sprite;
      const ef = ps.getData('efeito');
      this.luz(ps.x, ps.y, 16, 1, ef === 'veneno' ? 0x7fff4f : ef === 'lento' ? 0x7fe8ff : 0xd040ff, 0.5);
    }
    for (const b of this.balas.getChildren()) {
      const bs = b as Sprite;
      this.luz(bs.x, bs.y, bs.getData('chama') ? 18 : bs.getData('atrator') ? 30 : 12, 0.85, bs.getData('cor') as number, 0.45);
    }
    for (const o of this.orbes) this.luz(o.x, o.y, 14, 1, 0xffe0a0, 0.35);
    for (const t of this.torres) this.luz(t.spr.x, t.spr.y - 12, 40, 1, 0xffd23f, 0.25);
    for (const [x, y, r, cor] of this.fx.luzes()) this.luz(x, y, r, 0.9, cor, 0.35);
    if (this.espelhoT > 0) this.luz(j.maoX, j.maoY, 30, 1, 0xffe066, 0.25);
    if (this.furiaT > 0) this.luz(j.maoX, j.maoY, 36, 1, 0xff4a2e, 0.2 + pulso * 0.15);
    for (const ini of this.listaInimigos()) {
      if (ini.refletindo > 0) this.luz(ini.x, ini.y, 40, 0.8, 0xb06bff, 0.5);
      else if (ini.ehChefe) this.luz(ini.x, ini.y, 34, 0.7, 0xff3040, 0.25 + pulso * 0.15);
      else if (ini.elite) this.luz(ini.x, ini.y, 18, 0.6, 0xff2a4a, 0.35 + pulso * 0.2);
      else this.luz(ini.x, ini.y, ini.alerta ? 20 : 10, 0.55, ini.alerta ? 0xff4040 : undefined, 0.3);
    }
    this.flashes = this.flashes.filter((f) => {
      f.t! -= dt;
      this.luz(f.x, f.y, f.r, 1, f.cor, 0.55);
      return f.t! > 0;
    });
  }
}
