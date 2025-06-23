import type { SynthEngine } from "../synthesizer/SynthEngine";

// Display parameter mappings for synthesizer scale values
const DISPLAY_SCALES = {
  "filter-cutoff": {
    min: 0,
    max: 164,
    convert: (displayValue: number) => {
      // Convert display value (0-164) to frequency (20Hz-20kHz) logarithmically
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
    convert: (displayValue: number) => displayValue / 100,
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
};

export function setupUI(synth: SynthEngine) {
  // Setup knob controls
  setupKnobs(synth);

  // Setup keyboard
  setupKeyboard(synth);

  // Setup button controls
  setupButtons(synth);

  // Setup waveform buttons
  setupWaveformButtons(synth);

  // Setup filter type buttons
  setupFilterButtons(synth);

  // Setup waveform visualization
  setupWaveformVisualization(synth);
}

function setupKnobs(synth: SynthEngine) {
  const knobs = document.querySelectorAll(".knob");

  knobs.forEach((knob) => {
    const element = knob as HTMLElement;
    let isDragging = false;
    let startY = 0;
    let startValue = 0;

    const min = parseFloat(element.dataset.min || "0");
    const max = parseFloat(element.dataset.max || "1");
    const initialValue = parseFloat(element.dataset.value || "0");
    const displayScale = element.dataset.displayScale || "raw";

    // Set initial rotation and display
    updateKnobVisual(element, initialValue, min, max);
    updateDisplay(element.id, initialValue, displayScale);

    element.addEventListener("mousedown", (e) => {
      isDragging = true;
      startY = e.clientY;
      startValue = parseFloat(element.dataset.value || "0");
      element.style.cursor = "grabbing";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      const deltaY = startY - e.clientY;
      const sensitivity = 0.005;
      const range = max - min;
      const deltaValue = deltaY * sensitivity * range;

      let newValue = startValue + deltaValue;
      newValue = Math.max(min, Math.min(max, newValue));

      element.dataset.value = newValue.toString();
      updateKnobVisual(element, newValue, min, max);
      updateDisplay(element.id, newValue, displayScale);

      // Update synthesizer parameter
      updateSynthParameter(synth, element.id, newValue, displayScale);
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        element.style.cursor = "grab";
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
    "seq-tempo": "SEQ TEMPO",
    "poly-mod": "POLY MOD",
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
  console.log("UI updateSynthParameter:", knobId, "->", section, param, value);

  // Convert display value to synth parameter value
  let processedValue = value;

  if (displayScale in DISPLAY_SCALES) {
    const scale = DISPLAY_SCALES[displayScale as keyof typeof DISPLAY_SCALES];
    processedValue = scale.convert(value);
  }

  switch (section) {
    case "osc1":
    case "osc2":
      // Map "freq" to "frequency" for oscillator frequency
      const oscParam = param === "freq" ? "frequency" : param;
      synth.updateParameter(section, oscParam, processedValue);
      break;
    case "filter":
      console.log(
        "Calling synth.updateParameter for filter:",
        section,
        param,
        processedValue
      );
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
    case "seq":
      // Sequencer parameters
      synth.updateParameter("sequencer", param, processedValue);
      break;
    case "poly":
      // Poly modulation
      synth.updateParameter("polyMod", param, processedValue);
      break;
    case "master":
      // Master controls
      synth.updateParameter("master", param, processedValue);
      break;
  }
}

function setupWaveformButtons(synth: SynthEngine) {
  const waveButtons = document.querySelectorAll(".wave-btn");

  waveButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const element = button as HTMLElement;
      const osc = element.dataset.osc as string;
      const wave = element.dataset.wave as string;

      // Update button states
      const siblingButtons =
        element.parentElement?.querySelectorAll(".wave-btn");
      siblingButtons?.forEach((btn) => btn.classList.remove("active"));
      element.classList.add("active");

      // Update synth parameter
      synth.updateParameter(osc, "waveform", wave);

      // Update display
      updateDisplay(`${osc}-waveform`, 0, "raw");
      const paramNameElement = document.getElementById("param-name");
      const paramValueElement = document.getElementById("param-value");
      if (paramNameElement && paramValueElement) {
        paramNameElement.textContent = `${osc.toUpperCase()} WAVE`;
        paramValueElement.textContent = wave.toUpperCase();
      }
    });
  });
}

function setupFilterButtons(synth: SynthEngine) {
  const filterButtons = document.querySelectorAll(".filter-btn");

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const element = button as HTMLElement;
      const type = element.dataset.type as string;

      // Update button states
      const siblingButtons =
        element.parentElement?.querySelectorAll(".filter-btn");
      siblingButtons?.forEach((btn) => btn.classList.remove("active"));
      element.classList.add("active");

      // Update synth parameter
      synth.updateParameter("filter", "type", type);

      // Update display
      const paramNameElement = document.getElementById("param-name");
      const paramValueElement = document.getElementById("param-value");
      if (paramNameElement && paramValueElement) {
        paramNameElement.textContent = "FILTER TYPE";
        paramValueElement.textContent =
          type === "lowpass" ? "2 POLE" : "4 POLE";
      }
    });
  });
}

