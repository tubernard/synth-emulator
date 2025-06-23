import * as Tone from "tone";
import type { SynthParams } from "./SynthEngine";

export class Voice {
  private osc1: Tone.Oscillator | null = null;
  private osc2: Tone.Oscillator | null = null;
  private filter: Tone.Filter;
  private ampEnv: Tone.AmplitudeEnvelope;
  private lfo: Tone.LFO;
  private gain: Tone.Gain;
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
    this.gain = new Tone.Gain(0.5);
    this.output = new Tone.Gain(1);

    // Connect the signal chain
    this.setupConnections();
  }

  private setupConnections() {
    // Signal chain: Gain -> Filter -> Amp Envelope -> Output
    this.gain.connect(this.filter);
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

      // Set oscillator frequencies with detuning
      const osc1Freq = frequency * Math.pow(2, this.params.osc1.frequency / 12);
      const osc2Freq = frequency * Math.pow(2, this.params.osc2.frequency / 12);

      // Create new oscillators for this note
      this.osc1 = new Tone.Oscillator({
        type: this.params.osc1.waveform,
        frequency: osc1Freq,
      });

      this.osc2 = new Tone.Oscillator({
        type: this.params.osc2.waveform,
        frequency: osc2Freq,
      });

      // Connect oscillators to gain
      this.osc1.connect(this.gain);
      this.osc2.connect(this.gain);

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

    // Update oscillators
    if (this.osc1) this.osc1.type = newParams.osc1.waveform;
    if (this.osc2) this.osc2.type = newParams.osc2.waveform;

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

    if (this.osc1) {
      this.osc1.dispose();
      this.osc1 = null;
    }
    if (this.osc2) {
      this.osc2.dispose();
      this.osc2 = null;
    }
    this.filter.dispose();
    this.ampEnv.dispose();
    this.lfo.dispose();
    this.gain.dispose();
    this.output.dispose();
  }
}
