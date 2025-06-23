import * as Tone from "tone";
import { Voice } from "./Voice.ts";
import { Effects } from "./Effects.ts";

export interface SynthParams {
  // Oscillator parameters
  osc1: {
    frequency: number;
    waveform: OscillatorType;
    shape: number;
    sub: number;
  };
  osc2: {
    frequency: number;
    waveform: OscillatorType;
    shape: number;
    sync: number;
  };
  // Filter parameters
  filter: {
    cutoff: number;
    resonance: number;
    type: BiquadFilterType;
  };
  // Envelope parameters
  ampEnv: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  // LFO parameters
  lfo: {
    rate: number;
    amount: number;
    destination: "pitch" | "filter" | "amp";
    waveform: OscillatorType;
  };
  // Effects parameters
  effects: {
    reverb: number;
    delay: number;
    chorus: number;
  };
}

export class SynthEngine {
  private voices: Voice[] = [];
  private maxVoices = 8;
  private currentVoice = 0;
  private masterVolume: Tone.Volume;
  private effects: Effects;

  public params: SynthParams = {
    osc1: {
      frequency: 0,
      waveform: "sawtooth",
      shape: 0,
      sub: 0,
    },
    osc2: {
      frequency: 0,
      waveform: "sawtooth",
      shape: 0,
      sync: 0,
    },
    filter: {
      cutoff: 632, // ~0.5 position on logarithmic scale (20Hz to 20kHz)
      resonance: 0,
      type: "lowpass",
    },
    ampEnv: {
      attack: 0.1,
      decay: 0.3,
      sustain: 0.7,
      release: 1.0,
    },
    lfo: {
      rate: 1,
      amount: 0,
      destination: "pitch",
      waveform: "sine",
    },
    effects: {
      reverb: 0.2,
      delay: 0,
      chorus: 0,
    },
  };

  constructor() {
    this.masterVolume = new Tone.Volume(-6).toDestination();
    this.effects = new Effects();
    this.effects.connect(this.masterVolume);

    // Initialize voices
    this.initializeVoices();
  }

  private initializeVoices() {
    for (let i = 0; i < this.maxVoices; i++) {
      const voice = new Voice(this.params);
      voice.connect(this.effects.input);
      this.voices.push(voice);
    }
  }

  async start() {
    try {
      console.log("Starting Tone.js context...");
      console.log("Context state before start:", Tone.getContext().state);
      await Tone.start();
      console.log("Context state after start:", Tone.getContext().state);
      console.log("Audio context started successfully");
    } catch (error) {
      console.error("Failed to start audio context:", error);
    }
  }

  noteOn(note: string | number, velocity: number = 0.8) {
    try {
      console.log("SynthEngine.noteOn called with:", note, velocity);

      // First check if this note is already playing and stop it
      const existingVoice = this.voices.find(
        (v) => v.currentNote === note && v.isActive()
      );
      if (existingVoice) {
        console.log("Stopping existing voice for same note");
        existingVoice.noteOff();
      }

      // Find an available voice or steal the oldest one
      let voice = this.voices.find((v) => !v.isActive());

      if (!voice) {
        voice = this.voices[this.currentVoice];
        this.currentVoice = (this.currentVoice + 1) % this.maxVoices;
        console.log("Stealing voice:", this.currentVoice - 1);
      }

      console.log("Using voice:", voice);
      voice.noteOn(note, velocity);
    } catch (error) {
      console.error("Error playing note:", error);
    }
  }

  noteOff(note: string | number) {
    try {
      console.log("SynthEngine.noteOff called with:", note);
      // Find the voice playing this note
      const voice = this.voices.find(
        (v) => v.currentNote === note && v.isActive()
      );
      if (voice) {
        console.log("Found voice to stop:", voice);
        voice.noteOff();
      } else {
        console.log("No active voice found for note:", note);
      }
    } catch (error) {
      console.error("Error stopping note:", error);
    }
  }

  allNotesOff() {
    this.voices.forEach((voice) => voice.noteOff());
  }

  updateParameter(section: string, param: string, value: number | string) {
    try {
      console.log("SynthEngine.updateParameter:", section, param, value);

      switch (section) {
        case "osc1":
          if (param in this.params.osc1) {
            (this.params.osc1 as any)[param] = value;
          }
          break;
        case "osc2":
          if (param in this.params.osc2) {
            (this.params.osc2 as any)[param] = value;
          }
          break;
        case "filter":
          if (param in this.params.filter) {
            console.log(
              "Updating filter parameter:",
              param,
              "from",
              (this.params.filter as any)[param],
              "to",
              value
            );
            (this.params.filter as any)[param] = value;
          }
          break;
        case "ampEnv":
          if (param in this.params.ampEnv) {
            (this.params.ampEnv as any)[param] = value;
          }
          break;
        case "lfo":
          if (param in this.params.lfo) {
            (this.params.lfo as any)[param] = value;
          }
          break;
        case "effects":
          if (param in this.params.effects) {
            (this.params.effects as any)[param] = value;
            this.effects.updateParameter(param, value as number);
          }
          break;
      }

      // Update all voices with new parameters
      this.voices.forEach((voice) => voice.updateParams(this.params));
    } catch (error) {
      console.error("Error updating parameter:", error);
    }
  }

  // Method to check if any notes are currently playing
  hasActiveVoices(): boolean {
    return this.voices.some((v) => v.isActive());
  }

  // Get the analyzer node for spectrum visualization
  getAnalyzer(): Tone.Analyser {
    return this.effects.analyzer;
  }

  // Get parameter value - used for waveform visualization
  getParameter(section: string, param: string): number | string {
    try {
      switch (section) {
        case "oscillator1":
          if (param === "waveform") return this.params.osc1.waveform;
          if (param === "shape") return this.params.osc1.shape;
          if (param === "sub") return this.params.osc1.sub;
          break;
        case "oscillator2":
          if (param === "waveform") return this.params.osc2.waveform;
          if (param === "shape") return this.params.osc2.shape;
          if (param === "sync") return this.params.osc2.sync;
          break;
        case "filter":
          if (param === "cutoff") {
            // Convert the frequency value to a 0-1 range
            const min = 20;
            const max = 20000;
            const freq = this.params.filter.cutoff;
            return (
              (Math.log(freq) - Math.log(min)) / (Math.log(max) - Math.log(min))
            );
          }
          if (param === "resonance") return this.params.filter.resonance;
          if (param === "type") return this.params.filter.type;
          break;
        case "mixer":
          if (param === "osc1Level") return 0.7; // Default value (not stored in params yet)
          if (param === "osc2Level") return 0.3; // Default value (not stored in params yet)
          break;
      }
      return 0;
    } catch (error) {
      console.error("Error getting parameter:", error);
      return 0;
    }
  }

  setMasterVolume(volume: number) {
    this.masterVolume.volume.value = Tone.gainToDb(volume);
  }

  dispose() {
    this.voices.forEach((voice) => voice.dispose());
    this.effects.dispose();
    this.masterVolume.dispose();
  }
}
