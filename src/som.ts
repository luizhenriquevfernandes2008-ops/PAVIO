// Sintetizador do jogo: efeitos sonoros e a trilha (src/musica.ts) gerados com Web Audio.
// Nenhum arquivo de áudio é necessário.

import { MUSICAS, Faixa, Musica, Secao, lerCompasso, lerAcorde, raizNaFaixa, NotaMelodia } from './musica';
import { Opcoes } from './opcoes';

export type { Faixa };

const freq = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const padrao = (s?: string) => [...(s ?? '').padEnd(16, '.')].slice(0, 16).map((c) => c === 'x');

/** Um compasso já "resolvido": acorde, melodia, riff e bateria. */
interface Compasso {
  secao: Secao;
  acorde: { guitarra: number; baixo: number; triade: number[] };
  melodia: (NotaMelodia | null)[] | null;
  riff: string | null;
  bateria: { bumbo: boolean[]; caixa: boolean[]; chimbal: boolean[]; prato: boolean[] } | null;
  primeiro: boolean; // primeiro compasso da seção (prato de ataque)
  ultimo: boolean; // último compasso da seção (virada)
}

interface MusicaPronta {
  def: Musica;
  compassos: Compasso[];
  repetirDe: number; // índice do compasso para onde volta no loop
}

function preparar(def: Musica): MusicaPronta {
  const compassos: Compasso[] = [];
  let repetirDe = 0;
  def.ordem.forEach((nome, iOrdem) => {
    if (iOrdem === (def.repetirDe ?? 0)) repetirDe = compassos.length;
    const sec = def.secoes[nome];
    const bat = sec.bateria && {
      bumbo: padrao(sec.bateria.bumbo), caixa: padrao(sec.bateria.caixa), chimbal: padrao(sec.bateria.chimbal), prato: padrao(sec.bateria.prato),
    };
    sec.acordes.forEach((nomeAcorde, i) => {
      const a = lerAcorde(nomeAcorde);
      const triade = a.intervalos.slice(0, 3).map((iv) => raizNaFaixa(a.raiz, 57) + iv);
      compassos.push({
        secao: sec,
        acorde: { guitarra: raizNaFaixa(a.raiz, 40), baixo: raizNaFaixa(a.raiz, 28), triade },
        melodia: sec.melodia ? lerCompasso(sec.melodia[i % sec.melodia.length]) : null,
        riff: sec.riff ? sec.riff[i % sec.riff.length] : null,
        bateria: bat ?? null,
        primeiro: i === 0,
        ultimo: i === sec.acordes.length - 1,
      });
    });
  });
  return { def, compassos, repetirDe };
}

class SomGlobal {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicaGain!: GainNode;
  private sfxGain!: GainNode;
  private ruidoBuf!: AudioBuffer;
  private faixa: Faixa | null = null;
  private pronta: MusicaPronta | null = null;
  private passo = 0;
  private proxNota = 0;
  private timer: number | null = null;
  private ultimoSom: Record<string, number> = {};
  private abafada = false;
  private ouvintesBatida = new Set<() => void>();
  private guitarra!: GainNode; // entrada do canal distorcido
  mudo = false;
  /** Frenesi: a música ganha chimbal em semicolcheias e arpejo extra. */
  intenso = false;

  /** Avisa a cada batida do bumbo (para luzes pulsarem no ritmo). Retorna a função que cancela. */
  aoBater(f: () => void) {
    this.ouvintesBatida.add(f);
    return () => this.ouvintesBatida.delete(f);
  }

