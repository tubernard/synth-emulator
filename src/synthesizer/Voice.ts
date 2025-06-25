import * as Tone from "tone";
import type { SynthParams } from "./SynthEngine";

export class Voice {
  private osc1: Tone.Oscillator | null = null;
  private osc2: Tone.Oscillator | null = null;
  private subOsc: Tone.Oscillator | null = null;
  private noise: any = null; // Use 'any' type for Tone.Noise to avoid type issues
  private filter: Tone.Filter;
  private ampEnv: Tone.AmplitudeEnvelope;
  private lfo: Tone.LFO;
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

    // Create filter
    this.filter = new Tone.Filter({
      type: params.filter.type,
      frequency: params.filter.cutoff,
      Q: params.filter.resonance,
    });

    // Create envelopes
    this.ampEnv = new Tone.AmplitudeEnvelope({
      attack: params.ampEnv.attack,
      decay: params.ampEnv.decay,
      sustain: params.ampEnv.sustain,
      release: params.ampEnv.release,
    });

    // Create LFO
    this.lfo = new Tone.LFO({
      type: params.lfo.waveform,
      frequency: params.lfo.rate,
    });

    // Create gain stages
    this.osc1Gain = new Tone.Gain(0.5);
    this.osc2Gain = new Tone.Gain(params.osc2.mix * 0.5);
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

