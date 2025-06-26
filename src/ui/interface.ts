import type { SynthEngine } from "../synthesizer/SynthEngine";

const DISPLAY_SCALES = {
  "filter-cutoff": {
    min: 0,
    max: 164,
    convert: (displayValue: number) => {
      const normalizedValue = displayValue / 164;
      const minFreq = 20;
      const maxFreq = 20000;
      return minFreq * Math.pow(maxFreq / minFreq, normalizedValue);
    },
  },
  percent: {
    min: 0,
    max: 99,
    convert: (displayValue: number) => displayValue / 99,
  },
  semitones: {
    min: -24,
    max: 24,
    convert: (displayValue: number) => displayValue,
  },
  cents: {
    min: -50,
    max: 50,
    convert: (displayValue: number) => displayValue, // Keep cents as-is
  },
  bipolar: {
    min: -99,
    max: 99,
    convert: (displayValue: number) => displayValue / 99,
  },
  bpm: {
    min: 30,
    max: 250,
    convert: (displayValue: number) => displayValue,
  },
  lfoFreq: {
    min: 0,
    max: 99,
    convert: (displayValue: number) => {
      // Convert 0-99 to 0.022-500 Hz logarithmically
      return 0.022 * Math.pow(500 / 0.022, displayValue / 99);
    },
  },
};

interface LFOState {
  shape: string;
  frequency: number;
  amount: number;
  sync: string | null;
  destination: string;
  active: boolean;
}

const lfoStates: { [key: number]: LFOState } = {
  1: {
    shape: "triangle",
    frequency: 50,
    amount: 0,
    sync: null,
    destination: "cutoff",
    active: false,
  },
  2: {
    shape: "triangle",
    frequency: 50,
    amount: 0,
    sync: null,
    destination: "cutoff",
    active: false,
  },
};

let currentLFO = 1;
const lfoDestinations = [
  "cutoff",
  "resonance",
  "osc1-freq",
  "osc2-freq",
  "amp",
];
let currentDestIndex = 0;

export function setupUI(synth: SynthEngine) {
  setupKnobs(synth);
  setupKeyboard(synth);
  setupButtons(synth);
  setupWaveformButtons(synth);
  setupFilterButtons(synth);
  setupLFOControls(synth);
  setupVolumeMeter(synth);
  setupWaveformVisualization(synth);
}

function setupKnobs(synth: SynthEngine) {
  const knobs = document.querySelectorAll(".knob");

  knobs.forEach((knob) => {
    const element = knob as HTMLElement;
    let isDragging = false;
    let startY = 0;
    let startValue = 0;
    let animationFrameId: number | null = null;

    const min = parseFloat(element.dataset.min || "0");
    const max = parseFloat(element.dataset.max || "1");
    const initialValue = parseFloat(element.dataset.value || "0");
    const displayScale = element.dataset.displayScale || "raw";

    // Set initial rotation and display
    updateKnobVisual(element, initialValue, min, max);
    updateDisplay(element.id, initialValue, displayScale);

    // Initialize synth parameter to match UI value
    updateSynthParameter(synth, element.id, initialValue, displayScale);

    element.addEventListener("mousedown", (e) => {
      isDragging = true;
      startY = e.clientY;
      startValue = parseFloat(element.dataset.value || "0");
      element.style.cursor = "grabbing";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      // Cancel previous animation frame if it exists
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      // Schedule update on next frame for smooth animation
      animationFrameId = requestAnimationFrame(() => {
        const deltaY = startY - e.clientY;
        const sensitivity = 0.005;
        const range = max - min;
        const deltaValue = deltaY * sensitivity * range;

        let newValue = startValue + deltaValue;
        newValue = Math.max(min, Math.min(max, newValue));

        element.dataset.value = newValue.toString();
        updateKnobVisual(element, newValue, min, max);
        updateDisplay(element.id, newValue, displayScale);

        updateSynthParameter(synth, element.id, newValue, displayScale);

        animationFrameId = null;
      });
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        element.style.cursor = "grab";
        // Cancel any pending animation frame
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      }
    });
  });
}

function updateKnobVisual(
  knob: HTMLElement,
  value: number,
  min: number,
  max: number
) {
  const normalized = (value - min) / (max - min);
  const rotation = -140 + normalized * 280; // -140° to +140°
  knob.style.transform = `rotate(${rotation}deg)`;
}

