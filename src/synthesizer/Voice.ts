import * as Tone from "tone";
import type { SynthParams } from "./SynthEngine";

export class Voice {
  private osc1: Tone.Oscillator | null = null;
  private osc2: Tone.Oscillator | null = null;
  private subOsc: Tone.Oscillator | null = null;
  private noise: any = null;
  private filter: Tone.Filter;
  private ampEnv: Tone.AmplitudeEnvelope;
  private lfo1: Tone.LFO;
  private lfo2: Tone.LFO;
  private lfoUpdateLoop: Tone.Loop;
  private baseCutoff: number;
  private baseOsc1Freq: number;
  private baseOsc2Freq: number;
  private osc1Gain: Tone.Gain;
  private osc2Gain: Tone.Gain;
  private subGain: Tone.Gain;
  private noiseGain: Tone.Gain;
  private mixerGain: Tone.Gain;
  private output: Tone.Gain;

  public currentNote: string | number | null = null;
  private active = false;
  private params: SynthParams;
  private stopTimeout: number | null = null;

  constructor(params: SynthParams) {
    this.params = params;

    this.filter = new Tone.Filter({
      type: params.filter.type,
      frequency: params.filter.cutoff,
      Q: params.filter.resonance,
    });

    this.ampEnv = new Tone.AmplitudeEnvelope({
      attack: params.ampEnv.attack,
      decay: params.ampEnv.decay,
      sustain: params.ampEnv.sustain,
      release: params.ampEnv.release,
    });

    const lfo1FreqHz = 0.1 * Math.pow(10 / 0.1, params.lfo1.rate / 99);
    const lfo2FreqHz = 0.1 * Math.pow(10 / 0.1, params.lfo2.rate / 99);

    this.lfo1 = new Tone.LFO({
      type: params.lfo1.waveform,
      frequency: lfo1FreqHz,
    });
    this.lfo2 = new Tone.LFO({
      type: params.lfo2.waveform,
      frequency: lfo2FreqHz,
    });

    this.baseCutoff = params.filter.cutoff;
    this.baseOsc1Freq = 440;
    this.baseOsc2Freq = 440;

    this.lfoUpdateLoop = new Tone.Loop((_time) => {
      this.updateLFOModulation();
    }, "32n");

    this.osc1Gain = new Tone.Gain(0.5);
    this.osc2Gain = new Tone.Gain(params.osc2.mix);
    this.subGain = new Tone.Gain(0);
    this.noiseGain = new Tone.Gain(0);
    this.mixerGain = new Tone.Gain(0.7);
    this.output = new Tone.Gain(1);

    this.setupConnections();
  }

  private setupConnections() {
    this.osc1Gain.connect(this.mixerGain);
    this.osc2Gain.connect(this.mixerGain);
    this.subGain.connect(this.mixerGain);
    this.noiseGain.connect(this.mixerGain);
    this.mixerGain.connect(this.filter);
    this.filter.connect(this.ampEnv);
    this.ampEnv.connect(this.output);
    this.lfo1.start();
    this.lfo2.start();
    this.lfoUpdateLoop.start();
  }

