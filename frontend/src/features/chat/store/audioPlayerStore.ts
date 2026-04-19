import { useEffect, useState } from 'react';

type Listener = (uri: string | null) => void;

class AudioPlayerStore {
  private currentlyPlayingUri: string | null = null;
  private listeners: Set<Listener> = new Set();

  setPlaying(uri: string | null) {
    if (this.currentlyPlayingUri !== uri) {
      this.currentlyPlayingUri = uri;
      this.notify();
    }
  }

  getPlaying() {
    return this.currentlyPlayingUri;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.currentlyPlayingUri));
  }
}

// Instancia global compartida entre todos los componentes
export const audioPlayerStore = new AudioPlayerStore();

/**
 * Hook reactivo para obtener y modificar el audio actualmente en reproducción.
 * Actúa como un mini-Zustand.
 */
export const useAudioPlayerStore = () => {
  const [playingUri, setPlayingUri] = useState<string | null>(audioPlayerStore.getPlaying());

  useEffect(() => {
    const unsubscribe = audioPlayerStore.subscribe(setPlayingUri);
    return unsubscribe;
  }, []);

  return {
    currentlyPlayingUri: playingUri,
    setCurrentlyPlayingUri: (uri: string | null) => audioPlayerStore.setPlaying(uri)
  };
};
