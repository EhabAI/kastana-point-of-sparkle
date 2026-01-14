import { useRef, useCallback } from "react";

// Using a simple beep sound as a data URL (no external file needed)
const NOTIFICATION_SOUND_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQoAHIHO8NVUDwBIiOH/wkwAAFOG3v+8RgAAX4PZ/7NDAABrf9X/sEEAAHV70v+tQAAAf3jQ/6o/AACIdM3/pz4AAJBwzP+lPQAAlm3J/6I8AACab8f/nzsAAJ5xyP+dOgAAonTH/5s5AACldsb/mDkAAKl4x/+WOAAAq3nH/5Q3AACuesj/kjYAAK98yf+QNgAAr33K/404AACwf8n/izcAALF/y/+JNwAAsoHL/4c2AACzgMz/hTYAALSBzP+DNgAAtYLN/4E1AAC1gc3/fzUAALaCzv99NAAAtoHO/3s0AAC2gc7/ejQAALaBzv94NAAAtoDP/3Y0AAC2gM//dDQAALaAz/9zNAAAtoDQ/3E0AAC1gND/cDQAALaA0P9uNAAAtYDQ/2w0AAC1gNH/azQAALWA0f9qNAAAtYDR/2g0AAC1gNH/ZzQAALWA0f9mNAAAtoDR/2U0AAC1gNH/YzQAALWA0f9iNAAAtYDR/2E0AAC1gNL/YDQAALaA0v9fNAAAtoDR/140AAC2gNL/XTQAALaA0v9cNAAAtoDT/1s0AAC2gNP/WjQAALaA0/9ZNQC2gNP/WDUC";

export function useKDSSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedRef = useRef<Set<string>>(new Set());

  const playSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
        audioRef.current.volume = 0.5;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  }, []);

  const playOnceForOrder = useCallback((orderId: string) => {
    if (lastPlayedRef.current.has(orderId)) {
      return; // Already played for this order
    }
    lastPlayedRef.current.add(orderId);
    playSound();
    
    // Clean up old entries after 5 minutes to prevent memory leak
    setTimeout(() => {
      lastPlayedRef.current.delete(orderId);
    }, 5 * 60 * 1000);
  }, [playSound]);

  const clearPlayedOrders = useCallback(() => {
    lastPlayedRef.current.clear();
  }, []);

  return { playSound, playOnceForOrder, clearPlayedOrders };
}
