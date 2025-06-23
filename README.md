# Synthesizer Emulator

A browser-based software synthesizer inspired by the Sequential Prophet Rev2 analog synthesizer, built with TypeScript and Web Audio API.

## Features

### Core Synthesizer Components

- **Dual Oscillators**: Two independent oscillators with multiple waveforms (sawtooth, triangle, square, pulse)
- **Multimode Filter**: Low-pass, high-pass, band-pass, and notch filters with resonance control
- **ADSR Envelopes**: Amplitude and filter envelopes with full ADSR control
- **LFO**: Low-frequency oscillator with multiple destinations (pitch, filter, amplitude)
- **Effects**: Built-in reverb, delay, and chorus effects
- **Polyphonic Voice Management**: 8-voice polyphony with intelligent voice allocation

### Interface Features

- **Realistic Knob Controls**: Mouse-draggable knobs that mimic hardware behavior
- **Visual Feedback**: Real-time parameter changes with smooth animations
- **Piano Keyboard**: Clickable on-screen keyboard with mouse support
- **Computer Keyboard**: Play notes using your computer keyboard (ASDF... keys)
- **Professional Synthesizer Design**: Authentic color scheme and hardware-inspired layout

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Modern web browser with Web Audio API support

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd synthesizer-emulator

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Usage

1. **Power On**: Click the POWER button to start the audio engine
2. **Play Notes**:
   - Click on the on-screen keyboard
   - Use computer keyboard keys: A-S-D-F-G-H-J-K-L for white keys, W-E-T-Y-U-O-P for black keys
3. **Adjust Parameters**: Click and drag knobs to change synthesizer parameters
4. **Select Waveforms**: Click waveform buttons to change oscillator types
5. **Control Filter**: Use filter type buttons and knobs to shape the sound
6. **Add Effects**: Adjust reverb, delay, and chorus levels

## Architecture

The synthesizer is built with a modular architecture:

- **SynthEngine**: Main synthesizer class managing voices and parameters
- **Voice**: Individual voice with oscillators, filter, and envelopes
- **Effects**: Audio effects processing chain
- **UI Interface**: User interface controls and keyboard management

## Technical Details

- **Web Audio API**: Native browser audio processing
- **Tone.js**: Enhanced Web Audio API functionality
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and development server
- **CSS**: Hardware-inspired visual design

## Browser Compatibility

- Chrome 66+
- Firefox 60+
- Safari 11.1+
- Edge 79+

## Performance Notes

- Optimized for real-time audio processing
- Efficient voice allocation and management
- Smooth parameter automation
- Low-latency keyboard input

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Sequential Circuits for the original Prophet Rev2 design
- Tone.js team for the excellent Web Audio API library
- Web Audio API specification contributors
