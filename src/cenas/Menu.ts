import Phaser from 'phaser';
import { TELA_L, TELA_A, FONTE, CORES } from '../constantes';
import { D, RARIDADES, raridade, personagem, arma as acharArma, item as acharItem, ativo as acharAtivo, STATS_MULTIPLICADORES } from '../dados';
import { Estado, apagarProgresso, bloqueado, conquistaDe, nomeDesbloqueio } from '../estado';
import { Opcoes, salvarOpcoes } from '../opcoes';
import { Som } from '../som';
import { personagemValido, texturaPersonagem, personagemPronto } from '../arte/personagens';
import { fundoMasmorra } from './fundo';
import { resumoPartida, sementeDoDia } from '../sistemas/Salvar';
import { DESAFIOS, desafio, codigoSemente, lerSemente, ALFABETO_SEMENTE } from '../sistemas/Regras';

type Tela = 'principal' | 'personagem' | 'arsenal' | 'conquistas' | 'estatisticas' | 'comoJogar' | 'opcoes' | 'creditos' | 'desafios' | 'semente';

interface Item {
  texto: Phaser.GameObjects.Text;
  rotulo: () => string;
  acao?: () => void;
  lado?: (d: -1 | 1) => void;
}

const VERSAO = 'v1.0';

/** Ponte com a janela do programa instalado (só existe no Electron; no navegador é undefined). */
const desktop = (window as unknown as { desktop?: { sair: () => void; telaCheia: (ligar?: boolean) => void } }).desktop;

export class Menu extends Phaser.Scene {
  private tela: Tela = 'principal';
  private camada!: Phaser.GameObjects.Container;
  private itens: Item[] = [];
  private sel = 0;
  private saindo = false;
  private moverLuz!: (x: number, y: number, r?: number) => void;
  private confirmarApagar = false;
  private abaArsenal = 0;
  private aoVoltar: (() => void) | null = null;
  // a vela do menu mira no botão selecionado e atira no que você escolhe
  private atirador: { s: Phaser.GameObjects.Sprite; arma: Phaser.GameObjects.Image; x0: number } | null = null;
  private angArma = 0;
  private emTransicao = false;
  // escolha de personagem antes da partida (como no Isaac): modo da partida e de qual jogador é a vez
  private escolha: { modo: 'novo' | 'dupla'; jogador: 1 | 2; desafio?: string; semente?: number } = { modo: 'novo', jogador: 1 };
  private telaInicial: Tela = 'principal'; // a Sacristia pode abrir o menu direto numa tela
  private digitado = ''; // tela da semente

  constructor() {
    super('Menu');
  }

  init(dados?: { tela?: Tela; modo?: 'novo' | 'dupla'; desafio?: string }) {
    this.telaInicial = dados?.tela ?? 'principal';
    if (dados?.tela === 'personagem') this.escolha = { modo: dados.modo ?? 'novo', jogador: 1, desafio: dados.desafio };
  }

