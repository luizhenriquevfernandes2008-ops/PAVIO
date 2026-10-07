import Phaser from 'phaser';
import { Estado, Run } from '../estado';
import { Masmorra, NoSala } from './Masmorra';

// Salvar a partida no meio: a cada sala nova (e ao fechar a aba) o estado vai para o navegador.
// No menu aparece CONTINUAR; morrer ou vencer apaga o save.

const CHAVE = 'pavio_partida_v1';

interface Save {
  versao: 1;
  run: Run;
  andar: number;
  salas: NoSala[];
  abertas: string[];
  inicio: string;
  sala: string | null;
  quando: number;
}

export function salvarPartida() {
  const run = Estado.run;
  const m = Estado.masmorra;
  if (!run || !m || run.modo === 'tutorial' || run.chama <= 0) return;
  const dados: Save = {
    versao: 1,
    run,
    andar: m.andar,
    salas: [...m.salas.values()],
    abertas: [...m.abertas],
    inicio: Masmorra.chave(m.inicio.gx, m.inicio.gy),
    sala: Estado.sala ? Masmorra.chave(Estado.sala.gx, Estado.sala.gy) : null,
    quando: Date.now(),
  };
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch {
    // sem espaço ou sem localStorage: segue sem salvar
  }
}

export function carregarPartida(): Save | null {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const s = JSON.parse(bruto) as Save;
    return s.versao === 1 && s.run && s.salas?.length ? s : null;
  } catch {
    return null;
  }
}

export function apagarPartida() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // idem
  }
}

/** Resumo para o botão CONTINUAR do menu. */
export function resumoPartida() {
  const s = carregarPartida();
  return s ? { andar: s.run.andar, personagem: s.run.personagem, modo: s.run.modo } : null;
}

/** Monta a masmorra de volta a partir do save. */
export function restaurarMasmorra(s: Save): Masmorra {
  const m = Object.create(Masmorra.prototype) as Masmorra;
  const salas = new Map(s.salas.map((no) => [Masmorra.chave(no.gx, no.gy), no]));
  Object.assign(m, { andar: s.andar, salas, abertas: new Set(s.abertas), largura: 9, altura: 6 });
  m.inicio = salas.get(s.inicio) ?? [...salas.values()][0];
  return m;
}

// ---------- sorteio com semente (desafio diário) ----------

const randomOriginal = Math.random;

/** Semente do dia: 20261006 para 6/10/2026. */
export function sementeDoDia() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/** A partir daqui, todo sorteio do jogo segue a semente (todo mundo joga a mesma masmorra no dia). */
export function semear(semente: number) {
  let a = semente >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Phaser.Math.RND.sow([String(semente)]);
}

export function dessemear() {
  Math.random = randomOriginal;
  Phaser.Math.RND.sow([String(Date.now())]);
}