    // Start LFO
    this.lfo.start();
  }

  noteOn(note: string | number, velocity: number = 0.8) {
    try {
      // Cancel any pending stop timeout
      if (this.stopTimeout) {
        clearTimeout(this.stopTimeout);
        this.stopTimeout = null;
      }

      // Stop existing oscillators to prevent layering
      if (this.osc1 || this.osc2) {
        this.stopOscillators();
      }

      this.currentNote = note;
      this.active = true;

      // Convert note to frequency
      const frequency =
        typeof note === "string" ? Tone.Frequency(note).toFrequency() : note;

      // Calculate oscillator frequencies with detuning
      const osc1Freq =
        frequency *
        Math.pow(2, this.params.osc1.frequency / 12) *
        Math.pow(2, this.params.osc1.fine / 1200);

      const osc2Freq =
        frequency *
        Math.pow(2, this.params.osc2.frequency / 12) *
        Math.pow(2, this.params.osc2.fine / 1200);

      // Apply oscillator slop (random detuning) to osc2
      let slopDetune = 0;
      if (this.params.osc2.slop > 0) {
        const maxDetuneCents = 50;
        slopDetune =
          (Math.random() * 2 - 1) *
          maxDetuneCents *
          (this.params.osc2.slop / 100);
      }

      // Handle pulse waveform by using square wave
      const osc1Waveform =
        this.params.osc1.waveform === "pulse"
          ? "square"
          : this.params.osc1.waveform;
      const osc2Waveform =
        this.params.osc2.waveform === "pulse"
          ? "square"
          : this.params.osc2.waveform;

      // Create oscillators
      this.osc1 = new Tone.Oscillator({
        type: osc1Waveform as OscillatorType,
        frequency: osc1Freq,
      });

      this.osc2 = new Tone.Oscillator({
        type: osc2Waveform as OscillatorType,
        frequency: osc2Freq * Math.pow(2, slopDetune / 1200),
      });

      // Create sub oscillator if enabled
      if (this.params.osc1.subOctave > 0) {
        this.subOsc = new Tone.Oscillator({
          type: "square",
          frequency: osc1Freq / 2,
        });
        this.subOsc.connect(this.subGain);
        this.subOsc.start();
      }

      // Create noise generator if enabled
      if (this.params.osc1.noise > 0) {
        this.noise = new Tone.Noise({
          type: "white",
        });
        this.noise.connect(this.noiseGain);
        this.noise.start();
      }

      // Connect oscillators
      this.osc1.connect(this.osc1Gain);
      this.osc2.connect(this.osc2Gain);

      // Set up OSC2 sync if enabled
      if (this.params.osc2.sync > 0.5) {
        // Implement oscillator sync simulation
        if (this.osc1 && this.osc2) {
          const syncRatio = 2 + this.params.osc2.frequency / 6;
          this.osc2.frequency.value = osc1Freq * syncRatio;
        }
      }

      // Start oscillators
      this.osc1.start();
      this.osc2.start();

      // Trigger envelopes
      this.ampEnv.triggerAttack(Tone.now(), velocity);

      // Apply LFO modulation
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

      // Stop oscillators after release time
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

  private applyLFOModulation() {
    if (this.params.lfo.amount === 0) return;

    switch (this.params.lfo.destination) {
      case "pitch":
        if (this.osc1) this.lfo.connect(this.osc1.frequency);
        if (this.osc2) this.lfo.connect(this.osc2.frequency);
        break;
      case "filter":
        this.lfo.connect(this.filter.frequency);
        break;
      case "amp":
        // Connect to the amplitude envelope's gain
        this.lfo.connect(this.ampEnv);
        break;
    }
  }

  updateParams(newParams: SynthParams) {
    this.params = newParams;

    // Update oscillator waveforms and frequencies
    if (this.osc1 && this.currentNote) {
      // Update waveform (map pulse to square for Tone.js compatibility)
      const osc1Waveform =
        newParams.osc1.waveform === "pulse"
          ? "square"
          : newParams.osc1.waveform;
      this.osc1.type = osc1Waveform as OscillatorType;

      // Update frequency with detuning and fine tuning
      const baseFreq =
        typeof this.currentNote === "string"
          ? Tone.Frequency(this.currentNote).toFrequency()
          : this.currentNote;
      const osc1Freq =
        baseFreq *
        Math.pow(2, newParams.osc1.frequency / 12) *
        Math.pow(2, newParams.osc1.fine / 1200);
      this.osc1.frequency.value = osc1Freq;
    }

    // Handle sub oscillator - create if needed, update level
    const subOctaveLevel = newParams.osc1.subOctave / 99; // Normalize to 0-1
    this.subGain.gain.rampTo(subOctaveLevel * 0.7, 0.01); // Scale for appropriate mix

    if (subOctaveLevel > 0 && !this.subOsc && this.currentNote) {
      // Create sub osc if needed
      const baseFreq =
        typeof this.currentNote === "string"
          ? Tone.Frequency(this.currentNote).toFrequency()
          : this.currentNote;
      const osc1Freq =
        baseFreq *
        Math.pow(2, newParams.osc1.frequency / 12) *
        Math.pow(2, newParams.osc1.fine / 1200);

      this.subOsc = new Tone.Oscillator({
        type: "square", // Sub is typically a square wave
        frequency: osc1Freq / 2, // One octave down
      });
      this.subOsc.connect(this.subGain);
      this.subOsc.start();
    } else if (this.subOsc && this.currentNote) {
      // Update existing sub osc frequency
      const baseFreq =
        typeof this.currentNote === "string"
          ? Tone.Frequency(this.currentNote).toFrequency()
          : this.currentNote;
      const osc1Freq =
        baseFreq *
        Math.pow(2, newParams.osc1.frequency / 12) *
        Math.pow(2, newParams.osc1.fine / 1200);
      this.subOsc.frequency.value = osc1Freq / 2;
    }

    // Handle noise - create if needed, update level
    const noiseLevel = newParams.osc1.noise / 99; // Normalize to 0-1
    this.noiseGain.gain.rampTo(noiseLevel * 0.3, 0.01); // Scale for appropriate mix

    if (noiseLevel > 0 && !this.noise) {
      // Create noise generator if needed
      this.noise = new Tone.Noise({
        type: "white",
      });
      this.noise.connect(this.noiseGain);
      this.noise.start();
    }

    // Update oscillator mix
    this.osc1Gain.gain.rampTo(0.5, 0.01); // OSC1 is always at full level
    this.osc2Gain.gain.rampTo((newParams.osc2.mix / 99) * 0.5, 0.01); // OSC2 level controlled by mix

    if (this.osc2 && this.currentNote) {
      // Update waveform (map pulse to square for Tone.js compatibility)
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

      // Handle oscillator sync (OSC2 synced to OSC1)
      if (newParams.osc2.sync > 0.5 && this.osc1) {
        // Enhanced sync simulation
        const syncRatio = 2 + newParams.osc2.frequency / 6; // Create more harmonics
        const osc1Freq =
          baseFreq *
          Math.pow(2, newParams.osc1.frequency / 12) *
          Math.pow(2, newParams.osc1.fine / 1200);
        this.osc2.frequency.value = osc1Freq * syncRatio;
      } else {
        // No sync, use normal frequency
        this.osc2.frequency.value = osc2Freq;
      }
    }

    // Update filter
    this.filter.type = newParams.filter.type;
    this.filter.frequency.value = newParams.filter.cutoff;
    this.filter.Q.value = newParams.filter.resonance;

    // Update envelopes
    this.ampEnv.attack = newParams.ampEnv.attack;
    this.ampEnv.decay = newParams.ampEnv.decay;
    this.ampEnv.sustain = newParams.ampEnv.sustain;
    this.ampEnv.release = newParams.ampEnv.release;

    // Update LFO
    this.lfo.frequency.value = newParams.lfo.rate;
    this.lfo.type = newParams.lfo.waveform;
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
    this.lfo.dispose();
    this.output.dispose();
  }
}
