/**
 * Real Web Audio API synthesizer for playing synthetic demo tracks and handling audio file playback.
 */

class SynthAudioEngine {
  private ctx: AudioContext | null = null;
  private currentOscillators: (OscillatorNode | AudioBufferSourceNode)[] = [];
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isPlaying = false;
  private isPaused = false;
  private intervalId: number | null = null;
  private volume = 0.8;
  private isMuted = false;
  private currentTrackDuration = 180;
  private currentPosition = 0;
  private onPositionUpdate: ((pos: number) => void) | null = null;
  private onEnded: (() => void) | null = null;

  // Real audio file element
  private audioElement: HTMLAudioElement | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;
  private isRealAudio = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.gainNode = this.ctx.createGain();
      this.analyserNode = this.ctx.createAnalyser();
      this.analyserNode.fftSize = 64;
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.ctx.destination);
      this.gainNode.gain.value = this.isMuted ? 0 : this.volume;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setCallbacks(onPosition: (pos: number) => void, onEnd: () => void) {
    this.onPositionUpdate = onPosition;
    this.onEnded = onEnd;
  }

  public playSyntheticTrack(trackSeed: number, durationSeconds: number, startAt = 0) {
    this.stop();
    this.initContext();
    this.isRealAudio = false;
    this.currentTrackDuration = durationSeconds;
    this.currentPosition = startAt;
    this.isPlaying = true;
    this.isPaused = false;

    if (!this.ctx || !this.gainNode) return;

    // Harmonized pentatonic arpeggio chords based on track seed
    const baseFreqs = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00];
    const rootIdx = (trackSeed * 3) % (baseFreqs.length - 4);
    const chord = [baseFreqs[rootIdx], baseFreqs[rootIdx + 2], baseFreqs[rootIdx + 4]];

    // Create 3 atmospheric oscillators
    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.gainNode) return;
      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      osc.type = idx === 0 ? 'triangle' : idx === 1 ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(freq * (idx === 2 ? 0.5 : 1), this.ctx.currentTime);

      // Gentle LFO vibrato
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.5 + idx * 0.2, this.ctx.currentTime);
      lfoGain.gain.setValueAtTime(3.0, this.ctx.currentTime);
      lfo.connect(osc.frequency);
      lfo.start();
      this.currentOscillators.push(lfo);

      noteGain.gain.setValueAtTime(idx === 2 ? 0.04 : 0.08, this.ctx.currentTime);
      osc.connect(noteGain);
      noteGain.connect(this.gainNode);
      osc.start();
      this.currentOscillators.push(osc);
    });

    // Time ticker
    this.intervalId = window.setInterval(() => {
      if (this.isPlaying && !this.isPaused) {
        this.currentPosition += 0.25;
        if (this.onPositionUpdate) {
          this.onPositionUpdate(this.currentPosition);
        }
        if (this.currentPosition >= this.currentTrackDuration) {
          this.stop();
          if (this.onEnded) this.onEnded();
        }
      }
    }, 250);
  }

  public playAudioFile(fileUrl: string, startAt = 0) {
    this.stop();
    this.initContext();
    this.isRealAudio = true;

    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.crossOrigin = 'anonymous';
      if (this.ctx && this.gainNode) {
        this.mediaSourceNode = this.ctx.createMediaElementSource(this.audioElement);
        this.mediaSourceNode.connect(this.gainNode);
      }
    }

    this.audioElement.src = fileUrl;
    this.audioElement.currentTime = startAt;
    this.audioElement.play().catch(e => console.warn('Audio play prevented', e));
    this.isPlaying = true;
    this.isPaused = false;

    this.audioElement.ontimeupdate = () => {
      if (this.audioElement && this.onPositionUpdate) {
        this.currentPosition = this.audioElement.currentTime;
        this.onPositionUpdate(this.audioElement.currentTime);
      }
    };

    this.audioElement.onended = () => {
      this.isPlaying = false;
      if (this.onEnded) this.onEnded();
    };
  }

  public pause() {
    this.isPaused = true;
    if (this.isRealAudio && this.audioElement) {
      this.audioElement.pause();
    }
  }

  public resume() {
    this.isPaused = false;
    if (this.isRealAudio && this.audioElement) {
      this.audioElement.play().catch(console.warn);
    }
  }

  public stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentPosition = 0;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.currentOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore already stopped
      }
    });
    this.currentOscillators = [];

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }

    if (this.onPositionUpdate) {
      this.onPositionUpdate(0);
    }
  }

  public seek(seconds: number) {
    this.currentPosition = seconds;
    if (this.isRealAudio && this.audioElement) {
      this.audioElement.currentTime = seconds;
    }
    if (this.onPositionUpdate) {
      this.onPositionUpdate(seconds);
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyserNode || !this.isPlaying || this.isPaused) {
      return new Uint8Array(32);
    }
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data);
    return data;
  }

  public getPlaybackState() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      position: this.currentPosition,
      volume: this.volume,
      isMuted: this.isMuted,
    };
  }
}

export const audioSynth = new SynthAudioEngine();
