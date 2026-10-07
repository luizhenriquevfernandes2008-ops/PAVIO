import Phaser from 'phaser';
import { D, InimigoDef } from '../dados';
import { Som } from '../som';
import { ajusteVisual } from '../arte/atlas';
import type { Jogo } from '../cenas/Jogo';

const SEQ_APAGADOR = ['preparar', 'anel', 'rajada', 'preparar', 'invocar', 'espiral', 'anel'];
const SEQ_OGRO = ['salto', 'pedras', 'salto', 'investida', 'pedras'];
const SEQ_PODRE = ['vomito', 'invocar', 'anel', 'vomito', 'investida'];
const SEQ_NEGRO = ['dash', 'escopeta', 'parry', 'espiral', 'dash', 'apagar', 'escopeta', 'invocar'];

export class Inimigo extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  readonly def: InimigoDef;
  readonly ritmo: number; // elites atiram mais rápido
  vida: number;
  vidaMax: number;
  dano: number;
  fase: 'surgindo' | 'ativo' = 'surgindo';
  sub = 'andar';
  t = 0;
  timer = 0;
  tiroTimer: number;
  teleTimer: number;
  acaoTimer: number;
  atordoado = 0;
  morto = false;
  semente = Math.random() * 10;
  alvo = new Phaser.Math.Vector2();
  passo = 0;
  ondas = 0;
  giro = 0;
  atingidoPor = new Set<number>(); // balas perfurantes que já acertaram
  danoAcum = 0; // dano somado para o número que salta na tela
  ultimoPopup = 0;
  espinhoCd = 0;
  // estados
  queima = 0;
  veneno = 0;
  congelado = 0;
  private tickStatus = 0;
  private flashT = 0;
  alerta = false; // tinta vermelha de aviso (vai atacar)
  refletindo = 0; // Pavio Negro: enquanto > 0, rebate os seus tiros
  intangivel = false; // alma penada sumida: tiros atravessam
  atravessa = false; // passa pelas paredes
  furiaAnunciada = false;
  private tintaBase: number | null = null;
  escudoAng = 0; // escudeiro: para onde o escudo aponta (gira devagar)
  escudoVida = 0; // escudeiro: dano que o escudo aguenta antes de quebrar

  constructor(scene: Jogo, x: number, y: number, readonly tipo: string, readonly andar: number, readonly elite = false) {
    const def = D.inimigos[tipo];
    super(scene, x, y, def.sprite, 0);
    this.def = def;
    const esc = D.config.escalaAndar;
    const nivel = def.semEscala ? 0 : andar - 1;
    this.vidaMax = def.vida * (1 + esc.vida * nivel) * (elite ? D.config.elite.vida : 1);
    this.vida = this.vidaMax;
    this.dano = Math.round(def.dano * (1 + esc.dano * nivel));
    this.ritmo = elite ? 0.7 : 1;
    if (def.ia === 'escudo') this.escudoVida = this.vidaMax * 1.2;
    this.tiroTimer = (def.projetil?.intervalo || 2) * (0.5 + Math.random() * 0.6);
    this.teleTimer = 2 + Math.random() * 2;
    this.acaoTimer = 1 + Math.random() * 1.5;
    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  /** Chamado depois de entrar no grupo de física (o grupo reseta o corpo ao adicionar). */
  configurar() {
    const ajuste = ajusteVisual(this.def.sprite);
    const escala = this.def.escalaFixa ?? (this.tipo === 'slime_mini' ? this.def.escala ?? 1 : ajuste?.escala ?? this.def.escala ?? 1);
    if (this.def.tinta) this.tintaBase = Phaser.Display.Color.HexStringToColor(this.def.tinta).color;
    this.atravessa = this.def.ia === 'fantasma';
    this.setScale(escala * (this.elite ? 1.2 : 1));
    if (this.elite) this.preFX?.addGlow(0xff2a4a, 3, 0, false, 0.1, 12);
    const [w, h] = this.def.escalaFixa ? this.def.corpo : ajuste?.corpo ?? this.def.corpo;
    const fw = this.frame.realWidth;
    const fh = this.frame.realHeight;
    this.body.setSize(w, h);
    this.body.setOffset((fw - w) / 2, fh - h);
    if (this.scene.anims.exists(`${this.def.sprite}_mover`)) this.play(`${this.def.sprite}_mover`);
    this.setAlpha(0);
    this.scene.tweens.add({ targets: this, alpha: 1, duration: 450 });
    this.anims.timeScale = 0.85 + Math.random() * 0.3;
  }

  get ehChefe() {
    return !!this.def.chefe;
  }

  piscar() {
    this.flashT = 0.06;
  }

  aplicarStatus(tipo: 'queima' | 'veneno' | 'congelado', segundos: number) {
    if (tipo === 'congelado' && this.ehChefe) segundos *= 0.35; // chefe resiste ao gelo
    this[tipo] = Math.max(this[tipo], segundos);
  }

  /** Quantos projéteis solta (aumenta nos andares mais fundos e nas elites). */
  private get qtdTiros() {
    const p = this.def.projetil!;
    const extra = (this.andar - 1) * (this.def.ia === 'tanque' ? 2 : 1) + (this.elite ? 2 : 0);
    return this.def.ia === 'atirador' || this.def.ia === 'tanque' ? p.quantidade + extra : p.quantidade;
  }

  atualizar(dtReal: number, jogo: Jogo) {
    if (this.morto) return;
    this.espinhoCd -= dtReal;
    this.flashT -= dtReal;

    // ---- estados: queimadura e veneno ferem; gelo deixa tudo lento ----
    this.queima -= dtReal;
    this.veneno -= dtReal;
    this.congelado -= dtReal;
    this.refletindo -= dtReal;
    this.tickStatus -= dtReal;
    if (this.tickStatus <= 0 && (this.queima > 0 || this.veneno > 0)) {
      this.tickStatus = 0.4;
      if (this.queima > 0) jogo.ferirInimigo(this, 0.6, null, 'queima');
      if (!this.morto && this.veneno > 0) jogo.ferirInimigo(this, 0.45 * jogo.forcaVeneno, null, 'veneno');
      if (this.morto) return;
    }
    const lento = this.congelado > 0 ? 0.3 : 1;
    const dt = dtReal * lento;
    this.t += dt;
    this.pintar();

    const j = jogo.alvoDe(this);
    const dx = j.x - this.x;
    const dy = j.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    if (this.fase === 'surgindo') {
      this.setVelocity(0, 0);
      if (this.t > (this.ehChefe ? 1.4 : 0.5)) {
        this.fase = 'ativo';
        this.t = 0;
        if (this.ehChefe) {
          this.sub = 'perseguir';
          this.timer = 1.2;
        }
      }
      return;
    }

    if (this.atordoado > 0) {
      this.atordoado -= dtReal;
      this.body.velocity.scale(Math.pow(0.02, dtReal));
      return;
    }

    switch (this.def.ia) {
      case 'zigue-zague':
        this.iaDiabrete(dt, jogo, nx, ny, dist);
        break;
      case 'enxame': {
        const bal = Math.sin(this.t * 7 + this.semente) * 0.35;
        const v = new Phaser.Math.Vector2(nx - ny * bal, ny + nx * bal).normalize().scale(this.def.velocidade);
        this.setVelocity(v.x, v.y);
        this.setFlipX(v.x < 0);
        break;
      }
      case 'perseguir':
        this.iaEsqueleto(dt, jogo, nx, ny, dist);
        break;
      case 'saltar':
        this.body.velocity.scale(Math.pow(0.03, dt));
        this.timer -= dt;
        if (this.timer <= 0) {
          const salto = this.def.salto ?? 120;
          const desvio = (Math.random() - 0.5) * 0.6;
          this.setVelocity((nx - ny * desvio) * salto, (ny + nx * desvio) * salto);
          this.timer = 0.9 + Math.random() * 0.5;
          this.setFlipX(nx < 0);
        }
        break;
      case 'atirador':
      case 'invocador':
        this.iaDistancia(dt, jogo, nx, ny, dist);
        break;
      case 'tanque':
        this.iaTanque(dt, jogo, nx, ny);
        break;
      case 'kamikaze':
        this.iaKamikaze(dt, jogo, nx, ny, dist);
        break;
      case 'investida':
        this.iaInvestida(dt, jogo, nx, ny);
        break;
      case 'rastro':
        this.setVelocity(nx * this.def.velocidade, ny * this.def.velocidade);
        this.setFlipX(nx < 0);
        this.acaoTimer -= dt;
        if (this.acaoTimer <= 0) {
          this.acaoTimer = 0.35;
          jogo.criarPoca(this.x, this.y + 4, 9, 'veneno', 4.5);
        }
        break;
      case 'teleporte':
        this.iaAnjo(dt, jogo, nx, ny);
        break;
      case 'escudo':
        this.iaEscudeiro(dt, nx, ny, dist);
        break;
      case 'curandeiro':
        this.iaDoutor(dt, jogo, nx, ny, dist);
        break;
      case 'torre':
        this.iaWogol(dt, jogo, nx, ny);
        break;
      case 'chefe':
        this.iaApagador(dt, jogo, nx, ny);
        break;
      case 'chefe_ogro':
        this.iaOgro(dt, jogo, nx, ny);
        break;
      case 'chefe_podre':
        this.iaPodre(dt, jogo, nx, ny);
        break;
      case 'chefe_negro':
        this.iaNegro(dt, jogo, nx, ny, dist);
        break;
      case 'chefe_padrao':
        this.iaChefePadrao(dt, jogo, nx, ny);
        break;
      case 'fantasma':
        this.iaFantasma(dt, jogo, nx, ny);
        break;
      case 'alvo':
        this.setVelocity(0, 0);
        break;
      case 'ladrao': {
        // corre até você; depois de roubar, foge e some em 4s (se ninguém pegar)
        const roubou = (this.getData('roubou') as number) ?? 0;
        const sinal = roubou ? -1 : 1;
        this.setVelocity(nx * this.def.velocidade * sinal, ny * this.def.velocidade * sinal);
        this.setFlipX(nx * sinal < 0);
        if (roubou) {
          this.timer -= dt;
          this.setAlpha(this.timer < 1 ? Math.max(0.2, this.timer) : 1);
          if (this.timer <= 0) jogo.ladraoFugiu(this);
        }
        break;
      }
      case 'canhao': {
        // canhão do tutorial: parado, atira na sua direção no ritmo certo
        this.setVelocity(0, 0);
        this.tiroTimer -= dt;
        if (this.tiroTimer <= 0) {
          const p = this.def.projetil!;
          this.tiroTimer = p.intervalo;
          jogo.leque(this.x, this.y, Math.atan2(ny, nx), p.quantidade, p.dispersao, p.velocidade, p.dano);
        }
        break;
      }
      case 'minador':
        this.iaMinador(dt, jogo, nx, ny, dist);
        break;
      case 'orbitador':
        this.iaOrbitador(dt, jogo, nx, ny, dist);
        break;
      case 'laser':
        this.iaLaser(dt, jogo, nx, ny, dist);
        break;
    }
    if (lento < 1) this.body.velocity.scale(lento);
  }

  /** Cor do sprite conforme o estado (prioridade: dano > aviso > gelo > veneno > fogo). */
  private pintar() {
    if (this.flashT > 0) this.setTintFill(0xffffff);
    else if (this.refletindo > 0) this.setTint(Math.floor(this.t * 20) % 2 ? 0xd8a0ff : 0xffffff);
    else if (this.alerta) this.setTint(0xff6060);
    else if (this.congelado > 0) this.setTint(0x9fdcff);
    else if (this.veneno > 0) this.setTint(0xa8ff8a);
    else if (this.queima > 0) this.setTint(0xffb080);
    else if (this.tintaBase !== null) this.setTint(this.tintaBase);
    else this.clearTint();
  }

  // ===================== IAs =====================

  private iaDiabrete(dt: number, jogo: Jogo, nx: number, ny: number, dist: number) {
    const perp = Math.sin(this.t * 5 + this.semente) * 0.9;
    const v = new Phaser.Math.Vector2(nx - ny * perp, ny + nx * perp).normalize().scale(this.def.velocidade);
    this.setVelocity(v.x, v.y);
    this.setFlipX(v.x < 0);
    const p = this.def.projetil;
    if (p && (this.andar >= 2 || this.elite)) {
      this.tiroTimer -= dt;
      if (this.tiroTimer <= 0 && dist < 200) {
        this.tiroTimer = p.intervalo * this.ritmo * (0.8 + Math.random() * 0.4);
        jogo.leque(this.x, this.y, Math.atan2(ny, nx), this.elite ? 3 : 1, 25, p.velocidade, p.dano);
      }
    }
  }

  private iaEsqueleto(dt: number, jogo: Jogo, nx: number, ny: number, dist: number) {
    switch (this.sub) {
      case 'andar':
        this.setVelocity(nx * this.def.velocidade, ny * this.def.velocidade);
        this.setFlipX(nx < 0);
        if (dist < 34) {
          this.sub = 'preparar';
          this.timer = 0.35;
          this.alvo.set(nx, ny);
          this.setVelocity(0, 0);
          this.alerta = true;
        }
        break;
      case 'preparar':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.sub = 'investir';
          this.timer = 0.2;
          this.alerta = false;
          this.setVelocity(this.alvo.x * 240, this.alvo.y * 240);
        }
        break;
      case 'investir':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.sub = 'descansar';
          this.timer = 0.45;
          this.setVelocity(0, 0);
          const p = this.def.projetil;
          if (p && (this.andar >= 2 || this.elite)) jogo.leque(this.x, this.y, Math.PI / 4, this.elite ? 8 : p.quantidade, 360, p.velocidade, p.dano);
        }
        break;
      case 'descansar':
        this.timer -= dt;
        if (this.timer <= 0) this.sub = 'andar';
        break;
    }
  }

  /** Xamã e Zumbi Gelado (atiram) e Necromante (invoca): mantêm distância. */
  private iaDistancia(dt: number, jogo: Jogo, nx: number, ny: number, dist: number) {
    const invocador = this.def.ia === 'invocador';
    const p = this.def.projetil!;
    this.tiroTimer -= dt;
    this.teleTimer -= dt;
    this.setFlipX(nx < 0);

    if (this.sub === 'conjurar') {
      this.setVelocity(0, 0);
      this.timer -= dt;
      if (this.timer <= 0) {
        this.alerta = false;
        if (invocador) {
          for (const lado of [-1, 1]) jogo.criarInimigo(this.def.invoca ?? 'zumbi', this.x + lado * 12, this.y + 6);
          jogo.leque(this.x, this.y, Math.random() * Math.PI, p.quantidade + (this.elite ? 6 : 0), 360, p.velocidade, p.dano);
          Som.tocar('chefeRugido');
          this.tiroTimer = 5 * this.ritmo;
        } else {
          const ang = Math.atan2(jogo.alvoDe(this).y - this.y, jogo.alvoDe(this).x - this.x);
          jogo.leque(this.x, this.y, ang, this.qtdTiros, p.dispersao, p.velocidade, this.danoProjetil, p.efeito);
          this.tiroTimer = p.intervalo * this.ritmo;
        }
        this.sub = 'andar';
      }
      return;
    }

    const longe = this.tipo === 'zumbi_gelo' ? 60 : 80;
    let vx = 0;
    let vy = 0;
    if (dist < longe) {
      vx = -nx;
      vy = -ny;
    } else if (dist > 140) {
      vx = nx;
      vy = ny;
    } else {
      const lado = Math.floor(this.t / 2) % 2 ? 1 : -1;
      vx = -ny * lado;
      vy = nx * lado;
    }
    this.setVelocity(vx * this.def.velocidade, vy * this.def.velocidade);

    const podeInvocar = !invocador || jogo.contarInimigos(this.def.invoca ?? 'zumbi') < 6;
    if (this.tiroTimer <= 0 && dist < 230 && podeInvocar) {
      this.sub = 'conjurar';
      this.timer = invocador ? 0.7 : 0.45;
      this.alerta = true;
    } else if (this.tipo === 'mago' || invocador) {
      if (this.teleTimer <= 0) {
        this.teleTimer = 4.5 + Math.random() * 2;
        this.teleportar(jogo, 80);
      }
    }
  }

  private get danoProjetil() {
    const p = this.def.projetil!;
    return Math.round(p.dano * (1 + D.config.escalaAndar.dano * (this.def.semEscala ? 0 : this.andar - 1)));
  }

  private teleportar(jogo: Jogo, distMin: number) {
    const p = jogo.posicaoLivre(jogo.alvoDe(this).x, jogo.alvoDe(this).y, distMin);
    this.scene.tweens.add({ targets: this, alpha: 0, duration: 160, yoyo: true, onYoyo: () => this.setPosition(p.x, p.y) });
  }

  /** Orc mascarado: lento e resistente; para e dispara leques (e anéis nos andares fundos). */
  private iaTanque(dt: number, jogo: Jogo, nx: number, ny: number) {
    const p = this.def.projetil!;
    this.tiroTimer -= dt;
    this.setFlipX(nx < 0);
    if (this.sub === 'preparar') {
      this.setVelocity(0, 0);
      this.timer -= dt;
      if (this.timer <= 0) {
        this.alerta = false;
        jogo.leque(this.x, this.y - 4, Math.atan2(ny, nx), this.qtdTiros, p.dispersao, p.velocidade, this.danoProjetil);
        if (this.andar >= 2 && Math.random() < 0.4) jogo.leque(this.x, this.y - 4, 0, 12, 360, p.velocidade * 0.8, this.danoProjetil);
        this.sub = 'andar';
        this.tiroTimer = p.intervalo * this.ritmo;
      }
      return;
    }
    this.setVelocity(nx * this.def.velocidade, ny * this.def.velocidade);
    if (this.tiroTimer <= 0) {
      this.sub = 'preparar';
      this.timer = 0.5;
      this.alerta = true;
    }
  }

  /** Abóbora: corre até você, acende o pavio e explode. */
  private iaKamikaze(dt: number, jogo: Jogo, nx: number, ny: number, dist: number) {
    if (this.sub === 'acesa') {
      this.setVelocity(nx * 20, ny * 20);
      this.timer -= dt;
      this.alerta = Math.floor(this.timer * 14) % 2 === 0;
      if (this.timer <= 0) {
        this.alerta = false;
        jogo.explosaoInimiga(this.x, this.y, this.def.explosao ?? 30, this.dano);
        jogo.leque(this.x, this.y, Math.random(), 8, 360, 85, Math.round(this.dano * 0.5));
        jogo.matarSemRecompensa(this);
      }
      return;
    }
    this.setVelocity(nx * this.def.velocidade, ny * this.def.velocidade);
    this.setFlipX(nx < 0);
    if (dist < 28) {
      this.sub = 'acesa';
      this.timer = 0.6;
      Som.tocar('pavio');
    }
  }

  /** Chifrudo: mira com uma linha de aviso e investe; se bater na parede, fica tonto. */
  private iaInvestida(dt: number, jogo: Jogo, nx: number, ny: number) {
    this.timer -= dt;
    switch (this.sub) {
      case 'andar':
        this.setVelocity(nx * this.def.velocidade, ny * this.def.velocidade);
        this.setFlipX(nx < 0);
        this.acaoTimer -= dt;
        if (this.acaoTimer <= 0) {
          this.sub = 'mirar';
          this.timer = 0.7;
          this.alvo.set(nx, ny);
          this.alerta = true;
          this.setVelocity(0, 0);
          jogo.linhaAviso(this.x, this.y, Math.atan2(ny, nx), 260, 700);
        }
        break;
      case 'mirar':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          this.sub = 'investir';
          this.timer = 0.65;
          this.alerta = false;
          Som.tocar('dash');
        }
        break;
      case 'investir':
        this.setVelocity(this.alvo.x * 310, this.alvo.y * 310);
        if (this.body.blocked.left || this.body.blocked.right || this.body.blocked.up || this.body.blocked.down) {
          this.sub = 'tonto';
          this.timer = 1.1;
          jogo.tremer(100, 0.005);
          this.setVelocity(0, 0);
        } else if (this.timer <= 0) {
          this.sub = 'tonto';
          this.timer = 0.5;
        }
        break;
      case 'tonto':
        this.setVelocity(0, 0);
        this.angle = Math.sin(this.t * 30) * 6;
        if (this.timer <= 0) {
          this.angle = 0;
          this.sub = 'andar';
          this.acaoTimer = (1.4 + Math.random()) * this.ritmo;
        }
        break;
    }
  }

  /** Anjo caído: some, reaparece perto e dispara uma rajada mirada. */
  private iaAnjo(dt: number, jogo: Jogo, nx: number, ny: number) {
    const p = this.def.projetil!;
    this.setFlipX(nx < 0);
    if (this.sub === 'rajada') {
      this.setVelocity(0, 0);
      this.timer -= dt;
      if (this.timer <= 0) {
        jogo.criarProjetil(this.x, this.y, Math.atan2(jogo.alvoDe(this).y - this.y, jogo.alvoDe(this).x - this.x), p.velocidade, this.danoProjetil, true);
        this.ondas--;
        this.timer = 0.13;
        if (this.ondas <= 0) {
          this.sub = 'andar';
          this.alerta = false;
          this.teleTimer = p.intervalo * this.ritmo;
        }
      }
      return;
    }
    const lado = Math.sin(this.t * 1.5 + this.semente);
    this.setVelocity((-ny * lado) * this.def.velocidade, (nx * lado) * this.def.velocidade);
    this.teleTimer -= dt;
    if (this.teleTimer <= 0) {
      this.teleportar(jogo, 60);
      this.sub = 'rajada';
      this.timer = 0.55;
      this.ondas = p.quantidade + (this.elite ? 2 : 0);
      this.alerta = true;
    }
  }

  /** Orc escudeiro: anda de frente para você (o escudo bloqueia tiros de frente) e dá trancos. */
  private iaEscudeiro(dt: number, nx: number, ny: number, dist: number) {
    this.setFlipX(nx < 0);
    this.timer -= dt;
    // o escudo vira na sua direção, mas devagar: um dash para o lado pega ele de costas
    this.escudoAng = Phaser.Math.Angle.RotateTo(this.escudoAng, Math.atan2(ny, nx), 2.2 * dt);
    if (this.sub === 'tranco') {
      if (this.timer <= 0) this.sub = 'andar';
      return;
    }
    this.setVelocity(nx * this.def.velocidade, ny * this.def.velocidade);
    if (dist < 30 && this.timer <= 0) {
      this.sub = 'tranco';
      this.timer = 0.25;
      this.setVelocity(nx * 230, ny * 230);
      this.timer = 0.25;
    }
  }

  /** Doutor da peste: foge, cura os aliados e arremessa frascos de veneno. */
  private iaDoutor(dt: number, jogo: Jogo, nx: number, ny: number, dist: number) {
    const p = this.def.projetil!;
    this.setFlipX(nx < 0);
    let vx = 0;
    let vy = 0;
    if (dist < 90) {
      vx = -nx;
      vy = -ny;
    } else if (dist > 150) {
      vx = nx;
      vy = ny;
    } else {
      vx = -ny * 0.6;
      vy = nx * 0.6;
    }
    this.setVelocity(vx * this.def.velocidade, vy * this.def.velocidade);
    this.acaoTimer -= dt;
    if (this.acaoTimer <= 0) {
      this.acaoTimer = 3 * this.ritmo;
      jogo.curarInimigos(this.x, this.y, 70, 0.25, this);
    }
    this.tiroTimer -= dt;
    if (this.tiroTimer <= 0) {
      this.tiroTimer = p.intervalo * this.ritmo;
      const j = jogo.alvoDe(this);
      const d = Phaser.Math.Distance.Between(this.x, this.y, j.x, j.y);
      jogo.frasco(this.x, this.y, j.x, j.y, p.velocidade, this.danoProjetil, d);
    }
  }

  /** Wogol: anda devagar e, de tempos em tempos, gira disparando espirais. */
  private iaWogol(dt: number, jogo: Jogo, nx: number, ny: number) {
    const p = this.def.projetil!;
    this.timer -= dt;
    if (this.sub === 'girar') {
      this.setVelocity(0, 0);
      this.giro += dt * 3.5;
      if (this.timer <= 0) {
        this.timer = 0.12;
        const bracos = p.quantidade + (this.elite ? 1 : 0);
        for (let k = 0; k < bracos; k++) jogo.criarProjetil(this.x, this.y, this.giro + (k * Math.PI * 2) / bracos, p.velocidade, this.danoProjetil, false);
        this.ondas--;
        if (this.ondas <= 0) {
          this.sub = 'andar';
          this.alerta = false;
          this.tiroTimer = p.intervalo * this.ritmo;
        }
      }
      return;
    }
    this.setVelocity(nx * this.def.velocidade, ny * this.def.velocidade);
    this.setFlipX(nx < 0);
    this.tiroTimer -= dt;
    if (this.tiroTimer <= 0) {
      this.sub = 'girar';
      this.ondas = 14;
      this.timer = 0.4;
      this.alerta = true;
    }
  }

  // ===================== Chefes =====================

  private iaApagador(dt: number, jogo: Jogo, nx: number, ny: number) {
    const p = this.def.projetil!;
    const furioso = this.vida < this.vidaMax * 0.5;
    this.timer -= dt;
    this.setFlipX(nx < 0);

    switch (this.sub) {
      case 'perseguir': {
        const v = this.def.velocidade * (furioso ? 1.4 : 1);
        this.setVelocity(nx * v, ny * v);
        if (this.timer <= 0) this.proximo(SEQ_APAGADOR, furioso);
        break;
      }
      case 'preparar':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          this.alerta = false;
          this.sub = 'investida';
          this.timer = 0.55;
          this.setVelocity(nx * 270, ny * 270);
          Som.tocar('dash');
        }
        break;
      case 'investida':
        if (this.timer <= 0) {
          this.sub = 'pausa';
          this.timer = 0.5;
          this.setVelocity(0, 0);
          jogo.tremer(120, 0.006);
          if (furioso) jogo.leque(this.x, this.y, 0, 12, 360, p.velocidade * 0.9, p.dano);
        }
        break;
      case 'anel':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          jogo.leque(this.x, this.y, Math.random() * Math.PI, furioso ? 22 : p.quantidade, 360, p.velocidade, p.dano);
          if (furioso) jogo.escurecer(2.5);
          this.ondas--;
          this.timer = 0.55;
          if (this.ondas <= 0) this.pausa(0.7);
        }
        break;
      case 'rajada':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          const ang = Math.atan2(jogo.alvoDe(this).y - this.y, jogo.alvoDe(this).x - this.x);
          jogo.leque(this.x, this.y, ang, furioso ? 3 : 1, 18, p.velocidade * 1.5, p.dano);
          this.ondas--;
          this.timer = 0.1;
          if (this.ondas <= 0) this.pausa(0.6);
        }
        break;
      case 'espiral':
        this.setVelocity(0, 0);
        this.giro += dt * 4;
        if (this.timer <= 0) {
          const n = furioso ? 4 : 3;
          for (let k = 0; k < n; k++) jogo.criarProjetil(this.x, this.y, this.giro + (k * Math.PI * 2) / n, p.velocidade, p.dano, false);
          this.timer = 0.08;
          this.ondas--;
          if (this.ondas <= 0) this.pausa(0.8);
        }
        break;
      case 'invocar':
        this.setVelocity(0, 0);
        for (const s of [-1, 1]) jogo.criarInimigo(furioso ? 'chifrudo' : 'goblin', this.x + s * 26, this.y - 10);
        Som.tocar('chefeRugido');
        this.pausa(1);
        break;
      case 'pausa':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          this.sub = 'perseguir';
          this.timer = furioso ? 0.9 : 1.5;
        }
        break;
    }
  }

  private iaOgro(dt: number, jogo: Jogo, nx: number, ny: number) {
    const p = this.def.projetil!;
    const furioso = this.vida < this.vidaMax * 0.5;
    this.timer -= dt;
    this.setFlipX(nx < 0);
    switch (this.sub) {
      case 'perseguir':
        this.setVelocity(nx * this.def.velocidade * (furioso ? 1.3 : 1), ny * this.def.velocidade * (furioso ? 1.3 : 1));
        if (this.timer <= 0) this.proximo(SEQ_OGRO, furioso);
        break;
      case 'salto':
        // agacha (aviso) e pula onde você está
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          this.alerta = false;
          const j = jogo.alvoDe(this);
          this.alvo.set(j.x, j.y);
          jogo.marcaAlvo(j.x, j.y, 26, 550);
          this.body.enable = false;
          this.sub = 'no_ar';
          this.scene.tweens.add({
            targets: this, x: j.x, y: j.y, duration: 550, ease: 'Sine.inOut',
            // cresce no meio do pulo para parecer que está no alto
            onUpdate: (tw) => this.setScale(this.escalaBase * (1 + Math.sin(tw.progress * Math.PI) * 0.35)),
            onComplete: () => this.aterrissar(jogo, furioso),
          });
        }
        break;
      case 'no_ar':
        break;
      case 'pedras':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          const ang = Math.atan2(jogo.alvoDe(this).y - this.y, jogo.alvoDe(this).x - this.x);
          jogo.leque(this.x, this.y - 6, ang, furioso ? 7 : 5, 50, p.velocidade * 0.85, p.dano);
          Som.tocar('lancador');
          this.ondas--;
          this.timer = 0.5;
          if (this.ondas <= 0) this.pausa(0.7);
        }
        break;
      case 'preparar':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          this.alerta = false;
          this.sub = 'investida';
          this.timer = 0.6;
          this.setVelocity(this.alvo.x * 270, this.alvo.y * 270);
          Som.tocar('dash');
        }
        break;
      case 'investida':
        if (this.timer <= 0 || this.body.blocked.none === false) {
          jogo.tremer(150, 0.008);
          if (furioso) jogo.leque(this.x, this.y, 0, 10, 360, p.velocidade, p.dano);
          this.pausa(0.6);
        }
        break;
      case 'pausa':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          this.sub = 'perseguir';
          this.timer = furioso ? 1 : 1.6;
        }
        break;
    }
  }

  private get escalaBase() {
    return (ajusteVisual(this.def.sprite)?.escala ?? this.def.escala ?? 1) * (this.elite ? 1.2 : 1);
  }

  private aterrissar(jogo: Jogo, furioso: boolean) {
    if (this.morto) return;
    this.setScale(this.escalaBase);
    this.body.enable = true;
    this.body.reset(this.x, this.y);
    const p = this.def.projetil!;
    jogo.explosaoInimiga(this.x, this.y, 30, this.dano);
    jogo.leque(this.x, this.y, Math.random(), furioso ? 22 : p.quantidade, 360, p.velocidade, p.dano);
    jogo.tremer(300, 0.014);
    this.ondas = furioso ? 2 : 1;
    this.pausa(furioso ? 0.5 : 0.9);
  }

  private iaPodre(dt: number, jogo: Jogo, nx: number, ny: number) {
    const p = this.def.projetil!;
    const furioso = this.vida < this.vidaMax * 0.5;
    this.timer -= dt;
    this.setFlipX(nx < 0);
    switch (this.sub) {
      case 'perseguir':
        this.setVelocity(nx * this.def.velocidade, ny * this.def.velocidade);
        if (this.timer <= 0) this.proximo(SEQ_PODRE, furioso);
        break;
      case 'vomito':
        // jato de veneno na sua direção
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          const base = Math.atan2(jogo.alvoDe(this).y - this.y, jogo.alvoDe(this).x - this.x);
          const abertura = furioso ? 0.7 : 0.45;
          jogo.criarProjetil(this.x, this.y - 4, base + (Math.random() - 0.5) * abertura, p.velocidade * (0.9 + Math.random() * 0.5), p.dano, false, 'veneno');
          this.timer = 0.05;
          this.ondas--;
          if (this.ondas % 6 === 0) Som.tocar('tiro');
          if (this.ondas <= 0) this.pausa(0.8);
        }
        break;
      case 'invocar':
        this.setVelocity(0, 0);
        if (jogo.contarInimigos('zumbi') < 8) for (let k = 0; k < (furioso ? 4 : 3); k++) jogo.criarInimigo('zumbi', this.x + (k - 1) * 18, this.y + 14);
        Som.tocar('chefeRugido');
        this.pausa(1);
        break;
      case 'anel':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          jogo.leque(this.x, this.y, Math.random() * Math.PI, p.quantidade, 360, p.velocidade, p.dano, 'veneno');
          for (let k = 0; k < 4; k++) {
            const a = (k / 4) * Math.PI * 2 + Math.random();
            jogo.criarPoca(this.x + Math.cos(a) * 30, this.y + Math.sin(a) * 30, 14, 'veneno', 6);
          }
          this.ondas--;
          this.timer = 0.7;
          if (this.ondas <= 0) this.pausa(0.8);
        }
        break;
      case 'preparar':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          this.alerta = false;
          this.sub = 'investida';
          this.timer = 0.6;
          this.setVelocity(this.alvo.x * 240, this.alvo.y * 240);
        }
        break;
      case 'investida':
        if (this.timer <= 0) this.pausa(0.6);
        break;
      case 'pausa':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          this.sub = 'perseguir';
          this.timer = furioso ? 1 : 1.6;
        }
        break;
    }
  }

  /**
   * O Pavio Negro: a sua sombra. Rodeia você atirando, dá dashes deixando balas no caminho,
   * atira de escopeta, faz PARRY (seus tiros voltam: pare de atirar!) e apaga a luz.
   */
  private iaNegro(dt: number, jogo: Jogo, nx: number, ny: number, dist: number) {
    const p = this.def.projetil!;
    const furioso = this.vida < this.vidaMax * 0.5;
    this.timer -= dt;
    this.setFlipX(nx < 0);
    switch (this.sub) {
      case 'perseguir': {
        // gira em volta de você numa distância média
        const lado = Math.sin(this.semente) > 0 ? 1 : -1;
        const radial = (dist - 75) / 40;
        const v = new Phaser.Math.Vector2(nx * radial - ny * lado, ny * radial + nx * lado).normalize().scale(this.def.velocidade * (furioso ? 1.3 : 1));
        this.setVelocity(v.x, v.y);
        this.tiroTimer -= dt;
        if (this.tiroTimer <= 0) {
          this.tiroTimer = furioso ? 0.3 : 0.45;
          jogo.criarProjetil(this.x, this.y - 6, Math.atan2(ny, nx), p.velocidade, p.dano);
        }
        if (this.timer <= 0) this.proximo(SEQ_NEGRO, furioso);
        break;
      }
      case 'mirar_dash':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          this.alerta = false;
          this.sub = 'dashando';
          this.timer = 0.24;
          this.setVelocity(this.alvo.x * 330, this.alvo.y * 330);
          Som.tocar('dash');
        }
        break;
      case 'dashando':
        // deixa um rastro de balas lentas, como um fantasma do dash
        this.acaoTimer -= dt;
        if (this.acaoTimer <= 0) {
          this.acaoTimer = 0.04;
          jogo.criarProjetil(this.x, this.y - 4, Math.random() * Math.PI * 2, 18, Math.round(p.dano * 0.7), false);
        }
        if (this.timer <= 0) {
          this.ondas--;
          if (this.ondas > 0) this.mirarDash(jogo);
          else this.pausa(0.5);
        }
        break;
      case 'escopeta':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          const ang = Math.atan2(jogo.alvoDe(this).y - this.y, jogo.alvoDe(this).x - this.x);
          jogo.leque(this.x, this.y - 6, ang, furioso ? 9 : 7, 42, p.velocidade * 0.85, p.dano);
          Som.tocar('escopeta');
          this.ondas--;
          this.timer = 0.45;
          if (this.ondas <= 0) this.pausa(0.5);
        }
        break;
      case 'parry':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          // fim do parry: solta tudo que "guardou" num anel
          jogo.leque(this.x, this.y, Math.random(), furioso ? 20 : 14, 360, p.velocidade * 0.8, p.dano);
          this.pausa(0.5);
        }
        break;
      case 'espiral':
        this.setVelocity(0, 0);
        this.giro += dt * 3.5;
        if (this.timer <= 0) {
          // duas espirais girando ao contrário
          for (const sentido of [1, -1]) jogo.criarProjetil(this.x, this.y, this.giro * sentido, p.velocidade * 0.75, p.dano, false);
          this.timer = 0.07;
          this.ondas--;
          if (this.ondas <= 0) this.pausa(0.6);
        }
        break;
      case 'apagar': {
        jogo.escurecer(furioso ? 4 : 3);
        const pos = jogo.posicaoLivre(jogo.alvoDe(this).x, jogo.alvoDe(this).y, 90);
        jogo.leque(this.x, this.y, 0, 10, 360, p.velocidade * 0.7, p.dano);
        this.setPosition(pos.x, pos.y);
        this.body.reset(pos.x, pos.y);
        Som.tocar('apagar');
        jogo.leque(pos.x, pos.y, 0.3, 10, 360, p.velocidade * 0.7, p.dano);
        this.pausa(0.7);
        break;
      }
      case 'invocar':
        this.setVelocity(0, 0);
        if (jogo.contarInimigos('sombra') < 4) for (let k = 0; k < (furioso ? 3 : 2); k++) jogo.criarInimigo('sombra', this.x + (k - 1) * 20, this.y + 12);
        Som.tocar('chefeRugido');
        this.pausa(0.8);
        break;
      case 'pausa':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          this.sub = 'perseguir';
          this.timer = furioso ? 1.2 : 1.8;
        }
        break;
    }
  }

  // ===================== Monstros novos =====================

  /** Alma penada: some (intangível, atravessa paredes), reaparece perto e solta um anel. */
  private iaFantasma(dt: number, jogo: Jogo, nx: number, ny: number) {
    this.timer -= dt;
    if (this.sub !== 'sumida') {
      this.setVelocity(nx * this.def.velocidade, ny * this.def.velocidade);
      this.setFlipX(nx < 0);
      if (this.timer <= 0) {
        this.sub = 'sumida';
        this.timer = 1.6;
        this.intangivel = true;
        this.scene.tweens.add({ targets: this, alpha: 0.18, duration: 250 });
      }
      return;
    }
    // sumida: corre na sua direção sem poder levar dano
    this.setVelocity(nx * this.def.velocidade * 1.8, ny * this.def.velocidade * 1.8);
    if (this.timer <= 0) {
      this.sub = 'andar';
      this.timer = 2.4 + Math.random();
      this.intangivel = false;
      this.scene.tweens.add({ targets: this, alpha: 1, duration: 200 });
      const p = this.def.projetil!;
      jogo.leque(this.x, this.y, Math.random() * Math.PI, p.quantidade, 360, p.velocidade, this.danoProjetil);
    }
  }

  /** Goblin minador: anda de lado e larga minas que explodem quando você chega perto. */
  private iaMinador(dt: number, jogo: Jogo, nx: number, ny: number, dist: number) {
    const lado = Math.sin(this.t * 1.3 + this.semente) > 0 ? 1 : -1;
    const longe = dist < 60 ? -1 : 1;
    const v = new Phaser.Math.Vector2(nx * 0.4 * longe - ny * lado, ny * 0.4 * longe + nx * lado).normalize().scale(this.def.velocidade);
    this.setVelocity(v.x, v.y);
    this.setFlipX(v.x < 0);
    this.acaoTimer -= dt;
    if (this.acaoTimer <= 0) {
      this.acaoTimer = 2 * this.ritmo;
      jogo.criarMinaInimiga(this.x, this.y + 4, this.dano);
    }
  }

  /** Engrenagem: gira em volta de você e atira para dentro. */
  private iaOrbitador(dt: number, jogo: Jogo, nx: number, ny: number, dist: number) {
    const lado = this.semente > 5 ? 1 : -1;
    const radial = (dist - 70) / 30;
    const v = new Phaser.Math.Vector2(nx * radial - ny * lado, ny * radial + nx * lado).normalize().scale(this.def.velocidade);
    this.setVelocity(v.x, v.y);
    this.angle += dt * 240;
    this.tiroTimer -= dt;
    if (this.tiroTimer <= 0) {
      this.tiroTimer = this.def.projetil!.intervalo * this.ritmo;
      jogo.criarProjetil(this.x, this.y, Math.atan2(ny, nx), this.def.projetil!.velocidade, this.danoProjetil);
    }
  }

  /** Reflexo: anda, para, mira com uma linha de aviso e solta uma fila de balas rápidas. */
  private iaLaser(dt: number, jogo: Jogo, nx: number, ny: number, dist: number) {
    const p = this.def.projetil!;
    this.timer -= dt;
    if (this.sub === 'mirando') {
      this.setVelocity(0, 0);
      if (this.timer <= 0) {
        this.sub = 'disparando';
        this.ondas = p.quantidade;
        this.timer = 0;
        this.alerta = false;
      }
      return;
    }
    if (this.sub === 'disparando') {
      this.setVelocity(0, 0);
      if (this.timer <= 0) {
        jogo.criarProjetil(this.x, this.y - 4, this.giro, p.velocidade, this.danoProjetil, this.ondas % 3 === 0);
        this.ondas--;
        this.timer = 0.035;
        if (this.ondas <= 0) {
          this.sub = 'andar';
          this.tiroTimer = p.intervalo * this.ritmo;
        }
      }
      return;
    }
    const perto = dist < 70 ? -1 : 1;
    this.setVelocity(nx * this.def.velocidade * perto, ny * this.def.velocidade * perto);
    this.setFlipX(nx < 0);
    this.tiroTimer -= dt;
    if (this.tiroTimer <= 0) {
      this.sub = 'mirando';
      this.timer = 0.7;
      this.alerta = true;
      this.giro = Math.atan2(ny, nx);
      jogo.linhaAviso(this.x, this.y, this.giro, 260, 700);
    }
  }

  // ===================== Chefe genérico (montado por uma lista de ataques) =====================

  /**
   * Os chefes novos usam esta IA: perseguem um pouco e fazem o próximo ataque da lista "ataques"
   * (e da lista "furia", quando ficam com metade da vida). Cada ataque é um padrão de bullet hell.
   */
  private iaChefePadrao(dt: number, jogo: Jogo, nx: number, ny: number) {
    const p = this.def.projetil!;
    const dano = p.dano;
    const furioso = this.vida < this.vidaMax * 0.5;
    if (furioso && !this.furiaAnunciada) {
      this.furiaAnunciada = true;
      jogo.tremer(400, 0.012);
      Som.tocar('chefeRugido');
      jogo.anunciarFuria(this);
    }
    const f = furioso ? 1.35 : 1;
    this.timer -= dt;
    const j = jogo.alvoDe(this);
    const angJ = Math.atan2(j.y - this.y, j.x - this.x);
    if (this.sub !== 'no_ar' && this.sub !== 'investindo') this.setFlipX(nx < 0);

    switch (this.sub) {
      case 'perseguir': {
        this.setVelocity(nx * this.def.velocidade * f, ny * this.def.velocidade * f);
        if (this.timer <= 0) this.iniciarAtaque(jogo, furioso);
        break;
      }
      case 'anel':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          jogo.leque(this.x, this.y, Math.random() * Math.PI, Math.round(p.quantidade * f), 360, p.velocidade, dano);
          this.ondas--;
          this.timer = 0.5;
          if (this.ondas <= 0) this.pausa(0.6);
        }
        break;
      case 'espiral':
      case 'espiral_dupla':
        this.setVelocity(0, 0);
        this.giro += dt * 3.6;
        if (this.timer <= 0) {
          const bracos = furioso ? 4 : 3;
          for (let k = 0; k < bracos; k++) {
            const a = this.giro + (k * Math.PI * 2) / bracos;
            jogo.criarProjetil(this.x, this.y, a, p.velocidade * 0.85, dano, false);
            if (this.sub === 'espiral_dupla') jogo.criarProjetil(this.x, this.y, -a, p.velocidade * 0.7, dano, false);
          }
          this.timer = 0.08;
          this.ondas--;
          if (this.ondas <= 0) this.pausa(0.7);
        }
        break;
      case 'rajada':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          jogo.leque(this.x, this.y, angJ, furioso ? 3 : 1, 16, p.velocidade * 1.5, dano);
          this.ondas--;
          this.timer = 0.1;
          if (this.ondas <= 0) this.pausa(0.6);
        }
        break;
      case 'leque':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          jogo.leque(this.x, this.y, angJ, furioso ? 9 : 7, 50, p.velocidade * 1.1, dano);
          this.ondas--;
          this.timer = 0.45;
          if (this.ondas <= 0) this.pausa(0.6);
        }
        break;
      case 'flor':
        // anéis girando pouco a pouco: desenham uma flor de balas
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          jogo.leque(this.x, this.y, this.giro, 10, 360, p.velocidade * 0.75, dano);
          this.giro += 0.16;
          this.ondas--;
          this.timer = 0.12;
          if (this.ondas <= 0) this.pausa(0.8);
        }
        break;
      case 'ondas':
        // jato que balança de um lado para o outro
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          const a = angJ + Math.sin(this.ondas * 0.35) * 0.9;
          jogo.criarProjetil(this.x, this.y, a, p.velocidade * 1.1, dano, this.ondas % 4 === 0);
          this.ondas--;
          this.timer = 0.05;
          if (this.ondas <= 0) this.pausa(0.7);
        }
        break;
      case 'preparar':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          this.alerta = false;
          this.sub = 'investindo';
          this.timer = 0.55;
          this.setVelocity(this.alvo.x * 300 * f, this.alvo.y * 300 * f);
          Som.tocar('dash');
        }
        break;
      case 'investindo':
        if (this.timer <= 0 || !this.body.blocked.none) {
          jogo.tremer(150, 0.008);
          jogo.leque(this.x, this.y, Math.random(), furioso ? 14 : 10, 360, p.velocidade, dano);
          this.ondas--;
          if (this.ondas > 0) this.mirarInvestida(jogo);
          else this.pausa(0.6);
        }
        break;
      case 'salto':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          this.alerta = false;
          this.alvo.set(j.x, j.y);
          jogo.marcaAlvo(j.x, j.y, 26, 550);
          this.body.enable = false;
          this.sub = 'no_ar';
          this.scene.tweens.add({
            targets: this, x: j.x, y: j.y, duration: 550, ease: 'Sine.inOut',
            onUpdate: (tw) => this.setScale(this.escalaBase * (1 + Math.sin(tw.progress * Math.PI) * 0.35)),
            onComplete: () => this.aterrissar(jogo, furioso),
          });
        }
        break;
      case 'no_ar':
        break;
      case 'invocar': {
        this.setVelocity(0, 0);
        const tipo = this.def.invoca ?? 'esqueleto';
        if (jogo.contarInimigos(tipo) < 6) for (let k = 0; k < (furioso ? 3 : 2); k++) jogo.criarInimigo(tipo, this.x + (k - 1) * 22, this.y + 16);
        Som.tocar('chefeRugido');
        this.pausa(0.9);
        break;
      }
      case 'clones': {
        // some num clarão e deixa cópias dele por perto
        this.setVelocity(0, 0);
        const tipo = this.def.invoca ?? 'reflexo_menor';
        for (let k = 0; k < (furioso ? 3 : 2); k++) {
          const pos = jogo.posicaoLivre(this.x, this.y, 30);
          jogo.criarInimigo(tipo, pos.x, pos.y);
        }
        this.teletransportar(jogo);
        this.pausa(0.7);
        break;
      }
      case 'teleporte':
        this.setVelocity(0, 0);
        this.teletransportar(jogo);
        jogo.leque(this.x, this.y, Math.random(), Math.round(p.quantidade * 0.8 * f), 360, p.velocidade * 0.9, dano);
        this.pausa(0.6);
        break;
      case 'chuva':
        // marca o chão em volta de você e, logo depois, cai uma explosão em cada marca
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          for (let k = 0; k < (furioso ? 4 : 3); k++) {
            const x = Phaser.Math.Clamp(j.x + (Math.random() - 0.5) * 120, 24, 296);
            const y = Phaser.Math.Clamp(j.y + (Math.random() - 0.5) * 90, 40, 196);
            jogo.marcaAlvo(x, y, 16, 700);
            this.scene.time.delayedCall(700, () => !this.morto && jogo.explosaoInimiga(x, y, 16, Math.round(dano * 0.8)));
          }
          this.ondas--;
          this.timer = 0.45;
          if (this.ondas <= 0) this.pausa(0.8);
        }
        break;
      case 'parede':
        // uma parede de balas atravessa a sala na sua direção, com um buraco para passar
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          jogo.paredeDeBalas(this.x, this.y, angJ, p.velocidade * 0.7, dano);
          this.ondas--;
          this.timer = 0.9;
          if (this.ondas <= 0) this.pausa(0.7);
        }
        break;
      case 'laser_mira':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          this.alerta = false;
          this.sub = 'laser';
          this.ondas = furioso ? 22 : 16;
          this.timer = 0;
        }
        break;
      case 'laser':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          jogo.criarProjetil(this.x, this.y, this.giro, p.velocidade * 2.4, dano, this.ondas % 4 === 0);
          this.ondas--;
          this.timer = 0.025;
          if (this.ondas <= 0) this.pausa(0.6);
        }
        break;
      case 'minas':
        this.setVelocity(0, 0);
        for (let k = 0; k < (furioso ? 7 : 5); k++) {
          const a = (k / 5) * Math.PI * 2 + Math.random();
          const d = 30 + Math.random() * 50;
          jogo.criarMinaInimiga(Phaser.Math.Clamp(this.x + Math.cos(a) * d, 24, 296), Phaser.Math.Clamp(this.y + Math.sin(a) * d, 40, 196), dano);
        }
        this.pausa(0.8);
        break;
      case 'tempo':
        // solta um anel lento, para tudo no ar... e manda tudo de uma vez na sua direção
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          if (this.ondas > 1) {
            jogo.leque(this.x, this.y, Math.random(), Math.round(p.quantidade * f), 360, 45, dano);
            this.ondas--;
            this.timer = 0.35;
          } else {
            jogo.acelerarProjeteis(p.velocidade * 1.2);
            Som.tocar('esquiva');
            this.pausa(0.9);
          }
        }
        break;
      case 'pausa':
        this.setVelocity(0, 0);
        if (this.timer <= 0) {
          this.sub = 'perseguir';
          this.timer = furioso ? 0.8 : 1.3;
        }
        break;
      default:
        this.sub = 'perseguir';
        this.timer = 1;
    }
  }

  private iniciarAtaque(jogo: Jogo, furioso: boolean) {
    const lista = [...(this.def.ataques ?? ['anel']), ...(furioso ? this.def.furia ?? [] : [])];
    const prox = lista[this.passo++ % lista.length];
    const j = jogo.alvoDe(this);
    this.sub = prox;
    this.timer = 0.35;
    switch (prox) {
      case 'anel': this.ondas = furioso ? 3 : 2; break;
      case 'espiral': case 'espiral_dupla': this.ondas = furioso ? 34 : 24; break;
      case 'rajada': this.ondas = furioso ? 12 : 8; break;
      case 'leque': this.ondas = furioso ? 4 : 3; break;
      case 'flor': this.ondas = furioso ? 16 : 11; break;
      case 'ondas': this.ondas = furioso ? 60 : 42; break;
      case 'chuva': this.ondas = furioso ? 5 : 3; break;
      case 'parede': this.ondas = furioso ? 3 : 2; break;
      case 'tempo': this.ondas = furioso ? 4 : 3; break;
      case 'investida':
        this.ondas = furioso ? 3 : 2;
        this.mirarInvestida(jogo);
        break;
      case 'salto':
        this.timer = 0.5;
        this.alerta = true;
        break;
      case 'laser':
        this.sub = 'laser_mira';
        this.timer = 0.75;
        this.alerta = true;
        this.giro = Math.atan2(j.y - this.y, j.x - this.x);
        jogo.linhaAviso(this.x, this.y, this.giro, 320, 750);
        break;
    }
  }

  private mirarInvestida(jogo: Jogo) {
    const j = jogo.alvoDe(this);
    this.sub = 'preparar';
    this.timer = 0.55;
    this.alerta = true;
    this.alvo.set(j.x - this.x, j.y - this.y).normalize();
    jogo.linhaAviso(this.x, this.y, this.alvo.angle(), 300, 550);
  }

  private teletransportar(jogo: Jogo) {
    const pos = jogo.posicaoLivre(jogo.alvoDe(this).x, jogo.alvoDe(this).y, 90);
    jogo.faiscasPublicas(this.x, this.y, 0xc86bff);
    this.setPosition(pos.x, pos.y);
    this.body.reset(pos.x, pos.y);
    Som.tocar('apagar');
  }

  private mirarDash(jogo: Jogo) {
    this.sub = 'mirar_dash';
    this.timer = 0.35;
    this.alerta = true;
    this.alvo.set(jogo.alvoDe(this).x - this.x, jogo.alvoDe(this).y - this.y).normalize();
    jogo.linhaAviso(this.x, this.y, this.alvo.angle(), 120, 350);
  }

  private pausa(seg: number) {
    this.sub = 'pausa';
    this.timer = seg;
    this.alerta = false;
  }

  /** Próximo ataque da sequência do chefe. */
  private proximo(seq: string[], furioso: boolean) {
    let prox = seq[this.passo++ % seq.length];
    if (prox === 'investida') prox = 'preparar';
    this.sub = prox;
    const j = (this.scene as Jogo).alvoDe(this);
    switch (prox) {
      case 'preparar':
        this.timer = 0.6;
        this.alerta = true;
        this.alvo.set(j.x - this.x, j.y - this.y).normalize();
        (this.scene as Jogo).linhaAviso(this.x, this.y, this.alvo.angle(), 300, 600);
        break;
      case 'anel':
        this.timer = 0.4;
        this.ondas = furioso ? 3 : 2;
        break;
      case 'rajada':
        this.timer = 0.3;
        this.ondas = furioso ? 10 : 7;
        break;
      case 'espiral':
        this.timer = 0.2;
        this.ondas = furioso ? 34 : 22;
        break;
      case 'salto':
        this.timer = 0.5;
        this.alerta = true;
        break;
      case 'pedras':
        this.timer = 0.3;
        this.ondas = furioso ? 4 : 3;
        break;
      case 'vomito':
        this.timer = 0.4;
        this.ondas = furioso ? 36 : 24;
        this.alerta = true;
        break;
      case 'dash':
        this.ondas = furioso ? 4 : 3;
        this.mirarDash(this.scene as Jogo);
        break;
      case 'escopeta':
        this.timer = 0.35;
        this.ondas = furioso ? 4 : 3;
        this.alerta = true;
        break;
      case 'parry':
        this.timer = furioso ? 2.2 : 1.6;
        this.refletindo = this.timer;
        Som.tocar('parryTentativa');
        break;
    }
  }
}