  noteOn(note: string | number, velocity: number = 0.8) {
    try {
      if (this.stopTimeout) {
        clearTimeout(this.stopTimeout);
        this.stopTimeout = null;
      }

      if (this.osc1 || this.osc2) {
        this.stopOscillators();
      }

      this.currentNote = note;
      this.active = true;

      const frequency =
        typeof note === "string" ? Tone.Frequency(note).toFrequency() : note;

      const osc1Freq =
        frequency *
        Math.pow(2, this.params.osc1.frequency / 12) *
        Math.pow(2, this.params.osc1.fine / 1200);

      const osc2Freq =
        frequency *
        Math.pow(2, this.params.osc2.frequency / 12) *
        Math.pow(2, this.params.osc2.fine / 1200);

      let slopDetune = 0;
      if (this.params.osc2.slop > 0) {
        const maxDetuneCents = 50;
        slopDetune =
          (Math.random() * 2 - 1) *
          maxDetuneCents *
          (this.params.osc2.slop / 100);
      }

      const osc1Waveform =
        this.params.osc1.waveform === "pulse"
          ? "square"
          : this.params.osc1.waveform;
      const osc2Waveform =
        this.params.osc2.waveform === "pulse"
          ? "square"
          : this.params.osc2.waveform;

      const clampedOsc1Freq = Math.max(20, osc1Freq);
      const clampedOsc2Freq = Math.max(
        20,
        osc2Freq * Math.pow(2, slopDetune / 1200)
      );

      this.osc1 = new Tone.Oscillator({
        type: osc1Waveform as OscillatorType,
        frequency: clampedOsc1Freq,
      });

      this.osc2 = new Tone.Oscillator({
        type: osc2Waveform as OscillatorType,
        frequency: clampedOsc2Freq,
      });

      this.baseOsc1Freq = clampedOsc1Freq;
      this.baseOsc2Freq = clampedOsc2Freq;

      if (this.params.osc1.subOctave > 0) {
        const clampedSubFreq = Math.max(10, clampedOsc1Freq / 2);
        this.subOsc = new Tone.Oscillator({
          type: "square",
          frequency: clampedSubFreq,
        });
        this.subOsc.connect(this.subGain);
        this.subOsc.start();
      }

      if (this.params.osc1.noise > 0) {
        this.noise = new Tone.Noise({
          type: "white",
        });
        this.noise.connect(this.noiseGain);
        this.noise.start();
      }

      this.osc1.connect(this.osc1Gain);
      this.osc2.connect(this.osc2Gain);

      if (this.params.osc2.sync > 0.5) {
        if (this.osc1 && this.osc2) {
          const syncRatio = 2 + this.params.osc2.frequency / 6;
          const clampedSyncFreq = Math.max(20, clampedOsc1Freq * syncRatio);
          this.osc2.frequency.value = clampedSyncFreq;
          this.baseOsc2Freq = clampedSyncFreq;
        }
      }

      this.osc1.start();
      this.osc2.start();
      this.ampEnv.triggerAttack(Tone.now(), velocity);
      this.applyLFOModulation();
    } catch (error) {
      console.error("Error in noteOn:", error);
    }
  }

  noteOff() {
    try {
      if (!this.active) return;

      this.active = false;
      this.ampEnv.triggerRelease(Tone.now());

      const releaseTime = this.params.ampEnv.release;
      this.stopTimeout = window.setTimeout(() => {
        this.stopOscillators();
        this.currentNote = null;
        this.stopTimeout = null;
      }, (releaseTime + 0.1) * 1000);
    } catch (error) {
      console.error("Error in noteOff:", error);
    }
  }

