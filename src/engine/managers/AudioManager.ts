import { Howl } from 'howler';
import { useUIStore } from '@/engine/state/useUIStore';

type SoundKey = string;

class AudioManager {
  private ambientSounds = new Map<SoundKey, Howl>();
  private sfxSounds = new Map<SoundKey, Howl>();
  private currentAmbient: SoundKey | null = null;

  registerAmbient(key: SoundKey, src: string[]): void {
    this.ambientSounds.set(key, new Howl({ src, loop: true, volume: this.effectiveVolume() }));
  }

  registerSfx(key: SoundKey, src: string[]): void {
    this.sfxSounds.set(key, new Howl({ src, volume: this.effectiveVolume() }));
  }

  playAmbient(key: SoundKey): void {
    const sound = this.ambientSounds.get(key);
    if (!sound) return;
    if (this.currentAmbient && this.currentAmbient !== key) {
      this.ambientSounds.get(this.currentAmbient)?.stop();
    }
    this.currentAmbient = key;
    if (!useUIStore.getState().audioMuted) sound.play();
  }

  stopAmbient(): void {
    if (!this.currentAmbient) return;
    this.ambientSounds.get(this.currentAmbient)?.stop();
    this.currentAmbient = null;
  }

  playSfx(key: SoundKey): void {
    const sound = this.sfxSounds.get(key);
    if (!sound || useUIStore.getState().audioMuted) return;
    sound.play();
  }

  private effectiveVolume(): number {
    return useUIStore.getState().volume;
  }
}

export const audioManager = new AudioManager();