function updateDisplay(knobId: string, value: number, displayScale: string) {
  const paramNameElement = document.getElementById("param-name");
  const paramValueElement = document.getElementById("param-value");

  if (!paramNameElement || !paramValueElement) return;

  // Update parameter name
  const [section, param] = knobId.split("-");
  const displayName = getDisplayName(section, param);
  paramNameElement.textContent = displayName;

  // Update parameter value based on scale
  let displayValue: string;

  switch (displayScale) {
    case "filter-cutoff":
      displayValue = Math.round(value).toString();
      break;
    case "percent":
      displayValue = Math.round(value).toString();
      break;
    case "semitones":
      displayValue =
        value >= 0 ? `+${Math.round(value)}` : Math.round(value).toString();
      break;
    case "cents":
      displayValue =
        value >= 0 ? `+${Math.round(value)}` : Math.round(value).toString();
      break;
    case "bipolar":
      displayValue =
        value >= 0 ? `+${Math.round(value)}` : Math.round(value).toString();
      break;
    case "bpm":
      displayValue = Math.round(value).toString();
      break;
    case "lfoFreq":
      // Convert 0-99 to Hz (0.1 to 10 Hz - practical range) and display with appropriate precision
      const freqHz = 0.1 * Math.pow(10 / 0.1, value / 99);
      if (freqHz < 1) {
        displayValue = freqHz.toFixed(2); // Show 2 decimal places for sub-Hz
      } else if (freqHz < 10) {
        displayValue = freqHz.toFixed(1); // Show 1 decimal place for < 10 Hz
      } else {
        displayValue = Math.round(freqHz).toString(); // Round for >= 10 Hz
      }
      break;
    default:
      displayValue = (Math.round(value * 100) / 100).toString();
      break;
  }

  paramValueElement.textContent = displayValue;
}

function getDisplayName(section: string, param: string): string {
  const names: { [key: string]: string } = {
    "osc1-freq": "OSC 1 FREQ",
    "osc1-fine": "OSC 1 FINE",
    "osc1-shape": "OSC 1 SHAPE",
    "osc2-freq": "OSC 2 FREQ",
    "osc2-fine": "OSC 2 FINE",
    "osc2-shape": "OSC 2 SHAPE",
    "filter-cutoff": "CUTOFF",
    "filter-resonance": "RESONANCE",
    "filter-velocity": "FILTER VEL",
    "filter-key-amount": "KEY AMT",
    "filter-audio-mod": "AUDIO MOD",
    "filter-attack": "FILT ATTACK",
    "filter-decay": "FILT DECAY",
    "filter-sustain": "FILT SUSTAIN",
    "filter-release": "FILT RELEASE",
    "filter-env-amount": "ENV AMT",
    "amp-attack": "AMP ATTACK",
    "amp-decay": "AMP DECAY",
    "amp-sustain": "AMP SUSTAIN",
    "amp-release": "AMP RELEASE",
    "amp-velocity": "AMP VEL",
    "lfo1-rate": "LFO 1 RATE",
    "lfo1-amount": "LFO 1 AMT",
    "lfo2-rate": "LFO 2 RATE",
    "lfo2-amount": "LFO 2 AMT",
    "lfo-frequency": "LFO FREQ",
    "lfo-amount": "LFO AMT",
    "seq-tempo": "SEQ TEMPO",
    "master-volume": "MASTER VOL",
  };

  return (
    names[`${section}-${param}`] ||
    `${section.toUpperCase()} ${param.toUpperCase()}`
  );
}

