import Phaser from 'phaser';
import { personagemValido, texturaPersonagem } from '../arte/personagens';
import { Opcoes } from '../opcoes';

export class Jogador extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  readonly personagem: string;
  readonly arma: Phaser.GameObjects.Image; // a arma na mão, gira para a mira
  mira = new Phaser.Math.Vector2(1, 0); // direção para onde atira
  dashDir = new Phaser.Math.Vector2();
  invencivel = 0;
  atordoado = 0;
  dashT = 0;
  dashCargas = 1;
  dashRecarga = 0;
  tiroRecarga = 0;
  recarregando = 0; // segundos restantes de recarga
  coice = 0; // segundos de empurrão do recuo
  rastroT = 0;
  fantasmaT = 0;
  parryT = 0; // janela do parry aberta
  parryRecarga = 0;
  parrySucesso = false;
  refletidas = 0; // balas rebatidas neste parry
  raspou = false; // já fez esquiva perfeita neste dash
  morto = false;

  constructor(scene: Phaser.Scene, x: number, y: number, personagem = Opcoes.personagem) {
    const id = personagemValido(personagem);
    const tex = texturaPersonagem(id);
    super(scene, x, y, tex, 0);
    this.personagem = id;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    // corpo de colisão pequeno, nos pés
    const fw = this.frame.realWidth;
    const fh = this.frame.realHeight;
    this.body.setSize(8, 6);
    this.body.setOffset((fw - 8) / 2, fh - 6);
    this.play(this.animParado);
    this.arma = scene.add.image(x, y, 'arma_pistola').setOrigin(0.15, 0.5);
  }

  get animParado() {
    return `heroi_${this.personagem}_parado`;
  }

  get animAndar() {
    return `heroi_${this.personagem}_andar`;
  }

  /** Ponto de onde a arma sai (altura das mãos). */
  get maoX() {
    return this.body.center.x;
  }

  get maoY() {
    return this.body.center.y - 7;
  }

  /** Posiciona a arma girando em direção à mira. */
  atualizarArma(textura: string) {
    if (this.arma.texture.key !== textura) this.arma.setTexture(textura);
    const ang = this.mira.angle();
    const esquerda = this.mira.x < 0;
    this.arma.setPosition(this.maoX + this.mira.x * 3, this.maoY + this.mira.y * 2 + 1);
    this.arma.setRotation(ang);
    this.arma.setFlipY(esquerda);
    this.setFlipX(esquerda);
    // arma atrás do corpo quando aponta para cima
    this.arma.setDepth(this.depth + (this.mira.y < -0.5 ? -0.5 : 0.5));
    this.arma.setVisible(!this.morto);
    this.arma.setAlpha(this.alpha);
  }
}
