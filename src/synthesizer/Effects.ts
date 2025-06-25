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
  public analyzer: Tone.Analyser; // Spectrum analyzer for visualization
  public volumeAnalyzer: Tone.Analyser; // Waveform analyzer for volume metering

  constructor() {
    // Create input/output
    this.input = new Tone.Gain(1);
    this.output = new Tone.Gain(1);

    // Create effects
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

    // Create send controls
    this.reverbSend = new Tone.Gain(0.2);
    this.delaySend = new Tone.Gain(0);
    this.chorusSend = new Tone.Gain(0);

    // Create analyzer for spectrum visualization
    this.analyzer = new Tone.Analyser({
      type: "fft",
      size: 64,
      smoothing: 0.8,
    });

    // Create analyzer for volume metering (waveform)
    this.volumeAnalyzer = new Tone.Analyser({
      type: "waveform",
      size: 128,
      smoothing: 0.9,
    });

    // Setup signal routing
    this.setupRouting();
  }

  private setupRouting() {
    // Dry signal path
    this.input.connect(this.output);

    // Reverb send
    this.input.connect(this.reverbSend);
    this.reverbSend.connect(this.reverb);
    this.reverb.connect(this.output);

    // Delay send
    this.input.connect(this.delaySend);
    this.delaySend.connect(this.delay);
    this.delay.connect(this.output);

    // Chorus send (insert effect)
    this.input.connect(this.chorusSend);
    this.chorusSend.connect(this.chorus);
    this.chorus.connect(this.output);

    // Connect analyzers to output
    this.output.connect(this.analyzer);
    this.output.connect(this.volumeAnalyzer);

    // Start chorus
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