function updateSynthParameter(
  synth: SynthEngine,
  knobId: string,
  value: number,
  displayScale: string
) {
  const [section, param] = knobId.split("-");

  // Convert display value to synth parameter value
  let processedValue = value;

  if (displayScale in DISPLAY_SCALES) {
    const scale = DISPLAY_SCALES[displayScale as keyof typeof DISPLAY_SCALES];
    processedValue = scale.convert(value);
  }

  switch (section) {
    case "osc1":
      // Map OSC1 parameters
      switch (param) {
        case "freq":
          synth.updateParameter(section, "frequency", processedValue);
          break;
        case "fine":
          synth.updateParameter(section, "fine", processedValue);
          break;
        case "shape-mod":
          synth.updateParameter(section, "shapeMod", processedValue);
          break;
        case "sub-octave":
          synth.updateParameter(section, "subOctave", processedValue);
          break;
        case "noise":
          synth.updateParameter(section, "noise", processedValue);
          break;
        default:
          synth.updateParameter(section, param, processedValue);
          break;
      }
      break;
    case "osc2":
      // Map OSC2 parameters
      switch (param) {
        case "freq":
          synth.updateParameter(section, "frequency", processedValue);
          break;
        case "fine":
          synth.updateParameter(section, "fine", processedValue);
          break;
        case "shape-mod":
          synth.updateParameter(section, "shapeMod", processedValue);
          break;
        case "mix":
          synth.updateParameter(section, "mix", processedValue);
          break;
        case "slop":
          synth.updateParameter(section, "slop", processedValue);
          break;
        case "sync":
          // Convert between UI boolean (0/1) and internal boolean (0/1)
          synth.updateParameter(section, "sync", processedValue ? 1 : 0);
          break;
        default:
          synth.updateParameter(section, param, processedValue);
          break;
      }
      break;
    case "filter":
      if (
        param.startsWith("env") ||
        ["attack", "decay", "sustain", "release"].includes(param)
      ) {
        // Filter envelope parameters
        synth.updateParameter(
          "filterEnv",
          param.replace("env-", ""),
          processedValue
        );
      } else {
        synth.updateParameter("filter", param, processedValue);
      }
      break;
    case "amp":
      synth.updateParameter("ampEnv", param, processedValue);
      break;
    case "lfo1":
      // Map LFO1 to the main LFO
      const lfoParam = param === "rate" ? "rate" : "amount";
      synth.updateParameter("lfo", lfoParam, processedValue);
      break;
    case "lfo2":
      // Map LFO2 parameters
      const lfo2Param = param === "rate" ? "rate" : "amount";
      synth.updateParameter("lfo2", lfo2Param, processedValue);
      break;
    case "lfo":
      // New unified LFO controls - route to current LFO
      if (param === "frequency") {
        lfoStates[currentLFO].frequency = value;
        synth.updateParameter(`lfo${currentLFO}`, "rate", processedValue);
      } else if (param === "amount") {
        lfoStates[currentLFO].amount = value;
        // Don't auto-activate LFO based on amount - only LED buttons control on/off
        synth.updateParameter(`lfo${currentLFO}`, "amount", processedValue);
      }
      break;
    case "seq":
      // Sequencer parameters
      synth.updateParameter("sequencer", param, processedValue);
      break;
    case "master":
      // Master controls - pass raw percentage value (0-99), don't convert
      synth.updateParameter("master", param, value);
      break;
  }
}

function setupWaveformButtons(synth: SynthEngine) {
  // Setup shape buttons for cycling through waveforms
  const shapeButtons = document.querySelectorAll(".shape-btn");

  // Define waveforms in cycle order
  const waveforms = ["sawtooth", "triangle", "square", "pulse"];

  shapeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const element = button as HTMLElement;
      const osc = element.dataset.osc as string;
      const currentWave = element.dataset.currentWave as string;

      // Find next waveform in cycle
      const currentIndex = waveforms.indexOf(currentWave);
      const nextIndex = (currentIndex + 1) % waveforms.length;
      const nextWave = waveforms[nextIndex];

      // Update button's current wave
      element.dataset.currentWave = nextWave;

      // Update LED indicators for this oscillator
      const oscContainer =
        element.closest(".osc-row") ||
        element.closest(".shape-waveform-centered");
      if (oscContainer) {
        const leds = oscContainer.querySelectorAll(".led-indicator");
        leds.forEach((led) => {
          const ledElement = led as HTMLElement;
          const waveType = ledElement.dataset.wave;
          if (waveType === nextWave) {
            ledElement.classList.add("active");
          } else {
            ledElement.classList.remove("active");
          }
        });
      }

      // Update synth parameter
      synth.updateParameter(osc, "waveform", nextWave);

      // Update display
      updateDisplay(`${osc}-waveform`, 0, "raw");
      const paramNameElement = document.getElementById("param-name");
      const paramValueElement = document.getElementById("param-value");
      if (paramNameElement && paramValueElement) {
        paramNameElement.textContent = `${osc.toUpperCase()} WAVE`;
        paramValueElement.textContent = nextWave.toUpperCase();
      }
    });
  });

  // Setup SYNC button for OSC 2
  const syncButton = document.getElementById("osc2-sync");
  if (syncButton) {
    let syncActive = false;

    syncButton.addEventListener("click", () => {
      syncActive = !syncActive;
      syncButton.classList.toggle("active", syncActive);

      // Update synth parameter
      synth.updateParameter("osc2", "sync", syncActive ? 1 : 0);

      // Update display
      const paramNameElement = document.getElementById("param-name");
      const paramValueElement = document.getElementById("param-value");
      if (paramNameElement && paramValueElement) {
        paramNameElement.textContent = "OSC2 SYNC";
        paramValueElement.textContent = syncActive ? "ON" : "OFF";
      }
    });
  }
}

