// Preferências do jogador (menu Opções e Personagem), salvas no navegador.

export interface Opcoes {
  musica: number; // 0 a 10
  efeitos: number; // 0 a 10
  tremor: boolean;
  personagem: string;
  personagem2: string; // jogador 2 (dupla)
  mostrarFps: boolean;
  flashes: boolean; // luzes piscantes (desligue se incomodar)
  brilho: boolean; // efeito de brilho (bloom) da câmera
  dev: boolean; // modo desenvolvedor: libera tudo e liga o menu F2
}

const CHAVE = 'pavio_opcoes_v1';

function padrao(): Opcoes {
  return { musica: 7, efeitos: 8, tremor: true, personagem: 'vela', personagem2: 'ana', mostrarFps: false, flashes: true, brilho: true, dev: false };
}

function carregar(): Opcoes {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) return { ...padrao(), ...JSON.parse(bruto) };
  } catch {
    // sem localStorage
  }
  return padrao();
}

export const Opcoes: Opcoes = carregar();

export function salvarOpcoes() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(Opcoes));
  } catch {
    // idem
  }
}
