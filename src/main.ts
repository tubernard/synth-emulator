import "./style.css";
import { SynthEngine } from "./synthesizer/SynthEngine";
import { setupUI } from "./ui/interface";
import * as Tone from "tone";

const synth = new SynthEngine();

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await Tone.start();
    await synth.start();
  } catch (error) {
    console.error("Failed to start audio:", error);
  }
});

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="synth-hardware">
    
    <!-- Top Row Controls -->
    <div class="top-row">
      
      <!-- Left Side Controls -->
      <div class="left-controls">
        <!-- Master Volume -->
        <div class="master-volume">
          <div class="knob-container">
            <div class="knob large" id="master-volume" data-min="0" data-max="99" data-value="75" data-display-scale="percent"></div>
            <label>MASTER VOLUME</label>
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

      <!-- Column 1: Volume Meter -->
      <div class="column-1">
        <div class="volume-meter-section section">
          <h3>VOLUME METER</h3>
          <div class="volume-meter-container">
            <div class="volume-display">
              <div class="volume-screen" id="volume-screen">
                <div class="volume-meter-container-inner">
                  <div class="volume-meter-fluid" id="volume-meter-fluid">
                    <div class="volume-bars-container" id="volume-bars-container">
                      <div class="volume-bar" data-level="20"></div>
                      <div class="volume-bar" data-level="19"></div>
                      <div class="volume-bar" data-level="18"></div>
                      <div class="volume-bar" data-level="17"></div>
                      <div class="volume-bar" data-level="16"></div>
                      <div class="volume-bar" data-level="15"></div>
                      <div class="volume-bar" data-level="14"></div>
                      <div class="volume-bar" data-level="13"></div>
                      <div class="volume-bar" data-level="12"></div>
                      <div class="volume-bar" data-level="11"></div>
                      <div class="volume-bar" data-level="10"></div>
                      <div class="volume-bar" data-level="9"></div>
                      <div class="volume-bar" data-level="8"></div>
                      <div class="volume-bar" data-level="7"></div>
                      <div class="volume-bar" data-level="6"></div>
                      <div class="volume-bar" data-level="5"></div>
                      <div class="volume-bar" data-level="4"></div>
                      <div class="volume-bar" data-level="3"></div>
                      <div class="volume-bar" data-level="2"></div>
                      <div class="volume-bar" data-level="1"></div>
                    </div>
                    <div class="volume-scale-marks">
                      <div class="scale-mark" data-db="0"></div>
                      <div class="scale-mark" data-db="-6"></div>
                      <div class="scale-mark" data-db="-12"></div>
                      <div class="scale-mark" data-db="-18"></div>
                      <div class="scale-mark" data-db="-24"></div>
                      <div class="scale-mark" data-db="-30"></div>
                      <div class="scale-mark" data-db="-40"></div>
                    </div>
                  </div>
                  <div class="volume-labels">
                    <span class="volume-label">0</span>
                    <span class="volume-label">-12</span>
                    <span class="volume-label">-24</span>
                    <span class="volume-label">-40</span>
                    <span class="volume-label">-∞</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="volume-status">
              <div class="status-led" id="audio-status-led"></div>
              <label>AUDIO</label>
            </div>
          </div>
        </div>
      </div>

      <!-- Column 2: Oscillators, LFO, and Sequencer -->
      <div class="column-2">
        <!-- Oscillators Section -->
        <div class="oscillators-section section">
        <h3>OSCILLATORS</h3>
        <div class="osc-grid">
          <!-- OSC 1 Row -->
          <div class="osc-row">
            <!-- OSC 1 Controls Row -->
            <div class="osc-controls-row">
              <div class="knob-container">
                <div class="knob" id="osc1-freq" data-min="-24" data-max="24" data-value="0" data-display-scale="semitones"></div>
                <label>OSC 1 FREQ</label>
              </div>
              <div class="knob-container">
                <div class="knob" id="osc1-fine" data-min="-50" data-max="50" data-value="0" data-display-scale="cents"></div>
                <label>FINE TUNE</label>
              </div>
              
              <!-- SHAPE Button and Waveform LEDs - Centered Column -->
              <div class="shape-waveform-centered">
                <div class="shape-control">
                  <button class="shape-btn" id="osc1-shape-btn" data-osc="osc1" data-current-wave="sawtooth">
                    <div class="shape-btn-inner"></div>
                  </button>
                  <label>SHAPE</label>
                </div>
                <div class="waveform-leds-vertical">
                  <div class="led-indicator sawtooth active" data-osc="osc1" data-wave="sawtooth">
                    <div class="led-square"></div>
                    <label>SAWTOOTH</label>
                  </div>
                  <div class="led-indicator triangle" data-osc="osc1" data-wave="triangle">
                    <div class="led-square"></div>
                    <label>TRIANGLE</label>
                  </div>
                  <div class="led-indicator square" data-osc="osc1" data-wave="square">
                    <div class="led-square"></div>
                    <label>SQUARE</label>
                  </div>
                  <div class="led-indicator pulse" data-osc="osc1" data-wave="pulse">
                    <div class="led-square"></div>
                    <label>PULSE</label>
                  </div>
                </div>
              </div>
              
              <div class="knob-container">
                <div class="knob" id="osc1-shape-mod" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
                <label>SHAPE MOD</label>
              </div>
              <div class="knob-container">
                <div class="knob" id="osc1-sub-octave" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
                <label>SUB OCTAVE</label>
              </div>
              <div class="knob-container">
                <div class="knob" id="osc1-noise" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
                <label>NOISE</label>
              </div>
            </div>
          </div>
          
          <!-- OSC 2 Row -->
          <div class="osc-row">
            <!-- OSC 2 Controls Row -->
            <div class="osc-controls-row">
              <div class="knob-container">
                <div class="knob" id="osc2-freq" data-min="-24" data-max="24" data-value="0" data-display-scale="semitones"></div>
                <label>OSC 2 FREQ</label>
              </div>
              <div class="knob-container">
                <div class="knob" id="osc2-fine" data-min="-50" data-max="50" data-value="0" data-display-scale="cents"></div>
                <label>FINE TUNE</label>
              </div>
              
              <!-- SHAPE Button and Waveform LEDs - Centered Column -->
              <div class="shape-waveform-centered">
                <div class="shape-control">
                  <button class="shape-btn" id="osc2-shape-btn" data-osc="osc2" data-current-wave="sawtooth">
                    <div class="shape-btn-inner"></div>
                  </button>
                  <label>SHAPE</label>
                </div>
                <div class="waveform-leds-vertical">
                  <div class="led-indicator sawtooth active" data-osc="osc2" data-wave="sawtooth">
                    <div class="led-square"></div>
                    <label>SAWTOOTH</label>
                  </div>
                  <div class="led-indicator triangle" data-osc="osc2" data-wave="triangle">
                    <div class="led-square"></div>
                    <label>TRIANGLE</label>
                  </div>
                  <div class="led-indicator square" data-osc="osc2" data-wave="square">
                    <div class="led-square"></div>
                    <label>SQUARE</label>
                  </div>
                  <div class="led-indicator pulse" data-osc="osc2" data-wave="pulse">
                    <div class="led-square"></div>
                    <label>PULSE</label>
                  </div>
                </div>
              </div>
              
              <div class="knob-container">
                <div class="knob" id="osc2-shape-mod" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
                <label>SHAPE MOD</label>
              </div>
              <div class="knob-container">
                <div class="knob" id="osc2-mix" data-min="0" data-max="99" data-value="50" data-display-scale="percent"></div>
                <label>OSC MIX</label>
              </div>
              <div class="knob-container">
                <div class="knob" id="osc2-slop" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
                <label>OSC SLOP</label>
              </div>
            </div>
          </div>
          
          <!-- SYNC Button - Absolutely positioned between oscillators -->
          <div class="sync-absolute">
            <div class="sync-control">
              <button class="sync-btn" id="osc2-sync" data-osc="osc2">
                <div class="sync-btn-inner"></div>
              </button>
              <label>SYNC</label>
            </div>
          </div>
          </div>
        </div>

        <!-- Lower Row: LFO and Sequencer Side by Side -->
        <div class="lower-row">
          <!-- Low Frequency Oscillators -->
          <div class="lfo-section section">
        <h3>LOW FREQUENCY OSCILLATORS</h3>
        <div class="lfo-hardware-layout">
          
          <!-- LFO Selection Buttons (1 & 2) with LED indicators -->
          <div class="lfo-selection-column">
            <div class="lfo-button-with-led">
              <label class="lfo-select-label">1</label>
              <button class="lfo-select-btn" data-lfo="1">
                <div class="sync-btn-inner"></div>
              </button>
              <div class="lfo-led-indicator" data-lfo="1">
                <div class="led-square"></div>
              </div>
            </div>
            
            <div class="lfo-button-with-led">
              <label class="lfo-select-label">2</label>
              <button class="lfo-select-btn" data-lfo="2">
                <div class="sync-btn-inner"></div>
              </button>
              <div class="lfo-led-indicator" data-lfo="2">
                <div class="led-square"></div>
              </div>
            </div>
          </div>

          <!-- Shape Selection with LEDs -->
          <div class='lfo-shape-section'>
          <div class="lfo-shape-column">
            <button class="lfo-shape-btn" data-shape="triangle">
              <div class="shape-btn-inner"></div>
            </button>
            <label class="lfo-shape-label">SHAPE</label>
          </div>
            <div class="lfo-waveform-leds">
              <div class="led-indicator triangle active" data-shape="triangle">
                  <div class="led-square"></div>
                  <label>TRIANGLE</label>
                </div>
                <div class="led-indicator sawtooth" data-shape="sawtooth">
                  <div class="led-square"></div>
                  <label>SAWTOOTH</label>
              </div> 
                <div class="led-indicator square" data-shape="square">
                  <div class="led-square"></div>
                  <label>SQUARE</label>
                </div>
                <div class="led-indicator sine" data-shape="sine">
                  <div class="led-square"></div>
                  <label>SINE</label>
                </div>
             </div>
             </div>
         

          <!-- Frequency and Sync Controls -->
          <div class="lfo-frequency-column">
            <div class="knob-container">
              <div class="knob" id="lfo-frequency" data-min="0" data-max="99" data-value="50" data-display-scale="lfoFreq"></div>
              <label>FREQUENCY</label>
            </div>
            
            <div class="lfo-sync-controls">
             <div class="lfo-sync-btn-group">
              <button class="lfo-sync-btn" data-sync="clk">
                <div class="sync-btn-inner"></div>
              </button>
              <label class="lfo-sync-label">CLK SYNC</label>
             </div> 
              <div class="lfo-sync-btn-group">
              <button class="lfo-sync-btn" data-sync="key">
                <div class="sync-btn-inner"></div>
              </button>
              <label class="lfo-sync-label">KEY SYNC</label>
              </div>
            </div>
          </div>

          <!-- Amount and Destination -->
          <div class="lfo-destination-column">
            <div class="lfo-dest-controls">
              <button class="lfo-dest-btn" id="lfo-destination">
                <div class="sync-btn-inner"></div>
              </button>
              <label class="lfo-dest-label">DESTINATION</label>
            
            <div class="lfo-dest-display">
              <div class="mini-display" id="lfo-dest-screen">
                <span id="lfo-dest-text">CUTOFF</span>
              </div>
            </div>
            </div>
            
            <div class="knob-container">
              <div class="knob" id="lfo-amount" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
              <label>AMOUNT</label>
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
                  <div class="knob" id="seq-tempo" data-min="30" data-max="250" data-value="120" data-display-scale="bpm"></div>
                  <label>TEMPO</label>
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
        </div>
      </div>

      <!-- Column 3: Filter and Amplifier -->
      <div class="column-3">
        <!-- Low-Pass Filter -->
        <div class="filter-section section">
          <h3>LOW-PASS FILTER</h3>
          <div class="filter-controls">
            <div class="knob-row">
              <div class="knob-container">
                <div class="knob" id="filter-cutoff" data-min="0" data-max="164" data-value="82" data-display-scale="filter-cutoff"></div>
                <label>CUTOFF</label>
              </div>
              <div class="knob-container">
                <div class="knob" id="filter-resonance" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
                <label>RESONANCE</label>
              </div>
              <div class="knob-container">
                <div class="knob" id="filter-velocity" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
                <label>VELOCITY</label>
              </div>
              <div class="knob-container">
                <div class="knob" id="filter-key-amount" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
                <label>KEY AMT</label>
              </div>
              <div class="knob-container">
                <div class="knob" id="filter-audio-mod" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
                <label>AUDIO MOD</label>
              </div>
            </div>
            <!-- Filter ADSR moved from Envelopes section -->
            <h4>FILTER ENVELOPE</h4>
            <div class="knob-row">
              <div class="knob-container">
                <div class="knob" id="filter-attack" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
                <label>ATTACK</label>
              </div>
              <div class="knob-container">
                <div class="knob" id="filter-decay" data-min="0" data-max="99" data-value="30" data-display-scale="percent"></div>
                <label>DECAY</label>
              </div>
              <div class="knob-container">
                <div class="knob" id="filter-sustain" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
                <label>SUSTAIN</label>
              </div>
              <div class="knob-container">
                <div class="knob" id="filter-release" data-min="0" data-max="99" data-value="30" data-display-scale="percent"></div>
                <label>RELEASE</label>
              </div>
              <div class="knob-container">
                <div class="knob" id="filter-env-amount" data-min="-99" data-max="99" data-value="0" data-display-scale="bipolar"></div>
                <label>ENV AMT</label>
              </div>
            </div>
          </div>
        </div>

        <!-- Amplifier -->
        <div class="amplifier-section section">
          <h3>AMPLIFIER</h3>
          <div class="amp-controls">
            <div class="knob-row">
              <div class="knob-row">
                <div class="knob-container">
                  <div class="knob" id="amp-attack" data-min="0" data-max="99" data-value="0" data-display-scale="percent"></div>
                  <label>ATTACK</label>
                </div>
                <div class="knob-container">
                  <div class="knob" id="amp-decay" data-min="0" data-max="99" data-value="30" data-display-scale="percent"></div>
                  <label>DECAY</label>
                </div>
                <div class="knob-container">
                  <div class="knob" id="amp-sustain" data-min="0" data-max="99" data-value="70" data-display-scale="percent"></div>
                  <label>SUSTAIN</label>
                </div>
                <div class="knob-container">
                  <div class="knob" id="amp-release" data-min="0" data-max="99" data-value="50" data-display-scale="percent"></div>
                  <label>RELEASE</label>
                </div>
              </div>
              <div class="knob-row">
                <div class="knob-container">
                  <div class="knob" id="amp-velocity" data-min="0" data-max="99" data-value="50" data-display-scale="percent"></div>
                  <label>VELOCITY</label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
`;

setupUI(synth);