function setupFilterButtons(synth: SynthEngine) {
  // Filter is now fixed as a 2-pole lowpass filter
  synth.updateParameter("filter", "type", "lowpass");

  // Function remains for compatibility but buttons have been removed from UI
}

function setupButtons(_synth: SynthEngine) {
  // Any additional button setup can go here
}

function setupKeyboard(synth: SynthEngine) {
  // Computer keyboard mapping only - removed UI keyboard
  const keyMap: { [key: string]: string } = {
    a: "C3",
    w: "C#3",
    s: "D3",
    e: "D#3",
    d: "E3",
    f: "F3",
    t: "F#3",
    g: "G3",
    y: "G#3",
    h: "A3",
    u: "A#3",
    j: "B3",
    k: "C4",
    o: "C#4",
    l: "D4",
    p: "D#4",
    ";": "E4",
  };

  document.addEventListener("keydown", (e) => {
    const note = keyMap[e.key.toLowerCase()];
    if (note && !e.repeat) {
      synth.noteOn(note);
    }
  });

  document.addEventListener("keyup", (e) => {
    const note = keyMap[e.key.toLowerCase()];
    if (note) {
      synth.noteOff(note);
    }
  });
}

// Function to create and update spectrum visualization
function setupWaveformVisualization(synth: SynthEngine) {
  const canvas = document.createElement("canvas");
  const waveformDiv = document.getElementById("waveform-viz");
  if (!waveformDiv) return;

  waveformDiv.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Set canvas size to match the container
  canvas.width = waveformDiv.clientWidth;
  canvas.height = waveformDiv.clientHeight;

  let animationId: number; // Arrays for peak tracking and persistent effects
  const peakLevels = new Array(64).fill(0);
  let energyHistory = new Array(10).fill(0);

  // Create off-screen canvas for glow effects
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = canvas.width;
  glowCanvas.height = canvas.height;
  const glowCtx = glowCanvas.getContext("2d");

  if (!glowCtx) return;

  const drawSpectrum = () => {
    if (!ctx) return;

    const now = performance.now();

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    glowCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background with subtle animation
    ctx.fillStyle = "rgba(0, 10, 10, 0.2)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = "rgba(82, 227, 194, 0.15)";
    ctx.lineWidth = 1;

    // Horizontal grid lines with subtle movement
    const gridOffset = Math.sin(now / 3000) * 3;
    for (let i = 0; i <= 5; i++) {
      const y = canvas.height * (i / 5) + gridOffset;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Only draw spectrum if there are active voices
    if (synth.hasActiveVoices()) {
      try {
        const analyzer = synth.getAnalyzer();
        const frequencyData = analyzer.getValue() as Float32Array;

        // Calculate overall energy for effects
        let totalEnergy = 0;
        for (let i = 0; i < frequencyData.length; i++) {
          const value = frequencyData[i] as number;
          const normalizedValue = Math.max((value + 100) / 100, 0);
          totalEnergy += normalizedValue;
        }

        // Update energy history
        energyHistory.shift();
        energyHistory.push(totalEnergy / frequencyData.length);

        // Calculate average energy
        const avgEnergy =
          energyHistory.reduce((sum, val) => sum + val, 0) /
          energyHistory.length;

        // Draw frequency bars and peaks
        const barWidth = canvas.width / frequencyData.length;
        const barHeight = canvas.height;

        // Bass frequency analysis code removed

        // Main spectrum visualization
        // First draw to the glow canvas for the bloom effect
        glowCtx.beginPath();
        glowCtx.moveTo(0, canvas.height);

        // Dynamic color based on energy
        const hueBase = 160 + Math.sin(now / 5000) * 20;

        for (let i = 0; i < frequencyData.length; i++) {
          // Convert dB value to height value (dB is typically between -100 and 0)
          const value = frequencyData[i] as number;
          const normalizedValue = Math.max((value + 100) / 100, 0); // Normalize to 0-1

          // Update peak values with slow decay
          if (normalizedValue > peakLevels[i]) {
            peakLevels[i] = normalizedValue;
          } else {
            peakLevels[i] *= 0.95; // Slow decay
          }

          // Calculate height based on normalized value with exponential scaling
          const height = Math.pow(normalizedValue, 0.7) * barHeight * 0.9;
          const peakHeight = Math.pow(peakLevels[i], 0.7) * barHeight * 0.95;

          // Position for the bar
          const x = i * barWidth;
          const y = canvas.height - height;

          // Connect points with curve for a smoother spectrum
          glowCtx.lineTo(x + barWidth / 2, y);

          // Draw peak markers
          if (i % 2 === 0 && peakLevels[i] > 0.05) {
            const peakY = canvas.height - peakHeight;
            glowCtx.fillStyle = `rgba(180, 255, 230, ${peakLevels[i] * 0.8})`;
            glowCtx.fillRect(x, peakY - 2, barWidth, 2);
          }
        }

        // Close the path
        glowCtx.lineTo(canvas.width, canvas.height);
        glowCtx.closePath();

        // Create gradient fill with dynamic colors based on energy
        const gradient = glowCtx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(
          0,
          `hsla(${hueBase}, 100%, 70%, ${0.7 + avgEnergy * 0.3})`
        );
        gradient.addColorStop(0.4, `hsla(${hueBase + 10}, 100%, 65%, 0.5)`);
        gradient.addColorStop(1, "rgba(82, 227, 194, 0.1)");

        glowCtx.fillStyle = gradient;
        glowCtx.fill();

        // Add outline with glow
        glowCtx.strokeStyle = `rgba(180, 255, 230, ${0.6 + avgEnergy * 0.4})`;
        glowCtx.lineWidth = 1.5;
        glowCtx.stroke();

        // Apply glow canvas to main canvas with blur for bloom effect
        ctx.filter = "blur(4px)";
        ctx.globalAlpha = 0.6;
        ctx.drawImage(glowCanvas, 0, 0);

        // Reset and draw sharp version
        ctx.filter = "none";
        ctx.globalAlpha = 1;
        ctx.drawImage(glowCanvas, 0, 0);
      } catch (e) {
        console.error("Error drawing spectrum:", e);
      }
    } else {
      // When no audio is playing, show subtle animated waveforms
      const time = now / 1000;

      // Draw flowing wave animation
      glowCtx.beginPath();
      glowCtx.moveTo(0, canvas.height / 2);

      for (let x = 0; x < canvas.width; x++) {
        // Create multiple overlapping sine waves
        const y =
          canvas.height / 2 +
          Math.sin(x / 50 + time * 0.8) * 10 +
          Math.sin(x / 100 - time * 0.5) * 5;

        glowCtx.lineTo(x, y);
      }

      // Gradient for idle wave
      const idleGradient = glowCtx.createLinearGradient(0, 0, canvas.width, 0);
      idleGradient.addColorStop(0, "rgba(82, 227, 194, 0.3)");
      idleGradient.addColorStop(0.5, "rgba(120, 227, 220, 0.5)");
      idleGradient.addColorStop(1, "rgba(82, 227, 194, 0.3)");

      glowCtx.strokeStyle = idleGradient;
      glowCtx.lineWidth = 2;
      glowCtx.stroke();

      // Second wave, offset
      glowCtx.beginPath();
      for (let x = 0; x < canvas.width; x++) {
        const y =
          canvas.height / 2 +
          Math.sin(x / 60 - time * 0.7) * 8 +
          Math.cos(x / 120 + time * 0.6) * 4;

        glowCtx.lineTo(x, y);
      }

      glowCtx.strokeStyle = "rgba(82, 227, 194, 0.2)";
      glowCtx.lineWidth = 1.5;
      glowCtx.stroke();

      // Apply glow effect to idle animation
      ctx.filter = "blur(3px)";
      ctx.globalAlpha = 0.5;
      ctx.drawImage(glowCanvas, 0, 0);

      // Draw sharp version
      ctx.filter = "none";
      ctx.globalAlpha = 1;
      ctx.drawImage(glowCanvas, 0, 0);
    }

    // Continue animation
    animationId = requestAnimationFrame(drawSpectrum);
  };

  // Start animation
  drawSpectrum();

  // Cleanup function
  return () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  };
}

