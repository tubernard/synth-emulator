import * as Tone from "tone";
import { Voice } from "./Voice.ts";
import { Effects } from "./Effects.ts";

export type ProphetWaveform = OscillatorType | "pulse";

export interface SynthParams {
  osc1: {
    frequency: number;
    fine: number;
    waveform: ProphetWaveform;
    shape: number;
    shapeMod: number;
    subOctave: number;
    noise: number;
  };
  osc2: {
    frequency: number;
    fine: number;
    waveform: ProphetWaveform;
    shape: number;
    shapeMod: number;
    slop: number;
    sync: number;
    mix: number;
  };
  filter: {
    cutoff: number;
    resonance: number;
    type: BiquadFilterType;
  };
  ampEnv: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  lfo1: {
    rate: number;
    amount: number;
    destination: "cutoff" | "osc1-freq" | "osc2-freq";
    waveform: OscillatorType;
    active: boolean;
  };
  lfo2: {
    rate: number;
    amount: number;
    destination: "cutoff" | "osc1-freq" | "osc2-freq";
    waveform: OscillatorType;
    active: boolean;
  };
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
  private volumeAnalyzer: Tone.Analyser;
  private effects: Effects;

  public params: SynthParams = {
    osc1: {
      frequency: 0,
      fine: 0,
      waveform: "sawtooth",
      shape: 0,
      shapeMod: 0,
      subOctave: 0,
      noise: 0,
    },
    osc2: {
      frequency: 0,
      fine: 0,
      waveform: "sawtooth",
      shape: 0,
      shapeMod: 0,
      slop: 0,
      sync: 0,
      mix: 0.5,
    },
    filter: {
      cutoff: 632,
      resonance: 0,
      type: "lowpass",
    },
    ampEnv: {
      attack: 0.1,
      decay: 0.3,
      sustain: 0.7,
      release: 1.0,
    },
    lfo1: {
      rate: 1,
      amount: 0,
      destination: "cutoff",
      waveform: "sine",
      active: false,
    },
    lfo2: {
      rate: 1,
      amount: 0,
      destination: "cutoff",
      waveform: "sine",
      active: false,
    },
    effects: {
      reverb: 0.2,
      delay: 0,
      chorus: 0,
    },
  };

  constructor() {
    this.masterVolume = new Tone.Volume(-6);
    this.volumeAnalyzer = new Tone.Analyser({
      type: "waveform",
      size: 512,
      smoothing: 0.8,
    });
    this.effects = new Effects();

    this.effects.connect(this.masterVolume);
    this.masterVolume.connect(this.volumeAnalyzer);
    this.volumeAnalyzer.toDestination();

    if (Tone.Transport.state !== "started") {
      Tone.Transport.start();
    }

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
      await Tone.start();
    } catch (error) {
      console.error("Failed to start audio context:", error);
    }
  }

  noteOn(note: string | number, velocity: number = 0.8) {
    try {
      const existingVoice = this.voices.find(
        (v) => v.currentNote === note && v.isActive()
      );
      if (existingVoice) {
        existingVoice.noteOff();
      }

      let voice = this.voices.find((v) => !v.isActive());

      if (!voice) {
        voice = this.voices[this.currentVoice];
        this.currentVoice = (this.currentVoice + 1) % this.maxVoices;
      }

      voice.noteOn(note, velocity);
    } catch (error) {
      console.error("Error playing note:", error);
    }
  }

  noteOff(note: string | number) {
    try {
      const voice = this.voices.find(
        (v) => v.currentNote === note && v.isActive()
      );
      if (voice) {
        voice.noteOff();
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
            (this.params.filter as any)[param] = value;
          }
          break;
        case "ampEnv":
          if (param in this.params.ampEnv) {
            (this.params.ampEnv as any)[param] = value;
          }
          break;
        case "lfo1":
          if (param in this.params.lfo1) {
            (this.params.lfo1 as any)[param] = value;
          }
          break;
        case "lfo2":
          if (param in this.params.lfo2) {
            (this.params.lfo2 as any)[param] = value;
          }
          break;
        case "effects":
          if (param in this.params.effects) {
            (this.params.effects as any)[param] = value;
            this.effects.updateParameter(param, value as number);
          }
          break;
        case "master":
          if (param === "volume") {
            const gain = (value as number) / 99;
            this.setMasterVolume(gain);
          }
          break;
      }

      this.voices.forEach((voice) => voice.updateParams(this.params));
    } catch (error) {
      console.error("Error updating parameter:", error);
    }
  }

  hasActiveVoices(): boolean {
    return this.voices.some((v) => v.isActive());
  }

  getAnalyzer(): Tone.Analyser {
    return this.effects.analyzer;
  }

  getVolumeAnalyzer(): Tone.Analyser {
    return this.volumeAnalyzer;
  }

  getParameter(section: string, param: string): number | string {
    try {
      switch (section) {
        case "oscillator1":
          if (param === "waveform") return this.params.osc1.waveform;
          if (param === "shape") return this.params.osc1.shape;
          if (param === "subOctave") return this.params.osc1.subOctave;
          if (param === "noise") return this.params.osc1.noise;
          break;
        case "oscillator2":
          if (param === "waveform") return this.params.osc2.waveform;
          if (param === "shape") return this.params.osc2.shape;
          if (param === "sync") return this.params.osc2.sync;
          if (param === "mix") return this.params.osc2.mix;
          break;
        case "filter":
          if (param === "cutoff") {
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
          if (param === "osc1Level") return 0.7;
          if (param === "osc2Level") return 0.3;
          break;
      }
      return 0;
    } catch (error) {
      console.error("Error getting parameter:", error);
      return 0;
    }
  }

  setMasterVolume(volume: number) {
    const dbValue = -40 + volume * 46;
    this.masterVolume.volume.value = dbValue;
  }

  dispose() {
    this.voices.forEach((voice) => voice.dispose());
    this.effects.dispose();
    this.masterVolume.dispose();
    this.volumeAnalyzer.dispose();
  }
}
