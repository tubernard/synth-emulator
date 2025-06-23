import "./style.css";
import { SynthEngine } from "./synthesizer/SynthEngine";
import { setupUI } from "./ui/interface";
import * as Tone from "tone";

// Initialize the synthesizer and start it automatically
const synth = new SynthEngine();

// Auto-start the synthesizer when page loads
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await Tone.start();
    await synth.start();
    console.log("Audio context started automatically");
  } catch (error) {
    console.error("Failed to start audio:", error);
  }
});

// Setup the Synthesizer Sim hardware interface matching the PNG exactly
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="synth-hardware"> <!-- Updated class name -->
    
    <!-- Top Row Controls -->
    <div class="top-row">
      
      <!-- Left Side Controls -->
      <div class="left-controls">
        <!-- Master Volume -->
        <div class="master-volume">
          <div class="knob-container">
            <label>MASTER VOLUME</label>
            <div class="knob large" id="master-volume" data-min="0" data-max="99" data-value="75" data-display-scale="percent"></div>
          </div>
        </div>
        
        <!-- Modulation Controls -->
        <div class="modulation-section">
          <h4>MODULATION</h4>
          <div class="mod-controls">
            <div class="knob-container">
              <label>POLY MOD</label>
              <div class="knob" id="poly-mod" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
            </div>
            <div class="mod-buttons">
              <button class="mod-btn">ASSIGN SOURCE</button>
              <button class="mod-btn">ASSIGN DEST</button>
              <button class="mod-btn">AMOUNT</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Center Controls - Digital Display Area -->
      <div class="center-controls">
        <div class="display-area">
          
          <div class="digital-display">
            <div class="display-screen" id="display-screen">
              <div class="parameter-name" id="param-name">CUTOFF</div>
              <div class="parameter-value" id="param-value">82</div>
              <div class="audio-visualization" id="waveform-viz"></div>
            </div>
          </div>
          
        </div>
      </div>

      <!-- Right Side - Synthesizer Sim Logo -->
      <div class="right-controls">
        <div class="logo-section">
          <div class="synth-logo">
            <span class="synth-text">SYNTHESIZER</span>
            <span class="emulator-text">EMULATOR</span>
            <!-- Updated logo elements -->
          </div>
        </div>
      </div>
    </div>

    <!-- Main Control Sections -->
    <div class="main-controls">
      
      <!-- Low Frequency Oscillators -->
      <div class="lfo-section section">
        <h3>LOW FREQUENCY OSCILLATORS</h3>
        <div class="lfo-grid">
          <!-- LFO 1 -->
          <div class="lfo-column">
            <div class="section-number">1</div>
            <div class="lfo-indicators">
              <div class="indicator-row">
                <span class="led"></span>
                <span class="led"></span>
                <span class="led"></span>
                <span class="led"></span>
              </div>
            </div>
            <div class="knob-row">
              <div class="knob-container">
                <label>RATE</label>
                <div class="knob" id="lfo1-rate" data-min="0" data-max="99" data-value="50" data-display-scale="percent"></div>
              </div>
              <div class="knob-container">
                <label>AMOUNT</label>
                <div class="knob" id="lfo1-amount" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
              </div>
            </div>
            <div class="lfo-buttons">
              <button class="lfo-btn">CLK SYNC</button>
              <button class="lfo-btn">KEY SYNC</button>
            </div>
          </div>
          
          <!-- LFO 2 -->
          <div class="lfo-column">
            <div class="section-number">2</div>
            <div class="lfo-indicators">
              <div class="indicator-row">
                <span class="led"></span>
                <span class="led"></span>
                <span class="led"></span>
                <span class="led"></span>
              </div>
            </div>
            <div class="knob-row">
              <div class="knob-container">
                <label>RATE</label>
                <div class="knob" id="lfo2-rate" data-min="0" data-max="99" data-value="50" data-display-scale="percent"></div>
              </div>
              <div class="knob-container">
                <label>AMOUNT</label>
                <div class="knob" id="lfo2-amount" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
              </div>
            </div>
            <div class="lfo-buttons">
              <button class="lfo-btn">CLK SYNC</button>
              <button class="lfo-btn">KEY SYNC</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Sequencer/Arpeggiator -->
      <div class="sequencer-section section">
        <h3>SEQUENCER / ARPEGGIATOR</h3>
        <div class="seq-controls">
          <div class="knob-row">
            <div class="knob-container">
              <label>TEMPO</label>
              <div class="knob" id="seq-tempo" data-min="30" data-max="250" data-value="120" data-display-scale="bpm"></div>
            </div>
          </div>
          <div class="seq-buttons">
            <button class="seq-btn">ON/OFF</button>
            <button class="seq-btn">LATCH</button>
            <button class="seq-btn">RESET</button>
            <button class="seq-btn">UP</button>
            <button class="seq-btn">DOWN</button>
            <button class="seq-btn">UP/DOWN</button>
            <button class="seq-btn">RANDOM</button>
            <button class="seq-btn">AS PLAYED</button>
          </div>
        </div>
      </div>

      <!-- Oscillators -->
      <div class="oscillators-section section">
        <h3>OSCILLATORS</h3>
        <div class="osc-grid">
          <!-- OSC 1 -->
          <div class="osc-column">
            <div class="section-number">1</div>
            <div class="waveform-indicators">
              <div class="wave-indicator sawtooth active">■</div>
              <div class="wave-indicator triangle">▲</div>
              <div class="wave-indicator square">⬜</div>
              <div class="wave-indicator pulse">⬛</div>
            </div>
            <div class="knob-row">
              <div class="knob-container">
                <label>FREQ</label>
                <div class="knob" id="osc1-freq" data-min="-24" data-max="24" data-value="0" data-display-scale="semitones"></div>
              </div>
              <div class="knob-container">
                <label>FINE</label>
                <div class="knob" id="osc1-fine" data-min="-50" data-max="50" data-value="0" data-display-scale="cents"></div>
              </div>
              <div class="knob-container">
                <label>SHAPE</label>
                <div class="knob" id="osc1-shape" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
              </div>
            </div>
            <div class="osc-buttons">
              <button class="osc-btn">SHAPE MOD</button>
              <button class="osc-btn">SUB OCT</button>
            </div>
          </div>
          
          <!-- OSC 2 -->
          <div class="osc-column">
            <div class="section-number">2</div>
            <div class="waveform-indicators">
              <div class="wave-indicator sawtooth active">■</div>
              <div class="wave-indicator triangle">▲</div>
              <div class="wave-indicator square">⬜</div>
              <div class="wave-indicator pulse">⬛</div>
            </div>
            <div class="knob-row">
              <div class="knob-container">
                <label>FREQ</label>
                <div class="knob" id="osc2-freq" data-min="-24" data-max="24" data-value="0" data-display-scale="semitones"></div>
              </div>
              <div class="knob-container">
                <label>FINE</label>
                <div class="knob" id="osc2-fine" data-min="-50" data-max="50" data-value="0" data-display-scale="cents"></div>
              </div>
              <div class="knob-container">
                <label>SHAPE</label>
                <div class="knob" id="osc2-shape" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
              </div>
            </div>
            <div class="osc-buttons">
              <button class="osc-btn">SHAPE MOD</button>
              <button class="osc-btn">OSC MIX</button>
              <button class="osc-btn">OSC SLOP</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Low-Pass Filter -->
      <div class="filter-section section">
        <h3>LOW-PASS FILTER</h3>
        <div class="filter-controls">
          <div class="knob-row">
            <div class="knob-container">
              <label>CUTOFF</label>
              <div class="knob" id="filter-cutoff" data-min="0" data-max="164" data-value="82" data-display-scale="filter-cutoff"></div>
            </div>
            <div class="knob-container">
              <label>RESONANCE</label>
              <div class="knob" id="filter-resonance" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
            </div>
            <div class="knob-container">
              <label>VELOCITY</label>
              <div class="knob" id="filter-velocity" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
            </div>
            <div class="knob-container">
              <label>KEY AMT</label>
              <div class="knob" id="filter-key-amount" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
            </div>
            <div class="knob-container">
              <label>AUDIO MOD</label>
              <div class="knob" id="filter-audio-mod" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
            </div>
          </div>
          <div class="filter-buttons">
            <button class="filter-btn active" data-type="lowpass">2 POLE</button>
            <button class="filter-btn" data-type="highpass">4 POLE</button>
          </div>
        </div>
      </div>

      <!-- Envelopes -->
      <div class="envelopes-section section">
        <h3>ENVELOPES</h3>
        <div class="env-grid">
          <!-- Filter Envelope -->
          <div class="env-column">
            <div class="section-number">FILTER</div>
            <div class="knob-row">
              <div class="knob-container">
                <label>ATTACK</label>
                <div class="knob" id="filter-attack" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
              </div>
              <div class="knob-container">
                <label>DECAY</label>
                <div class="knob" id="filter-decay" data-min="0" data-max="99" data-value="30" data-display-scale="percent"></div>
              </div>
              <div class="knob-container">
                <label>SUSTAIN</label>
                <div class="knob" id="filter-sustain" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
              </div>
              <div class="knob-container">
                <label>RELEASE</label>
                <div class="knob" id="filter-release" data-min="0" data-max="99" data-value="30" data-display-scale="percent"></div>
              </div>
            </div>
            <div class="knob-row">
              <div class="knob-container">
                <label>ENV AMT</label>
                <div class="knob" id="filter-env-amount" data-min="-99" data-max="99" data-value="0" data-display-scale="bipolar"></div>
              </div>
            </div>
          </div>
          
          <!-- Amplifier Envelope -->
          <div class="env-column">
            <div class="section-number">AMP</div>
            <div class="knob-row">
              <div class="knob-container">
                <label>ATTACK</label>
                <div class="knob" id="amp-attack" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
              </div>
              <div class="knob-container">
                <label>DECAY</label>
                <div class="knob" id="amp-decay" data-min="0" data-max="99" data-value="30" data-display-scale="percent"></div>
              </div>
              <div class="knob-container">
                <label>SUSTAIN</label>
                <div class="knob" id="amp-sustain" data-min="0" data-max="99" data-value="70" data-display-scale="percent"></div>
              </div>
              <div class="knob-container">
                <label>RELEASE</label>
                <div class="knob" id="amp-release" data-min="0" data-max="99" data-value="50" data-display-scale="percent"></div>
              </div>
            </div>
            <div class="knob-row">
              <div class="knob-container">
                <label>VELOCITY</label>
                <div class="knob" id="amp-velocity" data-min="0" data-max="99" data-value="50" data-display-scale="percent"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Virtual Keyboard for Testing -->
    <div class="keyboard-section">
      <div class="keyboard" id="keyboard"></div>
    </div>
  </div>
`;

// Initialize the interface
setupUI(synth);