function setupLFOControls(synth: SynthEngine) {
  // LFO Selection Buttons - Toggle LFO on/off when clicked
  const lfoSelectButtons = document.querySelectorAll(".lfo-select-btn");
  lfoSelectButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const element = button as HTMLElement;
      const lfoNumber = parseInt(element.dataset.lfo || "1");

      // Switch to editing this LFO
      currentLFO = lfoNumber;

      // Toggle the LFO active state when button is clicked
      lfoStates[lfoNumber].active = !lfoStates[lfoNumber].active;

      // Check for parameter conflicts and resolve them
      if (lfoStates[lfoNumber].active) {
        resolveParameterConflicts(lfoNumber);
      }

      // Update LED visual state
      updateLFOLEDState(lfoNumber);

      // Update synth parameter
      synth.updateParameter(
        `lfo${lfoNumber}`,
        "active",
        lfoStates[lfoNumber].active ? 1 : 0
      );

      // Restore LFO state to show its settings in the knobs
      restoreLFOState(currentLFO);

      // Update main display
      updateMainDisplay(
        `LFO ${lfoNumber}`,
        lfoStates[lfoNumber].active ? "ON" : "OFF"
      );
    });
  });

  // Remove the LED click handlers since we want button control only

  // LFO Shape Button
  const shapeButton = document.querySelector(".lfo-shape-btn");
  if (shapeButton) {
    shapeButton.addEventListener("click", () => {
      // Cycle through shapes
      const shapes = ["triangle", "sawtooth", "square", "sine"];
      const currentShapeIndex = shapes.indexOf(lfoStates[currentLFO].shape);
      const nextShapeIndex = (currentShapeIndex + 1) % shapes.length;
      const newShape = shapes[nextShapeIndex];

      // Update state and UI
      lfoStates[currentLFO].shape = newShape;
      updateShapeLEDs(newShape);

      // Update synth
      synth.updateParameter(`lfo${currentLFO}`, "waveform", newShape);
      updateMainDisplay(`LFO ${currentLFO} SHAPE`, newShape.toUpperCase());
    });
  }

  // LFO Shape LED Indicators are now display-only (no click handlers)
  // Shape selection is handled only by the SHAPE button above

  // LFO Sync Buttons
  const syncButtons = document.querySelectorAll(".lfo-sync-btn");
  syncButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const element = button as HTMLElement;
      const syncType = element.dataset.sync;

      if (element.classList.contains("active")) {
        // Turn off sync
        element.classList.remove("active");
        lfoStates[currentLFO].sync = null;
        synth.updateParameter(`lfo${currentLFO}`, "sync", 0);
        updateMainDisplay(`LFO ${currentLFO} SYNC`, "OFF");
      } else {
        // Turn on sync, turn off other sync buttons
        syncButtons.forEach((btn) => btn.classList.remove("active"));
        element.classList.add("active");
        lfoStates[currentLFO].sync = syncType || null;
        synth.updateParameter(
          `lfo${currentLFO}`,
          "sync",
          syncType === "clk" ? 1 : 2
        );
        updateMainDisplay(
          `LFO ${currentLFO} SYNC`,
          (syncType || "").toUpperCase()
        );
      }
    });
  });

  // LFO Destination Button
  const destButton = document.querySelector(".lfo-dest-btn");
  if (destButton) {
    destButton.addEventListener("click", () => {
      // Cycle through destinations
      currentDestIndex = (currentDestIndex + 1) % lfoDestinations.length;
      const newDest = lfoDestinations[currentDestIndex];

      lfoStates[currentLFO].destination = newDest;

      // Check for conflicts if this LFO is active
      if (lfoStates[currentLFO].active) {
        resolveParameterConflicts(currentLFO);
      }

      updateDestinationDisplay(newDest);
      synth.updateParameter(`lfo${currentLFO}`, "destination", newDest);
      updateMainDisplay(`LFO ${currentLFO} DEST`, newDest.toUpperCase());
    });
  }

  // Initialize with LFO 1 selected and restore states for both LFOs
  currentLFO = 1;
  restoreLFOState(1);

  // Also update the state for LFO 2 LED
  updateLFOLEDState(2);
}