  iniciar() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.mudo ? 0 : 0.8;
    // compressor leve para os tiros não estourarem
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(this.ctx.destination);
    this.musicaGain = this.ctx.createGain();
    this.musicaGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.master);
    // guitarra: tudo passa por uma distorção só (pesa menos que uma por nota)
    this.guitarra = this.ctx.createGain();
    const dist = this.ctx.createWaveShaper();
    const curva = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      curva[i] = Math.tanh(x * 9);
    }
    dist.curve = curva;
    const passaBaixa = this.ctx.createBiquadFilter();
    passaBaixa.type = 'lowpass';
    passaBaixa.frequency.value = 3400;
    const passaAlta = this.ctx.createBiquadFilter();
    passaAlta.type = 'highpass';
    passaAlta.frequency.value = 90;
    const volGuitarra = this.ctx.createGain();
    volGuitarra.gain.value = 0.16;
    this.guitarra.connect(dist).connect(passaBaixa).connect(passaAlta).connect(volGuitarra).connect(this.musicaGain);
    this.aplicarVolumes();

    const len = this.ctx.sampleRate;
    this.ruidoBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.ruidoBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    if (this.faixa) this.comecarSequenciador();
  }

  /** Lê o volume das Opções (0 a 10). */
  aplicarVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const m = (Opcoes.musica / 10) * 0.45 * (this.abafada ? 0.3 : 1);
    this.musicaGain.gain.setTargetAtTime(m, t, 0.05);
    this.sfxGain.gain.setTargetAtTime((Opcoes.efeitos / 10) * 0.9, t, 0.05);
  }

  alternarMudo() {
    this.mudo = !this.mudo;
    if (this.ctx) this.master.gain.setTargetAtTime(this.mudo ? 0 : 0.8, this.ctx.currentTime, 0.02);
    return this.mudo;
  }

  abafarMusica(abafar: boolean) {
    this.abafada = abafar;
    this.aplicarVolumes();
  }

  // =============== blocos básicos ===============

  private tom(f1: number, f2: number, dur: number, tipo: OscillatorType, vol: number, atraso = 0, destino?: AudioNode, ataque = 0.006) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + Math.max(0, atraso);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(f1, t);
    if (f2 !== f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(destino ?? this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private ruido(dur: number, vol: number, f: number, tipo: BiquadFilterType, atraso = 0, fFim?: number, destino?: AudioNode) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + Math.max(0, atraso);
    const src = this.ctx.createBufferSource();
    src.buffer = this.ruidoBuf;
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = tipo;
    filtro.frequency.setValueAtTime(f, t);
    if (fFim) filtro.frequency.exponentialRampToValueAtTime(fFim, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filtro).connect(g).connect(destino ?? this.sfxGain);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  /** Nota com filtro passa-baixa (baixo, pad, melodia quadrada). */
  private notaFiltrada(f: number, dur: number, tipo: OscillatorType, vol: number, corte: number, atraso: number, ataque = 0.01, detune = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + Math.max(0, atraso);
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = corte;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + ataque);
    g.gain.setValueAtTime(vol, t + Math.max(ataque, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    filtro.connect(g).connect(this.musicaGain);
    const oscs = detune ? [-detune, detune] : [0];
    for (const dt of oscs) {
      const o = this.ctx.createOscillator();
      o.type = tipo;
      o.frequency.value = f;
      o.detune.value = dt;
      o.connect(filtro);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  /**
   * Um latido de cachorro: uma voz rouca (dente de serra) que sobe rápido e cai,
   * filtrada por duas formantes que abrem e fecham (o "w-AU" da boca), mais um sopro de ar.
   */
  private latir(vol: number, f0: number, atraso = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + atraso;
    const dur = 0.2;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0 * 0.7, t);
    o.frequency.exponentialRampToValueAtTime(f0, t + 0.03);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + dur);
    // segunda voz levemente desafinada: deixa o latido rouco
    const o2 = ctx.createOscillator();
    o2.type = 'square';
    o2.frequency.setValueAtTime(f0 * 0.71, t);
    o2.frequency.exponentialRampToValueAtTime(f0 * 1.02, t + 0.03);
    o2.frequency.exponentialRampToValueAtTime(f0 * 0.56, t + dur);
    const boca = (de: number, ate: number, fim: number, q: number) => {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = q;
      f.frequency.setValueAtTime(de, t);
      f.frequency.exponentialRampToValueAtTime(ate, t + 0.035);
      f.frequency.exponentialRampToValueAtTime(fim, t + dur);
      return f;
    };
    const f1 = boca(450, 950, 420, 3);
    const f2 = boca(1300, 2000, 1100, 5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(vol * 0.55, t + 0.07);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const mistura = ctx.createGain();
    mistura.gain.value = 0.6;
    o.connect(f1);
    o.connect(f2);
    o2.connect(mistura).connect(f1);
    f1.connect(g);
    f2.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o2.start(t);
    o.stop(t + dur + 0.05);
    o2.stop(t + dur + 0.05);
    // o ar saindo da boca
    this.ruido(0.07, vol * 0.35, 1600, 'bandpass', atraso, 700);
  }

  /** "Grrrr": voz bem grave tremendo (modulada) e abafada. */
  private rosnar(dur: number, vol: number) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(95, t);
    o.frequency.linearRampToValueAtTime(80, t + dur);
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 520;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.05);
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    // o tremido do rosnado
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 24;
    const lfoG = ctx.createGain();
    lfoG.gain.value = vol * 0.8;
    lfo.connect(lfoG).connect(g.gain);
    o.connect(filtro).connect(g).connect(this.sfxGain);
    o.start(t);
    lfo.start(t);
    o.stop(t + dur + 0.05);
    lfo.stop(t + dur + 0.05);
  }

  // =============== efeitos ===============

  tocar(nome: string) {
    if (!this.ctx || this.mudo) return;
    // limita repetições muito rápidas (submetralhadora, maçarico)
    const agora = this.ctx.currentTime;
    if (agora - (this.ultimoSom[nome] ?? -1) < 0.035) return;
    this.ultimoSom[nome] = agora;
    const v = 0.9 + Math.random() * 0.2;

    switch (nome) {
      // ---- armas ----
      case 'latido':
        // "AU AU!": dois latidos de pug (o segundo um pouco mais agudo)
        this.latir(0.55, 430 * v);
        this.latir(0.45, 480 * v, 0.2);
        break;
      case 'latidoTiro': {
        // o "au!" da TETE a cada tiro: um latido só, baixinho (no máximo uns 6 por segundo)
        if (agora - (this.ultimoSom.latidoTiroReal ?? -1) < 0.16) break;
        this.ultimoSom.latidoTiroReal = agora;
        this.latir(0.3, (Math.random() < 0.5 ? 430 : 500) * v);
        break;
      }
      case 'latidoMordida':
        // a TETE mordendo: "rrau!" curtinho
        this.latir(0.22, 520 * v);
        break;
      case 'rosnado':
        // recarregando a TETE: "grrrr" grave
        this.rosnar(0.5, 0.08);
        break;
      case 'cacaNiquel':
        // as rodinhas girando: tique-taque rápido
        for (let i = 0; i < 9; i++) this.tom(900 + (i % 3) * 120, 700, 0.03, 'square', 0.05, i * 0.09);
        break;
      case 'jackpot':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tom(f, f, 0.16, 'square', 0.09, i * 0.08));
        this.ruido(0.5, 0.12, 6000, 'highpass', 0.3);
        break;
      case 'moeda':
        this.tom(1320 * v, 1320 * v, 0.06, 'square', 0.07);
        this.tom(1760 * v, 1760 * v, 0.12, 'square', 0.07, 0.06);
        break;
      case 'bigorna':
        // martelo na bigorna: "TÉIN" metálico
        this.tom(1180, 1150, 0.6, 'triangle', 0.18);
        this.tom(2950, 2900, 0.4, 'sine', 0.08);
        this.tom(1730, 1700, 0.5, 'sine', 0.06);
        this.ruido(0.05, 0.5, 3000, 'bandpass');
        break;
      case 'miau':
        // "mi-AU": sobe e desce, com um vibrato de gato
        this.tom(520 * v, 900 * v, 0.12, 'triangle', 0.16);
        this.tom(900 * v, 480 * v, 0.22, 'triangle', 0.15, 0.11);
        this.tom(1040 * v, 560 * v, 0.2, 'square', 0.03, 0.11);
        break;
      case 'pistola':
        this.ruido(0.09, 0.45, 2600 * v, 'bandpass', 0, 700);
        this.tom(520 * v, 120, 0.08, 'square', 0.1);
        break;
      case 'escopeta':
        this.ruido(0.32, 0.7, 1400, 'lowpass', 0, 120);
        this.tom(160, 40, 0.25, 'sawtooth', 0.25);
        this.ruido(0.08, 0.3, 4000, 'highpass');
        break;
      case 'smg':
        this.ruido(0.06, 0.32, 3200 * v, 'bandpass', 0, 1200);
        this.tom(700 * v, 200, 0.05, 'square', 0.06);
        break;
      case 'revolver':
        this.ruido(0.4, 0.7, 2000, 'lowpass', 0, 90);
        this.tom(220, 50, 0.35, 'square', 0.2);
        break;
      case 'lancador':
        this.tom(300, 90, 0.18, 'triangle', 0.25);
        this.ruido(0.15, 0.3, 900, 'lowpass', 0, 200);
        break;
      case 'macarico':
        this.ruido(0.12, 0.18, 900 * v, 'bandpass', 0, 2400);
        break;
      case 'vagalume':
        this.tom(1200 * v, 1800 * v, 0.06, 'sine', 0.08);
        this.ruido(0.05, 0.1, 5000, 'highpass');
        break;
      case 'tesla':
        this.tom(80, 60, 0.12, 'sawtooth', 0.12);
        this.ruido(0.1, 0.3, 4000 * v, 'bandpass', 0, 1500);
        break;
      case 'gelo':
        this.tom(1800 * v, 900, 0.1, 'triangle', 0.09);
        this.ruido(0.08, 0.15, 7000, 'highpass');
        break;
      case 'laser':
        this.tom(1600, 200, 0.22, 'sawtooth', 0.12);
        this.tom(2400, 400, 0.18, 'square', 0.05);
        break;
      case 'serra':
        this.tom(300, 600, 0.2, 'sawtooth', 0.07);
        this.ruido(0.2, 0.12, 2500, 'bandpass');
        break;
      case 'agulha':
        this.ruido(0.05, 0.25, 5500 * v, 'highpass');
        break;
      case 'vazio':
        this.tom(200, 40, 0.6, 'sine', 0.3);
        this.tom(400, 80, 0.5, 'sawtooth', 0.08);
        break;
      case 'foguete':
        this.ruido(0.3, 0.25, 800, 'bandpass', 0, 4000);
        this.tom(500, 1500, 0.25, 'square', 0.04);
        break;
      case 'zap':
        this.ruido(0.12, 0.2, 3500 * v, 'bandpass', 0, 800);
        this.tom(120, 90, 0.1, 'square', 0.06);
        break;
      case 'cura':
        [0, 4, 7].forEach((n, i) => this.tom(freq(72 + n), freq(72 + n), 0.12, 'sine', 0.05, i * 0.05));
        break;
      case 'quebrar':
        this.ruido(0.2, 0.35, 900 * v, 'bandpass', 0, 300);
        this.tom(180, 90, 0.1, 'square', 0.06);
        break;
      case 'vidro':
        this.ruido(0.15, 0.25, 6000, 'highpass');
        this.tom(2200, 1800, 0.1, 'triangle', 0.05);
        break;
      case 'pavio':
        this.ruido(0.6, 0.15, 3000, 'highpass', 0, 6000);
        break;
      case 'recarga':
        this.tom(900, 700, 0.04, 'square', 0.06);
        this.ruido(0.05, 0.12, 3000, 'highpass', 0.08);
        break;
      case 'recargaFim':
        this.tom(1200, 1200, 0.03, 'square', 0.06);
        this.tom(1600, 1600, 0.04, 'square', 0.06, 0.05);
        break;
      case 'semMunicao':
        this.tom(1800, 1700, 0.03, 'square', 0.05);
        break;
      case 'trocarArma':
        this.ruido(0.06, 0.15, 2500, 'bandpass');
        this.tom(600, 900, 0.06, 'square', 0.05, 0.04);
        break;
      case 'pegarArma':
        [0, 7, 12].forEach((n, i) => this.tom(freq(62 + n), freq(62 + n), 0.12, 'square', 0.07, i * 0.05));
        break;
      case 'municao':
        this.tom(500, 500, 0.05, 'square', 0.07);
        this.tom(750, 750, 0.08, 'square', 0.07, 0.05);
        break;
      case 'parry':
        this.tom(1568, 1568, 0.5, 'sine', 0.16);
        this.tom(2349, 2349, 0.35, 'triangle', 0.08, 0.01);
        this.ruido(0.12, 0.35, 5000, 'highpass');
        this.tom(200, 60, 0.15, 'square', 0.12);
        break;
      case 'parryTentativa':
        this.ruido(0.1, 0.12, 3000, 'bandpass', 0, 6000);
        break;
      case 'esquiva':
        this.ruido(0.3, 0.25, 600, 'bandpass', 0, 5000);
        this.tom(440, 1760, 0.25, 'sine', 0.08);
        break;
      case 'critico':
        this.tom(1400, 2200, 0.06, 'square', 0.06);
        break;
      case 'frenesi':
        [0, 7, 12, 19].forEach((n, i) => this.tom(freq(57 + n), freq(57 + n) * 1.01, 0.3, 'sawtooth', 0.07, i * 0.05));
        this.ruido(0.5, 0.2, 800, 'highpass', 0, 9000);
        break;
      case 'salaLimpa':
        [0, 4, 7, 12].forEach((n, i) => this.tom(freq(72 + n), freq(72 + n), 0.15, 'square', 0.05, i * 0.04));
        break;
      case 'eliteMorte':
        this.ruido(0.5, 0.5, 2500, 'lowpass', 0, 80);
        this.tom(330, 40, 0.4, 'sawtooth', 0.15);
        break;
      case 'blip':
        this.tom(520 + Math.random() * 60, 520, 0.035, 'square', 0.035);
        break;
      case 'apagar':
        this.ruido(0.25, 0.12, 1400, 'bandpass', 0, 300);
        break;
      case 'abertura':
        // acorde fantasmagórico + brilho
        [45, 52, 57, 64].forEach((n, i) => this.tom(freq(n), freq(n) * 0.995, 2.6, i < 2 ? 'sawtooth' : 'sine', 0.05, i * 0.12, undefined, 0.6));
        this.ruido(2.2, 0.08, 6000, 'highpass', 0.3, 2000);
        [76, 79, 83, 88].forEach((n, i) => this.tom(freq(n), freq(n), 0.8, 'triangle', 0.04, 1.4 + i * 0.13));
        break;
      case 'impacto':
        this.ruido(0.05, 0.12, 1800 * v, 'bandpass');
        break;

      // ---- combate ----
      case 'acerto':
        this.tom(300 * v, 90, 0.06, 'square', 0.09);
        break;
      case 'dano':
        this.tom(420, 70, 0.28, 'sawtooth', 0.18);
        this.ruido(0.2, 0.25, 600, 'lowpass');
        break;
      case 'dash':
        this.ruido(0.14, 0.25, 500, 'bandpass', 0, 3000);
        break;
      case 'tiro':
        this.tom(700 * v, 260, 0.14, 'triangle', 0.08);
        break;
      case 'morteInimigo':
        this.ruido(0.22, 0.32, 1100 * v, 'lowpass', 0, 150);
        this.tom(220 * v, 55, 0.16, 'square', 0.07);
        break;
      case 'explosao':
        this.ruido(0.8, 0.7, 1500, 'lowpass', 0, 50);
        this.tom(110, 28, 0.7, 'sawtooth', 0.25);
        break;
      case 'combo':
        this.tom(880, 1760, 0.12, 'square', 0.06);
        break;

      // ---- objetos ----
      case 'cera':
        this.tom(880 * v, 1320 * v, 0.07, 'sine', 0.12);
        break;
      case 'porta':
        this.tom(110, 80, 0.18, 'square', 0.1);
        this.tom(165, 120, 0.18, 'square', 0.08, 0.1);
        break;
      case 'acender':
        [0, 4, 7, 12].forEach((n, i) => this.tom(freq(64 + n), freq(64 + n), 0.22, 'triangle', 0.12, i * 0.07));
        this.ruido(0.4, 0.15, 3000, 'highpass');
        break;
      case 'reliquia':
        [0, 4, 7, 11, 14].forEach((n, i) => this.tom(freq(69 + n), freq(69 + n), 0.3, 'sine', 0.13, i * 0.08));
        break;
      case 'compra':
        this.tom(988, 988, 0.08, 'square', 0.07);
        this.tom(1319, 1319, 0.16, 'square', 0.07, 0.08);
        break;
      case 'erro':
        this.tom(140, 120, 0.15, 'square', 0.08);
        break;
      case 'bau':
        this.tom(196, 392, 0.25, 'triangle', 0.14);
        this.ruido(0.18, 0.15, 1200, 'bandpass');
        break;
      case 'escada':
        [12, 7, 4, 0, -5].forEach((n, i) => this.tom(freq(60 + n), freq(60 + n), 0.2, 'triangle', 0.12, i * 0.09));
        break;
      case 'onda':
        [0, 3, 6].forEach((n, i) => this.tom(freq(57 + n), freq(57 + n), 0.18, 'sawtooth', 0.09, i * 0.1));
        break;
      case 'chefeRugido':
        this.tom(90, 40, 0.9, 'sawtooth', 0.2);
        this.ruido(0.9, 0.25, 400, 'lowpass', 0, 80);
        break;
      case 'morte':
        this.ruido(1.2, 0.3, 2000, 'lowpass', 0, 100);
        break;

      // ---- menus ----
      case 'menu':
        this.tom(660, 660, 0.05, 'square', 0.06);
        break;
      case 'confirmar':
        this.tom(660, 660, 0.06, 'square', 0.07);
        this.tom(990, 990, 0.1, 'square', 0.07, 0.06);
        break;
      case 'voltar':
        this.tom(660, 440, 0.08, 'square', 0.06);
        break;
    }
  }

  // =============== música ===============

  musica(faixa: Faixa | null) {
    if (faixa === this.faixa) return;
    this.faixa = faixa;
    this.pronta = faixa ? preparar(MUSICAS[faixa]) : null;
    this.passo = 0;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (faixa && this.ctx) this.comecarSequenciador();
  }

  get faixaAtual() {
    return this.faixa;
  }

  private comecarSequenciador() {
    if (!this.ctx || this.timer !== null) return;
    this.proxNota = this.ctx.currentTime + 0.08;
    this.timer = window.setInterval(() => this.agendar(), 25);
  }

  private agendar() {
    if (!this.ctx || !this.pronta) return;
    const m = this.pronta;
    const dPasso = 60 / m.def.bpm / 4; // semicolcheia
    while (this.proxNota < this.ctx.currentTime + 0.12) {
      let iCompasso = Math.floor(this.passo / 16);
      if (iCompasso >= m.compassos.length) {
        if (!m.def.loop) {
          const depois = m.def.depois ?? null;
          this.faixa = null;
          this.musica(depois);
          return;
        }
        // volta para o ponto de repetição
        this.passo = m.repetirDe * 16 + (this.passo % 16);
        iCompasso = m.repetirDe;
      }
      this.tocarPasso(m.compassos[iCompasso], this.passo % 16, this.proxNota - this.ctx.currentTime, dPasso);
      this.proxNota += dPasso;
      this.passo++;
    }
  }

  private tocarPasso(c: Compasso, p: number, t0: number, dPasso: number) {
    const sec = c.secao;
    const { guitarra, baixo, triade } = c.acorde;

    // pad: o acorde inteiro, longo
    if (sec.pad && p === 0) for (const n of triade) this.notaFiltrada(freq(n), dPasso * 16, 'sawtooth', 0.022, 900, t0, 0.35, 8);

    // guitarra base (riff)
    let tocouRiff = false;
    if (c.riff) {
      const ch = c.riff[p];
      if (ch === 'x' || ch === 'X' || ch === 'o') {
        let dur = 1;
        while (p + dur < 16 && c.riff[p + dur] === '-') dur++;
        const abafada = ch === 'x';
        this.powerChord(guitarra + (ch === 'o' ? 12 : 0), abafada ? dPasso * 0.85 : dPasso * dur, abafada, t0);
        tocouRiff = true;
      }
    }

    // baixo
    switch (sec.baixo) {
      case 'longo':
        if (p === 0) this.notaFiltrada(freq(baixo), dPasso * 15, 'triangle', 0.16, 500, t0, 0.02);
        break;
      case 'oitavas':
        if (p % 2 === 0) this.notaFiltrada(freq(baixo + (p % 4 === 2 ? 12 : 0)), dPasso * 1.8, 'sawtooth', 0.1, 650, t0, 0.005);
        break;
      case 'pulsante':
        this.notaFiltrada(freq(baixo), dPasso * 0.9, 'sawtooth', 0.09, 520 + (p % 4) * 120, t0, 0.004);
        break;
      case 'riff':
        if (tocouRiff) this.notaFiltrada(freq(baixo), dPasso * 0.95, 'sawtooth', 0.1, 480, t0, 0.004);
        break;
    }

    // arpejo
    const comMelodia = !!c.melodia;
    const vArp = comMelodia ? 0.03 : 0.055;
    if (sec.arpejo === 'colcheias' && p % 2 === 0) {
      const n = triade[(p / 2) % 3] + 12;
      this.tom(freq(n), freq(n), dPasso * 2.2, 'triangle', vArp, t0, this.musicaGain);
    }
    if (sec.arpejo === 'semicolcheias') {
      const n = triade[p % 3] + (p % 8 < 4 ? 12 : 24);
      this.tom(freq(n), freq(n), dPasso * 1.2, 'square', vArp * 0.5, t0, this.musicaGain);
    }

    // melodia
    const nota = c.melodia?.[p];
    if (nota) {
      const dur = nota.tempos * dPasso;
      if (sec.timbre === 'sino') {
        this.tom(freq(nota.midi), freq(nota.midi), Math.max(0.6, dur * 1.5), 'sine', 0.09, t0, this.musicaGain, 0.004);
        this.tom(freq(nota.midi + 12), freq(nota.midi + 12), 0.4, 'triangle', 0.025, t0, this.musicaGain, 0.004);
      } else if (sec.timbre === 'guitarra') {
        this.solo(freq(nota.midi), dur * 0.97, t0);
      } else {
        this.notaFiltrada(freq(nota.midi), dur * 0.95, 'square', 0.05, 2600, t0, 0.008, 6);
      }
    }

    // bateria (com virada no fim da seção)
    const b = c.bateria;
    const virada = sec.virada && c.ultimo && p >= 8;
    if (virada) {
      // tons descendo + caixa
      const tons = [220, 200, 180, 160, 140, 120, 100, 85];
      this.tom(tons[p - 8], tons[p - 8] * 0.5, 0.12, 'triangle', 0.22, t0, this.musicaGain);
      if (p % 2 === 0) this.ruido(0.1, 0.18, 1800, 'bandpass', t0, undefined, this.musicaGain);
      if (p % 4 === 0) this.bumbo(t0);
    } else if (b) {
      if (b.bumbo[p]) this.bumbo(t0, p % 4 === 0);
      if (b.caixa[p]) {
        this.ruido(0.14, 0.24, 1800, 'bandpass', t0, undefined, this.musicaGain);
        this.tom(210, 130, 0.08, 'triangle', 0.1, t0, this.musicaGain);
      }
      if (b.chimbal[p] || this.intenso) this.ruido(p % 4 === 2 ? 0.07 : 0.03, 0.06, 7500, 'highpass', t0, undefined, this.musicaGain);
      if (b.prato[p] && c.primeiro) this.ruido(1.3, 0.16, 5000, 'highpass', t0, 3000, this.musicaGain);
    }
    if (this.intenso) {
      const n = triade[p % 3] + 24;
      this.tom(freq(n), freq(n), dPasso * 0.9, 'square', 0.022, t0, this.musicaGain);
    }
  }

  /** Bumbo; "batida" avisa quem quer pulsar no ritmo (luzes, combo). */
  private bumbo(t0: number, batida = true) {
    this.tom(140, 45, 0.11, 'sine', 0.55, t0, this.musicaGain, 0.002);
    if (batida) window.setTimeout(() => this.ouvintesBatida.forEach((f) => f()), Math.max(0, t0 * 1000));
  }

  /** Power chord (raiz + quinta + oitava) no canal distorcido. Abafada = palhetada curta e escura. */
  private powerChord(raiz: number, dur: number, abafada: boolean, atraso: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + Math.max(0, atraso);
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = abafada ? 750 : 2600;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.004);
    g.gain.setValueAtTime(0.5, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + (abafada ? 0.02 : 0.08));
    filtro.connect(g).connect(this.guitarra);
    for (const [iv, det] of [[0, -6], [0, 6], [7, 0], [12, 3]] as [number, number][]) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq(raiz + iv);
      o.detune.value = det;
      o.connect(filtro);
      o.start(t);
      o.stop(t + dur + 0.12);
    }
  }

  /** Solo de guitarra: uma nota com vibrato no canal distorcido. */
  private solo(f: number, dur: number, atraso: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + Math.max(0, atraso);
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = f;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 6;
    const prof = this.ctx.createGain();
    prof.gain.setValueAtTime(0, t);
    prof.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.3, dur)); // o vibrato entra devagar
    lfo.connect(prof).connect(o.frequency);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.01);
    g.gain.setValueAtTime(0.32, t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    o.connect(g).connect(this.guitarra);
    o.start(t);
    lfo.start(t);
    o.stop(t + dur + 0.1);
    lfo.stop(t + dur + 0.1);
  }
}

export const Som = new SomGlobal();
