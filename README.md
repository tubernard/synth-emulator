# Synthesizer Emulator

A browser-based synthesizer loosely inspired by the Sequential Prophet Rev2. Built with TypeScript and Tone.js.

## What's Working

- **Dual Oscillators** with sawtooth, triangle, square, and pulse waves
- **Multimode Filter** (lowpass implementation)
- **ADSR Envelopes** for amplitude
- **Dual LFOs** that can modulate filter cutoff or oscillator frequencies
- **Basic Effects** - reverb, delay, and chorus
- **8-voice polyphony**
- **Hardware-style interface** with clickable knobs and buttons
- **Computer keyboard support** - play notes with ASDF keys

## Quick Start

### Development

```bash
npm install
npm run dev
```

### Building for Production

```bash
npm run build
npm run preview
```

Open your browser to localhost:5173 (dev) or localhost:4173 (preview) and start playing!

## How to Use

1. **Play notes** by clicking the keyboard or using your computer keys (A-S-D-F-G-H-J-K-L for white keys)
2. **Adjust parameters** by clicking and dragging knobs
3. **Change waveforms** by clicking the SHAPE buttons
4. **Activate LFOs** by clicking the numbered buttons (1 or 2) - only one can control a parameter at a time
5. **Configure effects** - reverb is enabled by default, adjust delay and chorus as needed

## Browser Support

Requires a modern browser with Web Audio API support.

## Deployment

### GitHub Pages (Automatic)

1. Push your code to GitHub
2. Go to **Settings** → **Pages** → **Source**: Select "**GitHub Actions**"
3. The workflow automatically builds and deploys on every push to main