function restoreLFOState(lfoNumber: number) {
  const state = lfoStates[lfoNumber];

  // Update shape LEDs
  updateShapeLEDs(state.shape);

  // Update sync buttons
  const syncButtons = document.querySelectorAll(".lfo-sync-btn");
  syncButtons.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-sync") === state.sync) {
      btn.classList.add("active");
    }
  });

  // Update knob values
  const frequencyKnob = document.getElementById("lfo-frequency") as HTMLElement;
  const amountKnob = document.getElementById("lfo-amount") as HTMLElement;

  if (frequencyKnob) {
    frequencyKnob.dataset.value = state.frequency.toString();
    updateKnobVisual(frequencyKnob, state.frequency, 0, 99);
    // Also update the display to show the current frequency value
    updateDisplay("lfo-frequency", state.frequency, "lfoFreq");
  }

  if (amountKnob) {
    amountKnob.dataset.value = state.amount.toString();
    updateKnobVisual(amountKnob, state.amount, 0, 99);
    // Also update the display to show the current amount value
    updateDisplay("lfo-amount", state.amount, "percent");
  }

  // Update destination display
  updateDestinationDisplay(state.destination);

  // Update LFO LED indicator state
  updateLFOLEDState(lfoNumber);
}

function updateShapeLEDs(activeShape: string) {
  const leds = document.querySelectorAll(".led-indicator[data-shape]");
  leds.forEach((led) => {
    const element = led as HTMLElement;
    if (element.dataset.shape === activeShape) {
      element.classList.add("active");
    } else {
      element.classList.remove("active");
    }
  });
}