  private stopOscillators() {
    if (this.osc1) {
      try {
        this.osc1.stop();
        this.osc1.dispose();
      } catch (e) {
        console.warn("Error stopping osc1:", e);
      }
      this.osc1 = null;
    }

    if (this.osc2) {
      try {
        this.osc2.stop();
        this.osc2.dispose();
      } catch (e) {
        console.warn("Error stopping osc2:", e);
      }
      this.osc2 = null;
    }

    if (this.subOsc) {
      try {
        this.subOsc.stop();
        this.subOsc.dispose();
      } catch (e) {
        console.warn("Error stopping subOsc:", e);
      }
      this.subOsc = null;
    }

    if (this.noise) {
      try {
        this.noise.stop();
        this.noise.dispose();
      } catch (e) {
        console.warn("Error stopping noise:", e);
      }
      this.noise = null;
    }
  }
  private updateLFOModulation() {
    const now = Tone.Transport.seconds;
    const lfo1Freq = Number(this.lfo1.frequency.value);
    const lfo2Freq = Number(this.lfo2.frequency.value);

    const lfo1Value = this.params.lfo1.active
      ? Math.sin(now * lfo1Freq * 2 * Math.PI)
      : 0;
    const lfo2Value = this.params.lfo2.active
      ? Math.sin(now * lfo2Freq * 2 * Math.PI)
      : 0;

    if (this.params.lfo1.active && this.params.lfo1.amount > 0) {
      const amount = this.params.lfo1.amount;

      switch (this.params.lfo1.destination) {
        case "cutoff":
          const cutoffMod = lfo1Value * amount * 500;
          const newCutoff = Math.max(
            20,
            Math.min(20000, this.baseCutoff + cutoffMod)
          );
          this.filter.frequency.value = newCutoff;
          break;
        case "osc1-freq":
          if (this.osc1) {
            const freqMod = lfo1Value * amount * 10;
            const newFreq = Math.max(20, this.baseOsc1Freq + freqMod);
            this.osc1.frequency.value = newFreq;
          }
          break;
        case "osc2-freq":
          if (this.osc2) {
            const freqMod = lfo1Value * amount * 10;
            const newFreq = Math.max(20, this.baseOsc2Freq + freqMod);
            this.osc2.frequency.value = newFreq;
          }
          break;
      }
    }

    if (
      this.params.lfo2.active &&
      this.params.lfo2.amount > 0 &&
      this.params.lfo2.destination !== this.params.lfo1.destination
    ) {
      const amount = this.params.lfo2.amount;

      switch (this.params.lfo2.destination) {
        case "cutoff":
          const cutoffMod = lfo2Value * amount * 500;
          const newCutoff = Math.max(
            20,
            Math.min(20000, this.baseCutoff + cutoffMod)
          );
          this.filter.frequency.value = newCutoff;
          break;
        case "osc1-freq":
          if (this.osc1) {
            const freqMod = lfo2Value * amount * 10;
            const newFreq = Math.max(20, this.baseOsc1Freq + freqMod);
            this.osc1.frequency.value = newFreq;
          }
          break;
        case "osc2-freq":
          if (this.osc2) {
            const freqMod = lfo2Value * amount * 10;
            const newFreq = Math.max(20, this.baseOsc2Freq + freqMod);
            this.osc2.frequency.value = newFreq;
          }
          break;
      }
    }
  }

  private applyLFOModulation() {
    this.baseCutoff = this.params.filter.cutoff;
  }

