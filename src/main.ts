import Phaser from 'phaser';
// a fonte vem junto com o jogo (funciona offline, no navegador e no programa instalado)
import '@fontsource/press-start-2p';
import { TELA_L, TELA_A } from './constantes';
import { Boot } from './cenas/Boot';
import { Abertura } from './cenas/Abertura';
import { Titulo } from './cenas/Titulo';
import { Historia } from './cenas/Historia';
import { Menu } from './cenas/Menu';
import { Altar } from './cenas/Altar';
import { Jogo } from './cenas/Jogo';
import { HUD } from './cenas/HUD';
import { Fim } from './cenas/Fim';
import { Armaria } from './cenas/Armaria';
import { Sacristia } from './cenas/Sacristia';
import { Som } from './som';

// A fonte Press Start 2P desenha as MAIÚSCULAS acentuadas como minúsculas (CRéDITOS).
// Troca só essas letras pela versão sem acento na hora de desenhar; o Ç funciona e fica.
const MAIUSCULAS: Record<string, string> = { Á: 'A', À: 'A', Â: 'A', Ã: 'A', É: 'E', Ê: 'E', Í: 'I', Ó: 'O', Ô: 'O', Õ: 'O', Ú: 'U' };
const setTextOriginal = Phaser.GameObjects.Text.prototype.setText;
Phaser.GameObjects.Text.prototype.setText = function (valor: string | string[]) {
  const limpar = (s: string) => s.replace(/[ÁÀÂÃÉÊÍÓÔÕÚ]/g, (c) => MAIUSCULAS[c]);
  return setTextOriginal.call(this, Array.isArray(valor) ? valor.map(limpar) : limpar(String(valor ?? '')));
};

// O navegador só libera áudio depois da primeira tecla/clique.
const liberarAudio = () => Som.iniciar();
window.addEventListener('pointerdown', liberarAudio);
window.addEventListener('keydown', liberarAudio);

async function comecar() {
  // espera a fonte pixelada (com limite de tempo, caso esteja offline)
  try {
    await Promise.race([document.fonts.load('16px "Press Start 2P"'), new Promise((r) => setTimeout(r, 2500))]);
  } catch {
    // segue com a fonte reserva
  }

  const jogo = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'jogo',
    width: TELA_L,
    height: TELA_A,
    backgroundColor: '#07050b',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { gamepad: true },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scene: [Boot, Abertura, Titulo, Menu, Historia, Altar, Jogo, HUD, Fim, Armaria, Sacristia],
  });
  // acesso pelo console do navegador (F12) para testes: __pavio.scene.getScenes(true)
  (window as unknown as { __pavio: Phaser.Game }).__pavio = jogo;
}

void comecar();