function updateDestinationDisplay(destination: string) {
  const destText = document.getElementById("lfo-dest-text");
  if (destText) {
    destText.textContent = destination.toUpperCase();
  }
}

function updateMainDisplay(paramName: string, value: string) {
  const paramNameElement = document.getElementById("param-name");
  const paramValueElement = document.getElementById("param-value");

  if (paramNameElement && paramValueElement) {
    paramNameElement.textContent = paramName;
    paramValueElement.textContent = value;
  }
}

function setupVolumeMeter(synth: SynthEngine) {
  let volumeBars: NodeListOf<Element>;
  let statusLed: HTMLElement | null;
  let volumeScreen: HTMLElement | null;
  let animationId: number | null = null;
  let analyzer: any = null;
  let peakLevel = 0;
  let peakHoldTime = 0;
  let smoothedVolume = 0;
  let smoothedDbValue = -Infinity;

  // Get volume meter elements
  volumeBars = document.querySelectorAll(".volume-bar");
  statusLed = document.getElementById("audio-status-led");
  volumeScreen = document.getElementById("volume-screen");

  if (!volumeBars.length) {
    return;
  }

  // Add digital readout to volume screen
  if (volumeScreen) {
    const digitalReadout = document.createElement("div");
    digitalReadout.className = "volume-digital-readout";
    digitalReadout.style.cssText = `
      font-size: 11px;
      margin-bottom: 8px;
      letter-spacing: 1px;
      opacity: 0.9;
    `;
    digitalReadout.textContent = "-∞ dB";
    volumeScreen.insertBefore(digitalReadout, volumeScreen.firstChild);
  }

  // Get analyzer from synth engine
  try {
    analyzer = synth.getVolumeAnalyzer();
  } catch (error) {
    console.warn("Could not get volume analyzer for volume meter:", error);
    return;
  }

  function updateVolumeMeter() {
    try {
      if (!analyzer) return;

      // Get waveform data from Tone.js analyzer
      const waveform = analyzer.getValue();

      // Calculate RMS (Root Mean Square) for volume level from waveform data
      let sum = 0;
      const length = waveform.length;

      for (let i = 0; i < length; i++) {
        // For waveform data, values are already in linear scale (-1 to 1)
        if (typeof waveform[i] === "number") {
          const sample = waveform[i];
          sum += sample * sample;
        }
      }

      const rms = Math.sqrt(sum / length);
      const volume = Math.min(Math.max(rms * 3, 0), 1); // Scale for waveform data

      // Smooth the volume and dB values to reduce jitter
      const volumeSmoothing = 0.8;
      const dbSmoothing = 0.9;
      smoothedVolume =
        smoothedVolume * volumeSmoothing + volume * (1 - volumeSmoothing);

      // Peak detection with hold
      if (volume > peakLevel) {
        peakLevel = volume;
        peakHoldTime = 30; // Hold peak for 30 frames (~500ms at 60fps)
      } else if (peakHoldTime > 0) {
        peakHoldTime--;
      } else {
        peakLevel *= 0.95; // Gradual peak decay
      }

      // Update digital readout with smoothing
      const digitalReadout = volumeScreen?.querySelector(
        ".volume-digital-readout"
      );
      if (digitalReadout) {
        if (smoothedVolume > 0.001) {
          const currentDbValue = Math.max(-40, 20 * Math.log10(smoothedVolume));
          // Smooth the dB display to reduce jitter
          if (smoothedDbValue === -Infinity) {
            smoothedDbValue = currentDbValue;
          } else {
            smoothedDbValue =
              smoothedDbValue * dbSmoothing +
              currentDbValue * (1 - dbSmoothing);
          }
          digitalReadout.textContent = `${smoothedDbValue.toFixed(1)} dB`;
        } else {
          smoothedDbValue = -Infinity;
          digitalReadout.textContent = "-∞ dB";
        }
      }

      // Update status LED with activity detection
      if (statusLed) {
        if (smoothedVolume > 0.01) {
          statusLed.classList.add("active");
        } else {
          statusLed.classList.remove("active");
        }
      }

      // Update discrete volume bars
      volumeBars.forEach((bar) => {
        const element = bar as HTMLElement;
        const level = parseInt(element.getAttribute("data-level") || "0");

        // Convert volume level to bar count (0-20 bars)
        const dbValue =
          smoothedVolume > 0.001 ? 20 * Math.log10(smoothedVolume) : -40;
        const normalizedDb = Math.max(0, Math.min(1, (dbValue + 40) / 40)); // -40dB to 0dB range
        const activeBars = Math.floor(normalizedDb * 20); // 0 to 20 bars

        // Remove active class
        element.classList.remove("active");

        // Add active class if this bar should be lit (fill from bottom up)
        // Level 1 is at bottom, level 20 is at top
        if (21 - level <= activeBars) {
          element.classList.add("active");
        }

        // Peak indicator - brighten bars at peak level
        if (peakLevel > 0.001) {
          const peakDbValue = 20 * Math.log10(peakLevel);
          const peakNormalizedDb = Math.max(
            0,
            Math.min(1, (peakDbValue + 40) / 40)
          );
          const peakBars = Math.floor(peakNormalizedDb * 20);

          if (21 - level === peakBars && peakHoldTime > 15) {
            element.style.filter = "brightness(1.5)";
            element.style.transform = "scaleY(1.2)";
          } else {
            element.style.filter = "";
            element.style.transform = "";
          }
        }
      });
    } catch (error) {
      console.warn("Volume meter update failed:", error);
    }

    // Continue animation
    animationId = requestAnimationFrame(updateVolumeMeter);
  }

  // Start volume meter animation
  updateVolumeMeter();

  // Return cleanup function
  return () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  };
}

// Helper function to resolve parameter conflicts between LFOs
function resolveParameterConflicts(activatedLFONumber: number) {
  const activatedDestination = lfoStates[activatedLFONumber].destination;

  // Check if the other LFO is controlling the same parameter
  const otherLFONumber = activatedLFONumber === 1 ? 2 : 1;
  if (
    lfoStates[otherLFONumber].active &&
    lfoStates[otherLFONumber].destination === activatedDestination
  ) {
    // Turn off the other LFO since only one can control a parameter
    lfoStates[otherLFONumber].active = false;
    updateLFOLEDState(otherLFONumber);

    // Update main display if the deactivated LFO was the current one
    if (currentLFO === otherLFONumber) {
      updateMainDisplay(`LFO ${otherLFONumber}`, "OFF");
    }
  }
}

// Helper function to update LFO LED visual state
function updateLFOLEDState(lfoNumber: number) {
  const led = document.querySelector(
    `[data-lfo="${lfoNumber}"].lfo-led-indicator`
  );
  if (led) {
    if (lfoStates[lfoNumber].active) {
      led.classList.add("active");
    } else {
      led.classList.remove("active");
    }
  }
}