function setupButtons(_synth: SynthEngine) {
  // Any additional button setup can go here
}

function setupKeyboard(synth: SynthEngine) {
  const keyboard = document.getElementById("keyboard")!;

  // Create piano keyboard
  const octaves = 3;
  const startOctave = 3;

  for (let octave = startOctave; octave < startOctave + octaves; octave++) {
    const octaveDiv = document.createElement("div");
    octaveDiv.className = "octave";

    // White keys
    const whiteKeys = ["C", "D", "E", "F", "G", "A", "B"];
    whiteKeys.forEach((note) => {
      const key = document.createElement("div");
      key.className = "key white-key";
      key.dataset.note = `${note}${octave}`;
      key.textContent = note;
      octaveDiv.appendChild(key);
    });

    // Black keys
    const blackKeys = ["C#", "D#", null, "F#", "G#", "A#", null];
    blackKeys.forEach((note, index) => {
      if (note) {
        const key = document.createElement("div");
        key.className = "key black-key";
        key.dataset.note = `${note}${octave}`;
        key.style.left = `${index * 14.28 + 10}%`; // Position between white keys
        octaveDiv.appendChild(key);
      }
    });

    keyboard.appendChild(octaveDiv);
  }

  // Add keyboard event listeners
  const keys = keyboard.querySelectorAll(".key");
  keys.forEach((key) => {
    const element = key as HTMLElement;

    element.addEventListener("mousedown", () => {
      const note = element.dataset.note!;
      console.log("Playing note:", note);
      synth.noteOn(note);
      element.classList.add("active");
    });

    element.addEventListener("mouseup", () => {
      const note = element.dataset.note!;
      console.log("Note off (mouseup):", note);
      synth.noteOff(note);
      element.classList.remove("active");
    });

    element.addEventListener("mouseleave", () => {
      const note = element.dataset.note!;
      console.log("Note off (mouseleave):", note);
      synth.noteOff(note);
      element.classList.remove("active");
    });
  });

  // Computer keyboard mapping
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
      console.log("Computer keyboard note on:", note);
      synth.noteOn(note);
      // Highlight the corresponding visual key
      const visualKey = document.querySelector(`[data-note="${note}"]`);
      visualKey?.classList.add("active");
    }
  });

  document.addEventListener("keyup", (e) => {
    const note = keyMap[e.key.toLowerCase()];
    if (note) {
      console.log("Computer keyboard note off:", note);
      synth.noteOff(note);
      // Remove highlight from the corresponding visual key
      const visualKey = document.querySelector(`[data-note="${note}"]`);
      visualKey?.classList.remove("active");
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