  updateParams(newParams: SynthParams) {
    this.params = newParams;

    if (this.osc1 && this.currentNote) {
      const osc1Waveform =
        newParams.osc1.waveform === "pulse"
          ? "square"
          : newParams.osc1.waveform;
      this.osc1.type = osc1Waveform as OscillatorType;

      const baseFreq =
        typeof this.currentNote === "string"
          ? Tone.Frequency(this.currentNote).toFrequency()
          : this.currentNote;
      const osc1Freq =
        baseFreq *
        Math.pow(2, newParams.osc1.frequency / 12) *
        Math.pow(2, newParams.osc1.fine / 1200);
      const clampedOsc1Freq = Math.max(20, osc1Freq);
      this.osc1.frequency.value = clampedOsc1Freq;
      this.baseOsc1Freq = clampedOsc1Freq;
    }

    const subOctaveLevel = newParams.osc1.subOctave / 99;
    this.subGain.gain.rampTo(subOctaveLevel * 0.7, 0.01);

    if (subOctaveLevel > 0 && !this.subOsc && this.currentNote) {
      const baseFreq =
        typeof this.currentNote === "string"
          ? Tone.Frequency(this.currentNote).toFrequency()
          : this.currentNote;
      const osc1Freq =
        baseFreq *
        Math.pow(2, newParams.osc1.frequency / 12) *
        Math.pow(2, newParams.osc1.fine / 1200);

      const clampedSubFreq = Math.max(10, osc1Freq / 2);
      this.subOsc = new Tone.Oscillator({
        type: "square",
        frequency: clampedSubFreq,
      });
      this.subOsc.connect(this.subGain);
      this.subOsc.start();
    } else if (this.subOsc && this.currentNote) {
      const baseFreq =
        typeof this.currentNote === "string"
          ? Tone.Frequency(this.currentNote).toFrequency()
          : this.currentNote;
      const osc1Freq =
        baseFreq *
        Math.pow(2, newParams.osc1.frequency / 12) *
        Math.pow(2, newParams.osc1.fine / 1200);
      // Ensure sub oscillator frequency is valid (minimum 10Hz)
      const clampedSubFreq = Math.max(10, osc1Freq / 2);
      this.subOsc.frequency.value = clampedSubFreq;
    }

    // Handle noise - create if needed, update level
    const noiseLevel = newParams.osc1.noise / 99; // Normalize to 0-1
    this.noiseGain.gain.rampTo(noiseLevel * 0.3, 0.01); // Scale for appropriate mix

    if (noiseLevel > 0 && !this.noise) {
      this.noise = new Tone.Noise({
        type: "white",
      });
      this.noise.connect(this.noiseGain);
      this.noise.start();
    }

    this.osc1Gain.gain.rampTo(0.5, 0.01);
    this.osc2Gain.gain.rampTo(newParams.osc2.mix, 0.01);

    if (this.osc2 && this.currentNote) {
      const osc2Waveform =
        newParams.osc2.waveform === "pulse"
          ? "square"
          : newParams.osc2.waveform;
      this.osc2.type = osc2Waveform as OscillatorType;

      // Update frequency with detuning and fine tuning
      const baseFreq =
        typeof this.currentNote === "string"
          ? Tone.Frequency(this.currentNote).toFrequency()
          : this.currentNote;
      const osc2Freq =
        baseFreq *
        Math.pow(2, newParams.osc2.frequency / 12) *
        Math.pow(2, newParams.osc2.fine / 1200);

      if (newParams.osc2.sync > 0.5 && this.osc1) {
        // Enhanced sync simulation
        const syncRatio = 2 + newParams.osc2.frequency / 6; // Create more harmonics
        const osc1Freq =
          baseFreq *
          Math.pow(2, newParams.osc1.frequency / 12) *
          Math.pow(2, newParams.osc1.fine / 1200);
        // Ensure synced frequency is valid (minimum 20Hz)
        const clampedSyncFreq = Math.max(20, osc1Freq * syncRatio);
        this.osc2.frequency.value = clampedSyncFreq;
        this.baseOsc2Freq = clampedSyncFreq;
      } else {
        // No sync, use normal frequency
        // Ensure frequency is valid (minimum 20Hz)
        const clampedOsc2Freq = Math.max(20, osc2Freq);
        this.osc2.frequency.value = clampedOsc2Freq;
        this.baseOsc2Freq = clampedOsc2Freq;
      }
    }

    this.filter.type = newParams.filter.type;
    this.filter.frequency.value = newParams.filter.cutoff;
    this.filter.Q.value = newParams.filter.resonance;

    this.baseCutoff = newParams.filter.cutoff;

    this.ampEnv.attack = newParams.ampEnv.attack;
    this.ampEnv.decay = newParams.ampEnv.decay;
    this.ampEnv.sustain = newParams.ampEnv.sustain;
    this.ampEnv.release = newParams.ampEnv.release;

    const lfo1FreqHz = 0.1 * Math.pow(10 / 0.1, newParams.lfo1.rate / 99);
    const lfo2FreqHz = 0.1 * Math.pow(10 / 0.1, newParams.lfo2.rate / 99);

    this.lfo1.frequency.rampTo(lfo1FreqHz, 0.1);
    this.lfo1.type = newParams.lfo1.waveform;
    this.lfo2.frequency.rampTo(lfo2FreqHz, 0.1);
    this.lfo2.type = newParams.lfo2.waveform;

    this.applyLFOModulation();
  }

  isActive(): boolean {
    return this.active;
  }

  connect(destination: Tone.InputNode) {
    this.output.connect(destination);
  }

  dispose() {
    // Clear any pending timeout
    if (this.stopTimeout) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }

    // Stop and dispose all oscillators
    if (this.osc1) {
      this.osc1.dispose();
      this.osc1 = null;
    }
    if (this.osc2) {
      this.osc2.dispose();
      this.osc2 = null;
    }
    if (this.subOsc) {
      this.subOsc.dispose();
      this.subOsc = null;
    }
    if (this.noise) {
      this.noise.dispose();
      this.noise = null;
    }

    // Dispose all gain stages
    this.osc1Gain.dispose();
    this.osc2Gain.dispose();
    this.subGain.dispose();
    this.noiseGain.dispose();
    this.mixerGain.dispose();

    // Dispose other components
    this.filter.dispose();
    this.ampEnv.dispose();
    this.lfo1.dispose();
    this.lfo2.dispose();
    this.lfoUpdateLoop.dispose();
    this.output.dispose();
  }
}