  create() {
    this.saindo = false;
    this.emTransicao = false;
    this.atirador = null;
    this.confirmarApagar = false;
    Som.musica('menu');
    this.cameras.main.fadeIn(400);
    this.moverLuz = fundoMasmorra(this);
    this.camada = this.add.container(0, 0).setDepth(10);

    const kb = this.input.keyboard!;
    kb.on('keydown', (e: KeyboardEvent) => this.tecla(e));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.removeAllListeners('keydown'));
    this.mostrar(this.telaInicial);
    this.telaInicial = 'principal';
  }

  // ===================== infraestrutura =====================

  private txt(x: number, y: number, texto: string, tam = 16, cor = CORES.texto, origem = 0.5) {
    const t = this.add
      .text(x, y, texto, { fontFamily: FONTE, fontSize: `${tam}px`, color: cor, stroke: '#07050b', strokeThickness: Math.max(4, tam / 4), lineSpacing: 10 })
      .setOrigin(origem, 0.5);
    this.camada.add(t);
    return t;
  }

  private img(x: number, y: number, chave: string, escala: number, frame?: number) {
    const i = this.add.image(x, y, chave, frame).setScale(escala);
    this.camada.add(i);
    return i;
  }

  private item(x: number, y: number, rotulo: () => string, tam: number, acao?: () => void, lado?: (d: -1 | 1) => void, origem = 0.5) {
    const texto = this.txt(x, y, rotulo(), tam, CORES.texto, origem);
    const it: Item = { texto, rotulo, acao, lado };
    const i = this.itens.length;
    texto.setInteractive({ useHandCursor: true });
    texto.on('pointerover', () => this.selecionar(i));
    texto.on('pointerdown', () => {
      this.selecionar(i, false);
      if (acao) acao();
      else lado?.(1);
    });
    this.itens.push(it);
    return it;
  }

  private selecionar(i: number, som = true) {
    if (som && i !== this.sel) Som.tocar('menu');
    this.sel = i;
    this.itens.forEach((it, k) => {
      const ativo = k === i;
      it.texto.setText(ativo ? `> ${it.rotulo()} <` : it.rotulo());
      it.texto.setColor(ativo ? CORES.chama : CORES.texto);
    });
  }

  private atualizarRotulos() {
    this.selecionar(this.sel, false);
  }

  private mostrar(tela: Tela) {
    this.tela = tela;
    this.atirador = null;
    this.camada.removeAll(true);
    this.itens = [];
    this.sel = 0;
    this.aoVoltar = tela === 'principal' ? null : () => this.mostrar('principal');
    this.camada.setAlpha(0);
    this.tweens.add({ targets: this.camada, alpha: 1, duration: 180 });
    switch (tela) {
      case 'principal':
        this.telaPrincipal();
        break;
      case 'personagem':
        this.telaPersonagem();
        break;
      case 'arsenal':
        this.telaArsenal();
        break;
      case 'comoJogar':
        this.telaComoJogar();
        break;
      case 'conquistas':
        this.telaConquistas();
        break;
      case 'estatisticas':
        this.telaEstatisticas();
        break;
      case 'opcoes':
        this.telaOpcoes();
        break;
      case 'creditos':
        this.telaCreditos();
        break;
      case 'desafios':
        this.telaDesafios();
        break;
      case 'semente':
        this.telaSemente();
        break;
    }
    if (this.itens.length) this.selecionar(0, false);
  }

  private tecla(e: KeyboardEvent) {
    if (this.saindo || this.emTransicao) return;
    if (this.tela === 'semente' && this.digitar(e)) return;
    const it = this.itens[this.sel];
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        if (this.itens.length) this.selecionar((this.sel + this.itens.length - 1) % this.itens.length);
        break;
      case 'ArrowDown':
      case 'KeyS':
        if (this.itens.length) this.selecionar((this.sel + 1) % this.itens.length);
        break;
      case 'ArrowLeft':
      case 'KeyA':
        it?.lado?.(-1);
        break;
      case 'ArrowRight':
      case 'KeyD':
        it?.lado?.(1);
        break;
      case 'Enter':
      case 'Space':
      case 'KeyJ':
        if (it?.acao) it.acao();
        else if (!it && this.aoVoltar) this.voltar();
        break;
      case 'Escape':
      case 'Backspace':
        this.voltar();
        break;
      case 'KeyM':
        Som.alternarMudo();
        break;
    }
  }

  private voltar() {
    if (!this.aoVoltar || this.emTransicao) return;
    Som.tocar('voltar');
    const volta = this.aoVoltar;
    this.transicao(TELA_L / 2, TELA_A / 2, volta, 0xffffff);
  }

  // ===================== a vela atiradora e a transição =====================

  update(_t: number, delta: number) {
    const a = this.atirador;
    if (!a || this.tela !== 'principal') return;
    const alvo = this.itens[this.sel]?.texto;
    if (!alvo) return;
    // mira no começo do texto do botão, girando suave
    const tx = alvo.x - alvo.displayWidth / 2;
    const desejado = Math.atan2(alvo.y - a.arma.y, tx - a.arma.x);
    this.angArma = Phaser.Math.Angle.RotateTo(this.angArma, desejado, (delta / 1000) * 9);
    a.arma.setRotation(this.angArma);
  }

  /** Clique num botão do menu principal: a vela atira nele e só então a tela muda. */
  private atirarNoBotao(i: number, acao: () => void) {
    const a = this.atirador;
    const alvo = this.itens[i]?.texto;
    if (!a || !alvo || this.emTransicao || this.saindo) return acao();
    this.emTransicao = true;
    this.selecionar(i, false);
    const tx = alvo.x - alvo.displayWidth / 2 + 6;
    const ty = alvo.y;
    const ang = Math.atan2(ty - a.arma.y, tx - a.arma.x);
    this.angArma = ang;
    a.arma.setRotation(ang);
    const cano = a.arma.displayWidth * 0.85;
    const bx = a.arma.x + Math.cos(ang) * cano;
    const by = a.arma.y + Math.sin(ang) * cano;

    // tiro: clarão no cano, coice, bala traçante
    Som.tocar('escopeta');
    const clarao = this.add.image(bx, by, 'clarao').setScale(5).setRotation(ang).setDepth(60).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: clarao, alpha: 0, scale: 2, duration: 90, onComplete: () => clarao.destroy() });
    this.tweens.add({ targets: a.arma, x: a.arma.x - Math.cos(ang) * 8, y: a.arma.y - Math.sin(ang) * 8, duration: 60, yoyo: true, ease: 'Quad.out' });
    const bala = this.add.image(bx, by, 'bala').setTint(0xffe066).setScale(7, 2.5).setRotation(ang).setDepth(60).setBlendMode(Phaser.BlendModes.ADD);
    const dist = Phaser.Math.Distance.Between(bx, by, tx, ty);
    this.tweens.add({
      targets: bala, x: tx, y: ty, duration: Math.max(60, dist / 4), ease: 'Linear',
      onComplete: () => {
        bala.destroy();
        this.impacto(tx, ty, alvo);
        this.time.delayedCall(140, () => this.transicao(tx, ty, acao));
      },
    });
  }

  private impacto(x: number, y: number, alvo: Phaser.GameObjects.Text) {
    Som.tocar('impacto');
    if (Opcoes.tremor) this.cameras.main.shake(90, 0.004);
    alvo.setColor('#ffffff');
    this.tweens.add({ targets: alvo, scale: 1.25, duration: 70, yoyo: true, ease: 'Quad.out' });
    const anel = this.add.circle(x, y, 6, 0xffe066, 0).setStrokeStyle(3, 0xffe066, 1).setDepth(61);
    this.tweens.add({ targets: anel, scale: 5, alpha: 0, duration: 260, onComplete: () => anel.destroy() });
    for (let k = 0; k < 12; k++) {
      const f = this.add.image(x, y, 'pixel').setTint(k % 3 ? 0xffd23f : 0xffffff).setScale(2.5).setDepth(61);
      const a = Math.random() * Math.PI * 2;
      const d = 20 + Math.random() * 40;
      this.tweens.add({ targets: f, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scale: 0.5, duration: 260 + Math.random() * 160, ease: 'Quad.out', onComplete: () => f.destroy() });
    }
  }

  /**
   * Transição limpa: um círculo escuro (com borda dourada) cresce a partir do ponto
   * até cobrir a tela, a troca acontece por baixo e o círculo some num fade.
   */
  private transicao(x: number, y: number, depois: () => void, corBorda = 0xffd23f) {
    this.emTransicao = true;
    const raio = Math.max(
      Phaser.Math.Distance.Between(x, y, 0, 0), Phaser.Math.Distance.Between(x, y, TELA_L, 0),
      Phaser.Math.Distance.Between(x, y, 0, TELA_A), Phaser.Math.Distance.Between(x, y, TELA_L, TELA_A),
    ) + 20;
    const borda = this.add.circle(x, y, 10, 0x000000, 0).setStrokeStyle(2, corBorda, 0.9).setDepth(199);
    const disco = this.add.circle(x, y, 10, 0x07050b, 1).setDepth(200);
    const escala = raio / 10;
    this.tweens.add({ targets: borda, scale: escala * 1.04, duration: 300, ease: 'Cubic.in' });
    this.tweens.add({
      targets: disco, scale: escala, duration: 300, ease: 'Cubic.in',
      onComplete: () => {
        borda.destroy();
        depois();
        if (!this.scene.isActive() || this.saindo) return; // mudou de cena: a próxima cuida do resto
        this.tweens.add({
          targets: disco, alpha: 0, duration: 260, ease: 'Quad.out',
          onComplete: () => {
            disco.destroy();
            this.emTransicao = false;
          },
        });
      },
    });
  }

  private titulo(texto: string) {
    this.txt(TELA_L / 2, 52, texto, 32, CORES.chama);
  }

  private rodape(texto: string) {
    this.txt(TELA_L / 2, TELA_A - 30, texto, 8, CORES.textoApagado);
  }

  /** Herói animado segurando a escopeta. */
  private heroi(id: string, x: number, y: number, escala: number) {
    const pid = personagemValido(id);
    const s = this.add.sprite(x, y, texturaPersonagem(pid), 0).setOrigin(0.5, 1).play(`heroi_${pid}_parado`);
    // quem é mais alto que a vela (gente, heróis do pack) aparece um pouco menor para caber
    escala *= Math.min(1, 18 / s.frame.realHeight);
    s.setScale(escala);
    // segura a primeira arma do personagem
    const primeira = acharArma(personagem(pid).armas[0] ?? 'escopeta');
    const arma = this.add.image(x + 5 * escala, y - s.frame.realHeight * escala * 0.32, primeira.sprite).setOrigin(0.15, 0.5).setScale(escala);
    this.camada.add([s, arma]);
    this.tweens.add({ targets: arma, angle: -6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return { s, arma };
  }

  // ===================== telas =====================

  private telaPrincipal() {
    const cx = TELA_L / 2;
    this.moverLuz(cx - 60, 380, 380);
    const logo = this.txt(cx, 70, 'PAVIO', 72, CORES.chama);
    logo.setStroke('#1b1325', 12).setShadow(0, 6, '#000000', 0, true, true);
    this.tweens.add({ targets: logo, scale: 1.04, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.time.addEvent({
      delay: 120, loop: true,
      callback: () => logo.active && logo.setAlpha(Math.random() < 0.06 ? 0.75 : 1),
    });
    this.txt(cx, 124, 'um roguelite de bala e cera', 16, CORES.textoApagado);
    // a vela fica à esquerda dos botões e mira no que estiver selecionado
    const h = this.heroi(Opcoes.personagem, cx - 210, 440, 7);
    this.tweens.killTweensOf(h.arma);
    this.atirador = { s: h.s, arma: h.arma, x0: h.arma.x };
    this.angArma = 0;
    // brilho no chão embaixo da vela
    const halo = this.add.image(cx - 210, 442, 'luz').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffa040).setScale(2.2, 0.6).setAlpha(0.35);
    this.camada.addAt(halo, 0);
    this.tweens.add({ targets: halo, alpha: 0.55, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const salvo = resumoPartida();
    const hoje = Estado.meta.diario[String(sementeDoDia())];
    const opcoes: [string, () => void][] = [
      ...(salvo ? [[`CONTINUAR (${personagem(salvo.personagem).nome.toUpperCase()} · ANDAR ${salvo.andar})`, () => this.jogar('continuar')] as [string, () => void]] : []),
      ['JOGAR', () => this.irCena('Sacristia')],
      ['JOGAR EM DUPLA', () => this.escolherPersonagem('dupla')],
      [hoje ? `DESAFIO DIÁRIO (RECORDE ${hoje.pontos})` : 'DESAFIO DIÁRIO', () => this.jogar('diario')],
      ['DESAFIOS', () => this.ir('desafios')],
      ['TUTORIAL', () => this.jogar('tutorial')],
      ['ALTAR', () => this.irCena('Altar')],
      ['ARSENAL', () => this.ir('arsenal')],
      ['ARMARIA 3D', () => this.irCena('Armaria')],
      ['CONQUISTAS', () => this.ir('conquistas')],
      ['ESTATÍSTICAS', () => this.ir('estatisticas')],
      ['COMO JOGAR', () => this.ir('comoJogar')],
      ['HISTÓRIA', () => this.irCena('Historia', { depois: 'Menu' })],
      ['OPÇÕES', () => this.ir('opcoes')],
      ['CRÉDITOS', () => this.ir('creditos')],
      // no programa instalado (Electron) dá para fechar o jogo pelo menu
      ...(desktop ? [['SAIR DO JOGO', () => desktop.sair()] as [string, () => void]] : []),
    ];
    const passo = opcoes.length > 14 ? 26 : opcoes.length > 12 ? 28 : 31;
    opcoes.forEach(([nome, acao], i) => this.item(cx + 70, 206 + i * passo, () => nome, i === 0 ? (nome.length > 14 ? 16 : 24) : 16, () => this.atirarNoBotao(i, acao)));

    const m = Estado.meta;
    this.txt(16, 18, `CERA DOURADA: ${m.ceraDourada}`, 16, CORES.ouro, 0);
    if (m.partidas > 0) {
      this.txt(TELA_L - 16, 18, `MELHOR ANDAR ${m.melhorAndar}`, 8, CORES.textoApagado, 1);
      this.txt(TELA_L - 16, 34, `MELHOR COMBO x${m.melhorCombo}`, 8, CORES.textoApagado, 1);
      this.txt(TELA_L - 16, 50, `VITÓRIAS ${m.vitorias}`, 8, CORES.textoApagado, 1);
      this.txt(TELA_L - 16, 66, `CONQUISTAS ${m.conquistas.length}/${D.conquistas.length}`, 8, CORES.textoApagado, 1);
    }
    this.txt(TELA_L - 12, TELA_A - 14, VERSAO, 8, CORES.textoApagado, 1);
  }

  private ir(tela: Tela) {
    this.mostrar(tela);
  }

  private irCena(cena: string, dados?: object) {
    this.saindo = true;
    this.scene.start(cena, dados);
  }

  /** Antes de cada partida: escolher o personagem (na dupla, um de cada vez). */
  private escolherPersonagem(modo: 'novo' | 'dupla', desafioId?: string) {
    this.escolha = { modo, jogador: 1, desafio: desafioId };
    this.mostrar('personagem');
  }

  private jogar(modo: 'novo' | 'continuar' | 'diario' | 'tutorial' | 'dupla' = 'novo') {
    if (this.saindo) return;
    this.saindo = true;
    this.cameras.main.fadeOut(200, 7, 5, 11);
    // na primeira partida, a história aparece antes
    // desafio e semente escolhidos antes da partida vão junto
    const extra = modo === 'novo' || modo === 'dupla' ? { desafio: this.escolha.desafio, semente: this.escolha.semente } : {};
    // a próxima partida volta a ser aleatória e sem desafio
    this.escolha.semente = undefined;
    this.escolha.desafio = undefined;
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      Estado.meta.viuHistoria || modo !== 'novo' ? this.scene.start('Jogo', { modo, ...extra }) : this.scene.start('Historia', { depois: 'Jogo' }),
    );
  }

  private telaPersonagem() {
    const cx = TELA_L / 2;
    const { modo, jogador } = this.escolha;
    const dupla = modo === 'dupla';
    const dsf = desafio(this.escolha.desafio);
    this.titulo(dupla ? `JOGADOR ${jogador}: ESCOLHA` : dsf ? `DESAFIO: ${dsf.nome.toUpperCase()}` : 'ESCOLHA SEU PERSONAGEM');
    if (dsf) {
      this.txt(cx, 84, dsf.desc, 8, CORES.perigo);
      this.aoVoltar = () => this.mostrar('desafios');
    }
    if (dupla && jogador === 2) {
      // ESC na vez do J2 volta para a vez do J1
      this.aoVoltar = () => {
        this.escolha.jogador = 1;
        this.mostrar('personagem');
      };
      this.txt(cx, 84, `JOGADOR 1: ${personagem(Opcoes.personagem).nome.toUpperCase()}`, 8, CORES.textoApagado);
    }
    this.moverLuz(cx - 180, 300, 300);
    const lista = D.personagens.filter((p) => personagemPronto(p.id));
    const atual = () => (jogador === 2 ? Opcoes.personagem2 : Opcoes.personagem);
    let idx = Math.max(0, lista.findIndex((p) => p.id === atual()));
    // nunca abre num personagem bloqueado
    if (bloqueado('personagem', lista[idx].id)) idx = Math.max(0, lista.findIndex((p) => !bloqueado('personagem', p.id)));
    let preview: Phaser.GameObjects.GameObject[] = [];
    const miniaturas: Phaser.GameObjects.Image[] = [];
    const nome = this.txt(cx + 40, 120, '', 24, CORES.chama, 0);
    const desc = this.txt(cx + 40, 156, '', 8, CORES.texto, 0).setWordWrapWidth(400);
    const atributos = this.txt(cx + 40, 200, '', 8, CORES.textoApagado, 0).setWordWrapWidth(400);
    const equip = this.txt(cx + 40, 252, '', 8, CORES.ouro, 0);
    const cadeado = this.txt(cx + 40, 380, '', 8, CORES.perigo, 0).setWordWrapWidth(400);

    const textoStats = (st: Record<string, number>) => {
      const nomes: Record<string, string> = {
        chamaMax: 'chama máx', dano: 'dano', velocidade: 'velocidade', decaimento: 'a chama queima', cadencia: 'cadência', danoRecebido: 'dano recebido',
      };
      const partes = Object.entries(st).map(([k, v]) => {
        const n = nomes[k] ?? k;
        if (!STATS_MULTIPLICADORES.includes(k as never)) return `${n} ${v > 0 ? '+' : ''}${v}`;
        // cadência e decaimento: menor é melhor
        const pct = Math.round((v - 1) * 100);
        if (k === 'cadencia') return `atira ${Math.abs(pct)}% mais ${pct < 0 ? 'rápido' : 'devagar'}`;
        return `${n} ${pct > 0 ? '+' : ''}${pct}%`;
      });
      return partes.length ? partes.join(' · ') : 'tudo na média';
    };

    const atualizar = () => {
      const p = lista[idx];
      const bloq = bloqueado('personagem', p.id);
      if (!bloq) {
        if (jogador === 2) Opcoes.personagem2 = p.id;
        else Opcoes.personagem = p.id;
        salvarOpcoes();
      }
      preview.forEach((o) => o.destroy());
      preview = [];
      const h = this.heroi(p.id, cx - 180, 380, 9);
      h.s.play(`heroi_${p.id}_andar`);
      if (bloq) {
        h.s.setTint(0x000000).setAlpha(0.7);
        h.arma.setTint(0x000000).setAlpha(0.7);
      }
      preview = [h.s, h.arma];
      nome.setText(bloq ? '???' : p.nome.toUpperCase()).setColor(bloq ? CORES.textoApagado : p.cor);
      desc.setText(bloq ? 'Personagem bloqueado.' : p.desc);
      atributos.setText(bloq ? '' : textoStats((p.stats ?? {}) as Record<string, number>));
      // equipamento inicial: armas, itens e o ativo
      const icones: [string, number][] = [
        ...p.armas.map((a) => [acharArma(a).sprite, 3] as [string, number]),
        ...p.itens.filter((i) => acharItem(i)).map((i) => [`icone_${i}`, 2.4] as [string, number]),
        ...(p.ativo && acharAtivo(p.ativo) ? [[`icone_${p.ativo}`, 2.4] as [string, number]] : []),
      ];
      equip.setText(bloq ? '' : 'COMEÇA COM:');
      if (!bloq) {
        icones.forEach(([tex, esc], i) => {
          const im = this.img(cx + 70 + (i % 6) * 64, 300 + Math.floor(i / 6) * 50, tex, esc);
          preview.push(im);
        });
        const nomes = [...p.armas.map((a) => acharArma(a).nome), ...p.itens.map((i) => acharItem(i)?.nome ?? i), ...(p.ativo ? [acharAtivo(p.ativo)?.nome ?? p.ativo] : [])];
        const t = this.txt(cx + 40, 340, nomes.join(' · '), 8, CORES.textoApagado, 0).setWordWrapWidth(420);
        preview.push(t);
      }
      // marcas: os finais já vencidos com este personagem
      const finais = Estado.meta.porPersonagem[p.id]?.finais ?? [];
      const marcas: [string, string][] = [['apagador', 'APAGADOR'], ['negro', 'PAVIO NEGRO'], ['acendedor', 'ACENDEDOR']];
      if (!bloq) {
        preview.push(this.txt(cx + 40, 420, 'MARCAS:', 8, CORES.textoApagado, 0));
        marcas.forEach(([id, nome], i) => {
          const t = this.txt(cx + 110 + i * 110, 420, nome, 8, finais.includes(id) ? CORES.ouro : '#4a3e56', 0);
          preview.push(t);
        });
        const premio = D.itens.find((it) => it.id === `rel_${p.id}`);
        if (premio) preview.push(this.txt(cx + 40, 440, `Vença com ${p.nome} para liberar: ${premio.nome}`, 8, finais.length ? '#7fdc8a' : CORES.textoApagado, 0));
      }
      const cq = conquistaDe('personagem', p.id);
      cadeado.setText(bloq && cq ? `BLOQUEADO: ${cq.desc}` : '');
      miniaturas.forEach((m, i) => {
        m.setAlpha(i === idx ? 1 : 0.45).setScale(i === idx ? 2.6 : 2.1);
        if (bloqueado('personagem', lista[i].id)) m.setTint(0x000000);
        else m.clearTint();
      });
    };

    lista.forEach((p, i) => {
      const x = cx + (i - (lista.length - 1) / 2) * 62;
      const m = this.img(x, 520, texturaPersonagem(p.id), 2.1, 0).setOrigin(0.5, 1).setInteractive({ useHandCursor: true });
      m.on('pointerdown', () => {
        idx = i;
        Som.tocar('menu');
        atualizar();
      });
      miniaturas.push(m);
    });

    const mudar = (d: -1 | 1) => {
      idx = (idx + d + lista.length) % lista.length;
      Som.tocar('menu');
      atualizar();
    };
    const confirmar = () => {
      if (bloqueado('personagem', lista[idx].id)) {
        Som.tocar('erro');
        return;
      }
      Som.tocar('confirmar');
      if (dupla && jogador === 1) {
        // agora é a vez do jogador 2
        this.escolha.jogador = 2;
        this.transicao(cx, 570, () => this.mostrar('personagem'));
        return;
      }
      this.jogar(modo);
    };
    this.item(cx - 60, 570, () => (dupla && jogador === 1 ? 'PRÓXIMO: JOGADOR 2' : 'COMEÇAR!'), 16, confirmar, mudar);
    // aleatório: sorteia entre os liberados e já começa
    this.item(cx + 170, 570, () => 'ALEATÓRIO', 8, () => {
      const livres = lista.map((_, i) => i).filter((i) => !bloqueado('personagem', lista[i].id));
      idx = livres[Math.floor(Math.random() * livres.length)] ?? 0;
      atualizar();
      this.time.delayedCall(350, confirmar);
    }, mudar);
    // semente: deixa em branco (aleatória) ou digita o código de um amigo
    if (jogador === 1) {
      this.item(cx - 330, 570, () => `SEMENTE: ${this.escolha.semente !== undefined ? codigoSemente(this.escolha.semente) : 'ALEATÓRIA'}`, 8, () => {
        Som.tocar('menu');
        this.mostrar('semente');
      }, mudar);
    }
    this.rodape('A/D ou SETAS trocar   ENTER começar   ESC voltar');
    atualizar();
  }

  private telaArsenal() {
    const cx = TELA_L / 2;
    this.titulo('ARSENAL');
    this.moverLuz(cx, 320, 400);
    // tudo vira uma lista de páginas: armas, itens, sinergias e inimigos
    type Pagina = { nome: string; desenhar: () => void };
    const paginas: Pagina[] = [];
    const fatiar = <T,>(lista: T[], n: number) => Array.from({ length: Math.ceil(lista.length / n) }, (_, k) => lista.slice(k * n, k * n + n));

    // o que ainda está trancado atrás de uma conquista aparece apagado, dizendo como liberar
    const trancado = (tipo: 'item' | 'arma' | 'ativo', id: string) => {
      if (!bloqueado(tipo, id)) return '';
      return `BLOQUEADO: ${conquistaDe(tipo, id)!.desc}`;
    };
    // armas separadas por tier, das míticas para as comuns
    for (let tier = RARIDADES.length - 1; tier >= 0; tier--) {
      const r = raridade(tier);
      fatiar(D.armas.filter((a) => a.raridade === tier), 6).forEach((grupo, k, todos) => paginas.push({
      nome: `ARMAS ${['INICIAIS', 'COMUNS', 'INCOMUNS', 'RARAS', 'ÉPICAS', 'MÍTICAS'][tier]} ${k + 1}/${todos.length}`,
      desenhar: () => grupo.forEach((a, i) => {
        const y = 150 + i * 72;
        const bloq = trancado('arma', a.id);
        if (bloq) {
          this.img(90, y + 8, a.sprite, 4).setTint(0x000000).setAlpha(0.6);
          this.txt(150, y, '???', 16, CORES.textoApagado, 0);
          this.txt(150, y + 22, bloq, 8, CORES.perigo, 0);
          return;
        }
        this.img(90, y + 8, a.sprite, 4);
        this.txt(150, y, a.nome.toUpperCase(), 16, r.cor, 0);
        this.txt(TELA_L - 40, y, r.nome, 8, r.cor, 1);
        this.txt(150, y + 22, a.desc, 8, CORES.texto, 0);
        const mun = a.municao < 0 ? 'infinita' : `${a.municao}`;
        const extra = a.projeteis > 1 ? ` x${a.projeteis}` : '';
        const tiros = a.laser ? 'laser' : `${(1 / a.cadencia).toFixed(1)} tiros/s`;
        this.txt(150, y + 38, `dano ${a.dano}${extra} · ${tiros} · pente ${a.pente} · munição ${mun}`, 8, CORES.textoApagado, 0);
      }),
    }));
    }
    fatiar(D.itens, 12).forEach((grupo, k, todos) => paginas.push({
      nome: `ITENS ${k + 1}/${todos.length}`,
      desenhar: () => grupo.forEach((it, i) => {
        const x = 60 + (i % 2) * 440;
        const y = 150 + Math.floor(i / 2) * 66;
        const bloq = trancado('item', it.id);
        if (bloq) {
          this.img(x + 14, y + 8, `icone_${it.id}`, 3).setTint(0x000000).setAlpha(0.6);
          this.txt(x + 44, y, '???', 16, CORES.textoApagado, 0);
          this.txt(x + 44, y + 22, bloq, 8, CORES.perigo, 0);
          return;
        }
        this.img(x + 14, y + 8, `icone_${it.id}`, 3);
        // malditos: roxo e com asterisco (bônus forte, mas com um preço)
        this.txt(x + 44, y, it.nome.toUpperCase() + (it.maldito ? ' *' : ''), 16, it.maldito ? '#c86bff' : it.cor, 0);
        this.txt(x + 44, y + 22, it.desc, 8, CORES.texto, 0);
        const tags = (it.tags ?? []).map((t) => D.tags[t] ?? t).join(' · ');
        this.txt(x + 44, y + 36, tags + (it.referencia ? '  (referência)' : ''), 8, CORES.textoApagado, 0);
      }),
    }));
    fatiar(D.ativos, 10).forEach((grupo, k, todos) => paginas.push({
      nome: `ITENS ATIVOS ${k + 1}/${todos.length}`,
      desenhar: () => grupo.forEach((a, i) => {
        const x = 60 + (i % 2) * 440;
        const y = 150 + Math.floor(i / 2) * 72;
        const bloq = trancado('ativo', a.id);
        this.img(x + 14, y + 8, `icone_${a.id}`, 3).setTint(bloq ? 0x000000 : 0xffffff).setAlpha(bloq ? 0.6 : 1);
        if (bloq) {
          this.txt(x + 44, y, '???', 16, CORES.textoApagado, 0);
          this.txt(x + 44, y + 22, bloq, 8, CORES.perigo, 0);
          return;
        }
        this.txt(x + 44, y, a.nome.toUpperCase() + (a.maldito ? ' *' : ''), 16, a.maldito ? '#c86bff' : a.cor, 0);
        this.txt(x + 44, y + 22, a.desc, 8, CORES.texto, 0);
        this.txt(x + 44, y + 38, `recarga: ${a.carga} sala${a.carga > 1 ? 's' : ''}`, 8, CORES.textoApagado, 0);
      }),
    }));
    const vistas = Estado.meta.sinergiasVistas;
    fatiar(D.sinergias, 9).forEach((grupo, k, todos) => paginas.push({
      nome: `SINERGIAS ${k + 1}/${todos.length} (${vistas.length}/${D.sinergias.length} achadas)`,
      desenhar: () => grupo.forEach((sg, i) => {
        const y = 146 + i * 46;
        // ainda não descoberta: fica secreta
        if (!vistas.includes(sg.id)) {
          sg.itens.forEach((_id, j) => this.txt(70 + j * 34, y + 8, '?', 16, CORES.textoApagado));
          this.txt(150, y, '???', 16, CORES.textoApagado, 0);
          const dica = sg.transformacao ? `TRANSFORMAÇÃO secreta: junte ${sg.familia?.n ?? 3} itens da mesma família.` : sg.tags ? 'Sinergia secreta: junte itens que têm algo em comum.' : sg.arma ? 'Sinergia secreta: uma arma e um item.' : `Sinergia secreta: combine ${sg.itens.length} itens certos.`;
          this.txt(150, y + 20, dica, 8, CORES.textoApagado, 0);
          return;
        }
        const partes = [
          ...(sg.arma ? [D.armas.find((a) => a.id === sg.arma)?.nome ?? sg.arma] : []),
          ...sg.itens.map((id) => D.itens.find((x) => x.id === id)?.nome ?? id),
          ...Object.entries(sg.tags ?? {}).map(([t, n]) => `${n}x ${D.tags[t] ?? t}`),
          ...(sg.familia ? [`${sg.familia.n} itens de: ${sg.familia.tags.map((t) => D.tags[t] ?? t).join(', ')}`] : []),
        ];
        sg.itens.forEach((id, j) => this.img(70 + j * 34, y + 8, `icone_${id}`, 2));
        this.txt(150, y, `${sg.nome}`, 16, CORES.ouro, 0);
        this.txt(150, y + 20, `${partes.join(' + ')}: ${sg.desc}`, 8, CORES.texto, 0);
      }),
    }));
    const inimigos = Object.entries(D.inimigos).filter(([id]) => id !== 'slime_mini');
    fatiar(inimigos, 8).forEach((grupo, k, todos) => paginas.push({
      nome: `INIMIGOS ${k + 1}/${todos.length}`,
      desenhar: () => grupo.forEach(([, def], i) => {
        const x = 80 + (i % 2) * 440;
        const y = 165 + Math.floor(i / 2) * 92;
        const spr = this.add.sprite(x, y + 22, def.sprite).setOrigin(0.5, 1).setScale(def.chefe ? 1.4 : 3);
        if (this.anims.exists(`${def.sprite}_mover`)) spr.play(`${def.sprite}_mover`);
        this.camada.add(spr);
        this.txt(x + 46, y - 6, def.nome.toUpperCase(), 16, def.chefe ? CORES.perigo : CORES.chama, 0);
        this.txt(x + 46, y + 16, def.desc, 8, CORES.texto, 0);
      }),
    }));

    this.abaArsenal = Phaser.Math.Wrap(this.abaArsenal, 0, paginas.length);
    const mudar = (d: -1 | 1) => {
      this.abaArsenal = Phaser.Math.Wrap(this.abaArsenal + d, 0, paginas.length);
      Som.tocar('menu');
      this.mostrar('arsenal');
    };
    this.item(cx, 100, () => paginas[this.abaArsenal].nome, 16, () => mudar(1), mudar);
    paginas[this.abaArsenal].desenhar();
    const nomePag = paginas[this.abaArsenal].nome;
    this.rodape(nomePag.startsWith('ITENS ATIVOS') ? 'Use com C (ou botão do meio). Limpar salas recarrega.   A/D trocar página' : nomePag.startsWith('ITENS') ? '* MALDITO: bônus forte com um preço   ·   A/D trocar página   ESC voltar' : 'A/D ou SETAS trocar página   ESC voltar');
  }

  /** Desafios: partidas com regras fixas. Vencer dá cera dourada e libera os familiares. */
  private telaDesafios() {
    const cx = TELA_L / 2;
    this.titulo('DESAFIOS');
    this.moverLuz(cx, 320, 420);
    const feitos = Estado.meta.desafiosFeitos;
    this.txt(cx, 92, `Vença O Apagador com a regra do desafio. Feitos: ${feitos.length}/${DESAFIOS.length}`, 8, CORES.textoApagado);
    const info = this.txt(cx, 540, '', 8, CORES.texto).setWordWrapWidth(760);
    DESAFIOS.forEach((d, i) => {
      const y = 140 + i * 46;
      const feito = feitos.includes(d.id);
      this.item(120, y, () => `${feito ? '[FEITO] ' : ''}${d.nome.toUpperCase()}`, 16, () => {
        Som.tocar('confirmar');
        this.transicao(cx, y, () => this.escolherPersonagem('novo', d.id));
      }, undefined, 0);
      this.txt(120, y + 20, d.desc, 8, feito ? '#7fdc8a' : CORES.textoApagado, 0);
      this.txt(TELA_L - 60, y, `+${d.premio} CERA DOURADA`, 8, CORES.ouro, 1);
    });
    info.setText('Vencer 1, 3 e 8 desafios libera as coleiras da TETE, da NIX, da YUUMI e a Corujinha.');
    this.rodape('W/S escolher   ENTER jogar   ESC voltar');
  }

  /** Digitar a semente de um amigo (6 letras, aparece na pausa e no fim da partida). */
  private telaSemente() {
    const cx = TELA_L / 2;
    this.titulo('SEMENTE');
    this.moverLuz(cx, 300, 380);
    this.aoVoltar = () => this.mostrar('personagem');
    this.digitado = this.escolha.semente !== undefined ? codigoSemente(this.escolha.semente).replace('-', '') : '';
    this.txt(cx, 120, 'Digite o código que um amigo te passou para jogar a MESMA masmorra.', 8, CORES.texto);
    this.txt(cx, 140, 'O código aparece na pausa e no fim de toda partida.', 8, CORES.textoApagado);
    const caixas: Phaser.GameObjects.Text[] = [];
    for (let i = 0; i < 6; i++) {
      const x = cx - 150 + i * 52 + (i >= 3 ? 30 : 0);
      const r = this.add.rectangle(x, 240, 44, 56, 0x120c1a, 1).setStrokeStyle(2, 0x3a2e48);
      this.camada.add(r);
      caixas.push(this.txt(x, 240, '', 24, CORES.chama));
    }
    this.txt(cx, 240, '-', 24, CORES.textoApagado);
    const aviso = this.txt(cx, 300, '', 8, CORES.perigo);
    const atualizar = () => {
      caixas.forEach((c, i) => c.setText(this.digitado[i] ?? (i === this.digitado.length ? '_' : '')));
      aviso.setText('');
    };
    this.atualizarSemente = atualizar;
    this.avisoSemente = (t: string) => aviso.setText(t);
    atualizar();
    this.item(cx, 380, () => 'USAR ESTA SEMENTE', 16, () => this.confirmarSemente());
    this.item(cx, 420, () => 'SEMENTE ALEATÓRIA', 8, () => {
      this.escolha.semente = undefined;
      Som.tocar('voltar');
      this.mostrar('personagem');
    });
    this.rodape(`LETRAS E NÚMEROS digitar (${ALFABETO_SEMENTE.length} símbolos)   APAGAR corrigir   ENTER usar   ESC voltar`);
  }

  private atualizarSemente: () => void = () => {};
  private avisoSemente: (t: string) => void = () => {};

  /** Tela da semente: letras entram no código; devolve true se a tecla foi usada. */
  private digitar(e: KeyboardEvent) {
    if (e.code === 'Backspace') {
      this.digitado = this.digitado.slice(0, -1);
      this.atualizarSemente();
      return true;
    }
    if (e.code === 'Enter') {
      this.confirmarSemente();
      return true;
    }
    const ch = e.key?.length === 1 ? e.key.toUpperCase() : '';
    if (ch && /[A-Z0-9]/.test(ch)) {
      if (this.digitado.length < 6) this.digitado += ch;
      Som.tocar('menu');
      this.atualizarSemente();
      return true;
    }
    return false;
  }

  private confirmarSemente() {
    const n = lerSemente(this.digitado);
    if (n === null) {
      Som.tocar('erro');
      this.avisoSemente(this.digitado.length < 6 ? 'O código tem 6 letras/números.' : 'Código inválido. Confira as letras.');
      return;
    }
    this.escolha.semente = n;
    Som.tocar('confirmar');
    this.mostrar('personagem');
  }

  private telaConquistas() {
    const cx = TELA_L / 2;
    this.titulo('CONQUISTAS');
    this.moverLuz(cx, 320, 500);
    const feitas = Estado.meta.conquistas;
    this.txt(cx, 92, `${feitas.length}/${D.conquistas.length} conquistadas · cada uma libera algo novo nas partidas`, 8, CORES.textoApagado);
    D.conquistas.forEach((c, i) => {
      const x = 40 + (i % 2) * 450;
      const y = 124 + Math.floor(i / 2) * 58;
      const ok = feitas.includes(c.id);
      this.txt(x, y, `${ok ? '[X]' : '[ ]'} ${c.nome.toUpperCase()}`, 16, ok ? CORES.ouro : CORES.textoApagado, 0);
      this.txt(x + 24, y + 20, c.desc, 8, ok ? CORES.texto : CORES.textoApagado, 0);
      this.txt(x + 24, y + 34, `Libera: ${c.desbloqueia.map(nomeDesbloqueio).join(', ')}`, 8, ok ? '#7fdc8a' : '#6e5a7e', 0);
    });
    this.rodape('ESC voltar');
  }

  private telaEstatisticas() {
    const cx = TELA_L / 2;
    this.titulo('ESTATÍSTICAS');
    this.moverLuz(cx, 320, 600);
    const m = Estado.meta;
    const tempo = (seg: number) => {
      const h = Math.floor(seg / 3600);
      const min = Math.floor((seg % 3600) / 60);
      return h ? `${h}h ${min}min` : `${min}min ${Math.floor(seg % 60)}s`;
    };
    // ---- totais ----
    this.txt(40, 100, 'GERAL', 16, CORES.chama, 0);
    const totais: [string, string | number][] = [
      ['Partidas', m.partidas], ['Vitórias', m.vitorias], ['Tempo jogado', tempo(m.tempoTotal)], ['Melhor andar', m.melhorAndar],
      ['Melhor combo', `x${m.melhorCombo}`], ['Monstros derrotados', m.inimigosTotal], ['Sinergias achadas', `${m.sinergiasVistas.length}/${D.sinergias.length}`],
      ['Conquistas', `${m.conquistas.length}/${D.conquistas.length}`], ['Finais vistos', `${m.finais.length}/3`],
    ];
    totais.forEach(([k, v], i) => {
      this.txt(40, 128 + i * 20, k, 8, CORES.textoApagado, 0);
      this.txt(250, 128 + i * 20, String(v), 8, CORES.texto, 1);
    });
    // ---- do que você mais morre ----
    this.txt(40, 330, 'MORREU PARA', 16, CORES.perigo, 0);
    const causas = Object.entries(m.causas).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (!causas.length) this.txt(40, 358, 'Ainda nada. Bom sinal!', 8, CORES.textoApagado, 0);
    causas.forEach(([c, n], i) => this.txt(40, 358 + i * 18, `${n}x  ${c}`, 8, CORES.texto, 0));
    // ---- por personagem ----
    this.txt(300, 100, 'POR PERSONAGEM', 16, CORES.chama, 0);
    this.txt(300, 124, 'partidas · vitórias · melhor andar · finais', 8, CORES.textoApagado, 0);
    const pers = D.personagens.filter((p) => m.porPersonagem[p.id]);
    if (!pers.length) this.txt(300, 146, 'Jogue uma partida para aparecer aqui.', 8, CORES.textoApagado, 0);
    pers.slice(0, 10).forEach((p, i) => {
      const r = m.porPersonagem[p.id];
      this.txt(300, 146 + i * 18, p.nome.toUpperCase(), 8, p.cor, 0);
      this.txt(470, 146 + i * 18, `${r.partidas} · ${r.vitorias} · ${r.melhorAndar} · ${r.finais.length}/3`, 8, CORES.texto, 0);
    });
    // ---- itens mais pegos ----
    this.txt(640, 100, 'ITENS FAVORITOS', 16, CORES.chama, 0);
    const favoritos = Object.entries(m.itensPegos).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (!favoritos.length) this.txt(640, 128, 'Nenhum item ainda.', 8, CORES.textoApagado, 0);
    favoritos.forEach(([id, n], i) => {
      const it = acharItem(id);
      if (!it) return;
      this.img(652, 134 + i * 26, `icone_${id}`, 1.5);
      this.txt(672, 134 + i * 26, `${n}x ${it.nome}`, 8, it.cor, 0);
    });
    // ---- últimas partidas ----
    this.txt(300, 340, 'ÚLTIMAS PARTIDAS', 16, CORES.chama, 0);
    const nomeFim: Record<string, string> = { apagador: 'venceu O Apagador', negro: 'venceu O Pavio Negro', acendedor: 'venceu O Acendedor' };
    if (!m.historico.length) this.txt(300, 368, 'Nenhuma partida registrada ainda.', 8, CORES.textoApagado, 0);
    m.historico.slice(0, 8).forEach((r, i) => {
      const quem = personagem(r.personagem).nome;
      const como = r.vitoria ? nomeFim[r.fim ?? ''] ?? 'venceu' : `morreu para ${r.causa}`;
      const diario = r.modo === 'diario' ? ' (diário)' : '';
      this.txt(300, 368 + i * 18, `${quem}${diario} · andar ${r.andar} · ${tempo(r.tempo)} · ${como}`, 8, r.vitoria ? CORES.ouro : CORES.texto, 0);
    });
    this.item(cx, TELA_A - 50, () => 'VOLTAR', 16, () => this.voltar());
  }

  private telaComoJogar() {
    this.titulo('COMO JOGAR');
    this.moverLuz(TELA_L / 2, 320, 600);
    const controles: [string, string][] = [
      ['WASD', 'andar'],
      ['MOUSE', 'mirar (clique segura o tiro)'],
      ['SETAS', 'mirar e atirar sem mouse'],
      ['ESPAÇO / SHIFT', 'esquiva (dash invencível)'],
      ['CLIQUE DIR. / F', 'parry: rebate as balas'],
      ['R', 'recarregar'],
      ['Q / RODA / 1 2 3', 'trocar de arma'],
      ['E', 'interagir, comprar, trocar arma'],
      ['C / BOTÃO DO MEIO', 'usar o item ativo'],
      ['P / ESC', 'pausar'],
    ];
    controles.forEach(([k, v], i) => {
      this.txt(330, 110 + i * 28, k, 16, CORES.chama, 1);
      this.txt(350, 110 + i * 28, v, 16, CORES.texto, 0);
    });
    const dicas = [
      'A CHAMA é sua vida, seu relógio e sua luz: ela queima sozinha.',
      'PARRY na hora certa rebate as balas, cura e recarrega o dash.',
      'Itens se COMBINAM: dois certos juntos liberam uma SINERGIA secreta.',
      'Passar RASPANDO numa bala durante o dash = ESQUIVA PERFEITA (câmera lenta).',
      'Combo x10 liga o FRENESI: mais rápido, atira mais. Não deixe o combo cair!',
      'Monstros ELITE brilham vermelho e explodem num anel de balas.',
      'Caixotes quebram. Salas escuras: só a sua chama ilumina. Cada andar tem um chefe.',
      'Paredes RACHADAS escondem salas secretas: atire nelas ou exploda.',
      'Caveiras vermelhas na porta: sala de DESAFIO (3 ondas, prêmio raro).',
    ];
    dicas.forEach((d, i) => this.txt(TELA_L / 2, 398 + i * 20, d, 8, i === 0 ? CORES.ouro : CORES.texto));
    this.item(TELA_L / 2, TELA_A - 50, () => 'VOLTAR', 16, () => this.voltar());
  }

  private telaOpcoes() {
    const cx = TELA_L / 2;
    this.titulo('OPÇÕES');
    this.moverLuz(cx, 300, 420);
    const barra = (v: number) => '|'.repeat(v) + '.'.repeat(10 - v);
    const ajustar = (chave: 'musica' | 'efeitos', d: -1 | 1) => {
      Opcoes[chave] = Phaser.Math.Clamp(Opcoes[chave] + d, 0, 10);
      salvarOpcoes();
      Som.aplicarVolumes();
      if (chave === 'efeitos') Som.tocar('pistola');
      this.atualizarRotulos();
    };
    const alternar = (chave: 'tremor' | 'mostrarFps' | 'flashes' | 'brilho' | 'dev') => {
      Opcoes[chave] = !Opcoes[chave];
      salvarOpcoes();
      Som.tocar('menu');
      this.atualizarRotulos();
    };
    const simNao = (b: boolean) => (b ? 'SIM' : 'NÃO');

    this.item(cx, 120, () => `MÚSICA   [${barra(Opcoes.musica)}]`, 16, undefined, (d) => ajustar('musica', d));
    this.item(cx, 160, () => `EFEITOS  [${barra(Opcoes.efeitos)}]`, 16, undefined, (d) => ajustar('efeitos', d));
    this.item(cx, 200, () => `TREMOR DE TELA: ${simNao(Opcoes.tremor)}`, 16, () => alternar('tremor'), () => alternar('tremor'));
    this.item(cx, 240, () => `LUZES PISCANTES: ${simNao(Opcoes.flashes)}`, 16, () => alternar('flashes'), () => alternar('flashes'));
    this.item(cx, 280, () => `BRILHO (BLOOM): ${simNao(Opcoes.brilho)}`, 16, () => alternar('brilho'), () => alternar('brilho'));
    this.item(cx, 320, () => `MOSTRAR FPS: ${simNao(Opcoes.mostrarFps)}`, 16, () => alternar('mostrarFps'), () => alternar('mostrarFps'));
    this.item(cx, 360, () => 'TELA CHEIA', 16, () => this.scale.toggleFullscreen());
    this.item(cx, 400, () => `MODO DESENVOLVEDOR: ${Opcoes.dev ? 'LIGADO (TUDO LIBERADO, F2 NO JOGO)' : 'DESLIGADO'}`, 8, () => alternar('dev'), () => alternar('dev'));
    this.txt(cx, 525, 'Sensível a luzes piscantes? Desligue LUZES PISCANTES e TREMOR.', 8, CORES.textoApagado);
    this.txt(cx, 545, 'MODO DESENVOLVEDOR: libera personagens, itens, armas e andares, e liga o menu F2 dentro da partida.', 8, CORES.textoApagado);
    this.item(
      cx, 440,
      () => (this.confirmarApagar ? 'TEM CERTEZA? ENTER DE NOVO' : 'APAGAR PROGRESSO'),
      16,
      () => {
        if (!this.confirmarApagar) {
          this.confirmarApagar = true;
          Som.tocar('erro');
        } else {
          apagarProgresso();
          this.confirmarApagar = false;
          Som.tocar('voltar');
        }
        this.atualizarRotulos();
      },
    );
    this.item(cx, 480, () => 'VOLTAR', 16, () => this.voltar());
    this.rodape('W/S escolher   A/D ajustar   ENTER alternar   ESC voltar');
  }

  private telaCreditos() {
    const cx = TELA_L / 2;
    this.titulo('CRÉDITOS');
    this.moverLuz(cx, 300, 500);
    const linhas: [string, string][] = [
      ['UM JOGO DA', 'WW STUDIOS (Wraith Ware)'],
      ['CRIAÇÃO E PROGRAMAÇÃO', 'Luiz Vargas'],
      ['VELA, ARMAS E EFEITOS', 'Luiz Vargas'],
      ['MÚSICA E SONS', 'Luiz Vargas'],
      ['ARTE DA MASMORRA', '16x16 DungeonTileset II, por 0x72 (CC0)'],
      ['', '0x72.itch.io/dungeontileset-ii'],
      ['FONTE', 'Press Start 2P, por CodeMan38 (OFL)'],
    ];
    linhas.forEach(([a, b], i) => {
      if (a) this.txt(cx, 130 + i * 56, a, 16, CORES.chama);
      this.txt(cx, 154 + i * 56 - (a ? 0 : 30), b, 8, CORES.texto);
    });
    this.item(cx, TELA_A - 60, () => 'VOLTAR', 16, () => this.voltar());
  }
}
