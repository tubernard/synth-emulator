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

    console.log(
      "Voice constructor: Initial filter cutoff:",
      params.filter.cutoff
    );

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
    this.osc1Gain = new Tone.Gain(0.5); // OSC1 level
    this.osc2Gain = new Tone.Gain(params.osc2.mix * 0.5); // OSC2 mix level
    this.subGain = new Tone.Gain(0); // Sub oscillator starts at 0
    this.noiseGain = new Tone.Gain(0); // Noise starts at 0
    this.mixerGain = new Tone.Gain(0.7); // Overall level (reduce to compensate for multiple sources)
    this.output = new Tone.Gain(1);

    console.log("Voice constructor - initial gain values:", {
      osc1: this.osc1Gain.gain.value,
      osc2: this.osc2Gain.gain.value,
      sub: this.subGain.gain.value,
      noise: this.noiseGain.gain.value,
    });

    // Connect the signal chain
    this.setupConnections();
  }

  private setupConnections() {
    // Signal chain: All sources -> MixerGain -> Filter -> Amp Envelope -> Output
    // Osc1 -> Osc1Gain -> MixerGain
    // Osc2 -> Osc2Gain -> MixerGain
    // SubOsc -> SubGain -> MixerGain
    // Noise -> NoiseGain -> MixerGain
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
      console.log(
        "Voice.noteOn called with:",
        note,
        "current active:",
        this.active,
        "currentNote:",
        this.currentNote
      );

      // Cancel any pending stop timeout
      if (this.stopTimeout) {
        clearTimeout(this.stopTimeout);
        this.stopTimeout = null;
      }

      // ALWAYS stop existing oscillators first to prevent layering
      if (this.osc1 || this.osc2) {
        console.log("Stopping existing oscillators before creating new ones");
        this.stopOscillators();
      }

      this.currentNote = note;
      this.active = true;

      // Convert note to frequency
      const frequency =
        typeof note === "string" ? Tone.Frequency(note).toFrequency() : note;

      // Set oscillator frequencies with detuning and fine tune adjustments
      const osc1Freq =
        frequency *
        Math.pow(2, this.params.osc1.frequency / 12) *
        Math.pow(2, this.params.osc1.fine / 1200);

      const osc2Freq =
        frequency *
        Math.pow(2, this.params.osc2.frequency / 12) *
        Math.pow(2, this.params.osc2.fine / 1200);

      // Apply slop (slight random detuning) to osc2 if enabled
      let slopDetune = 0;
      if (this.params.osc2.slop > 0) {
        // Maximum 50 cents of random detune based on slop amount
        const maxDetuneCents = 50;
        slopDetune =
          (Math.random() * 2 - 1) *
          maxDetuneCents *
          (this.params.osc2.slop / 100);
        console.log("Applied OSC2 slop:", slopDetune, "cents");
      }

      // Create oscillators for this note
      // Handle 'pulse' waveform by using 'square' with PWM
      const osc1Waveform =
        this.params.osc1.waveform === "pulse"
          ? "square"
          : this.params.osc1.waveform;
      const osc2Waveform =
        this.params.osc2.waveform === "pulse"
          ? "square"
          : this.params.osc2.waveform;

      // Create OSC1
      this.osc1 = new Tone.Oscillator({
        type: osc1Waveform as OscillatorType,
        frequency: osc1Freq,
      });

      // Create OSC2
      this.osc2 = new Tone.Oscillator({
        type: osc2Waveform as OscillatorType,
        frequency: osc2Freq * Math.pow(2, slopDetune / 1200), // Apply slop detune
      });

      // Create sub oscillator (one octave below OSC1) if level > 0
      if (this.params.osc1.subOctave > 0) {
        console.log(
          "Creating sub oscillator at level:",
          this.params.osc1.subOctave
        );
        this.subOsc = new Tone.Oscillator({
          type: "square", // Sub is typically a square wave
          frequency: osc1Freq / 2, // One octave down
        });
        this.subOsc.connect(this.subGain);
        this.subOsc.start();
      }

      // Create noise generator if noise level > 0
      if (this.params.osc1.noise > 0) {
        console.log(
          "Creating noise generator at level:",
          this.params.osc1.noise
        );
        this.noise = new Tone.Noise({
          type: "white",
        });
        this.noise.connect(this.noiseGain);
        this.noise.start();
      }

      // Connect oscillators to gain stages
      this.osc1.connect(this.osc1Gain);
      this.osc2.connect(this.osc2Gain);

      // Set up OSC2 sync if enabled
      if (this.params.osc2.sync > 0.5) {
        console.log("OSC2 sync enabled");

        // In Web Audio API, we can't directly perform oscillator hard sync like analog synths
        // We can implement a more accurate simulation by creating a sync effect:
        // 1. When sync is enabled, OSC1 controls the fundamental pitch
        // 2. OSC2 runs at a higher frequency but has its phase reset by OSC1

        if (this.osc1 && this.osc2) {
          // Adjust OSC2 to a higher frequency for more dramatic sync effect
          const syncRatio = 2 + this.params.osc2.frequency / 6; // Create more harmonics
          this.osc2.frequency.value = osc1Freq * syncRatio;

          // This would ideally connect to the sync input, but Web Audio doesn't directly support this
          // Instead we're doing a frequency relationship that mimics some sync characteristics
          console.log("Set up sync relationship between OSC1 and OSC2");
        }
      }

      // Start oscillators
      this.osc1.start();
      this.osc2.start();

      // Trigger envelopes (fresh attack)
      this.ampEnv.triggerAttack(Tone.now(), velocity);

      // Apply LFO modulation based on destination
      this.applyLFOModulation();
    } catch (error) {
      console.error("Error in noteOn:", error);
    }
  }

  noteOff() {
    try {
      console.log(
        "Voice.noteOff called, active:",
        this.active,
        "note:",
        this.currentNote
      );
      if (!this.active) return;

      this.active = false;

      // Trigger envelope releases
      this.ampEnv.triggerRelease(Tone.now());

      // Stop and dispose oscillators after release time
      const releaseTime = this.params.ampEnv.release;
      console.log("Scheduling oscillator stop in", releaseTime, "seconds");
      this.stopTimeout = window.setTimeout(() => {
        console.log("Stopping oscillators for note:", this.currentNote);
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
    // Stop sub oscillator if present
    if (this.subOsc) {
      try {
        this.subOsc.stop();
        this.subOsc.dispose();
      } catch (e) {
        console.warn("Error stopping subOsc:", e);
      }
      this.subOsc = null;
    }
    // Stop noise generator if present
    if (this.noise) {
      try {
        this.noise.stop();
        this.noise.dispose();
      } catch (e) {
        console.warn("Error stopping noise generator:", e);
      }
      this.noise = null;
    }
    // Stop noise generator if present
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
    console.log(
      "updateParams: Setting filter cutoff to",
      newParams.filter.cutoff
    );
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
