import * as Tone from "tone";

export class Effects {
  public input: Tone.Gain;
  private output: Tone.Gain;
  private reverb: Tone.Reverb;
  private delay: Tone.PingPongDelay;
  private chorus: Tone.Chorus;
  private reverbSend: Tone.Gain;
  private delaySend: Tone.Gain;
  private chorusSend: Tone.Gain;
  public analyzer: Tone.Analyser;
  public volumeAnalyzer: Tone.Analyser;

  constructor() {
    this.input = new Tone.Gain(1);
    this.output = new Tone.Gain(1);

    this.reverb = new Tone.Reverb({
      decay: 2,
      preDelay: 0.01,
    });

    this.delay = new Tone.PingPongDelay({
      delayTime: "8n",
      feedback: 0.3,
      wet: 0.5,
    });

    this.chorus = new Tone.Chorus({
      frequency: 2,
      delayTime: 10,
      depth: 0.5,
      spread: 180,
    });

    this.reverbSend = new Tone.Gain(0.2);
    this.delaySend = new Tone.Gain(0);
    this.chorusSend = new Tone.Gain(0);

    this.analyzer = new Tone.Analyser({
      type: "fft",
      size: 64,
      smoothing: 0.8,
    });

    this.volumeAnalyzer = new Tone.Analyser({
      type: "waveform",
      size: 128,
      smoothing: 0.9,
    });

    this.setupRouting();
  }

  private setupRouting() {
    this.input.connect(this.output);

    this.input.connect(this.reverbSend);
    this.reverbSend.connect(this.reverb);
    this.reverb.connect(this.output);

    this.input.connect(this.delaySend);
    this.delaySend.connect(this.delay);
    this.delay.connect(this.output);

    this.input.connect(this.chorusSend);
    this.chorusSend.connect(this.chorus);
    this.chorus.connect(this.output);

    this.output.connect(this.analyzer);
    this.output.connect(this.volumeAnalyzer);

    this.chorus.start();
  }

  updateParameter(param: string, value: number) {
    switch (param) {
      case "reverb":
        this.reverbSend.gain.value = value;
        break;
      case "delay":
        this.delaySend.gain.value = value;
        break;
      case "chorus":
        this.chorusSend.gain.value = value;
        break;
    }
  }

  connect(destination: Tone.InputNode) {
    this.output.connect(destination);
  }

  dispose() {
    this.input.dispose();
    this.output.dispose();
    this.reverb.dispose();
    this.delay.dispose();
    this.chorus.dispose();
    this.reverbSend.dispose();
    this.delaySend.dispose();
    this.chorusSend.dispose();
    this.analyzer.dispose();
    this.volumeAnalyzer.dispose();
  }
}
