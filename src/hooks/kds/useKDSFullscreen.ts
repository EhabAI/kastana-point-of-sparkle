import { useState, useCallback, useEffect } from "react";

/**
 * Hook for KDS fullscreen mode
 * 
 * Features:
 * - Toggle fullscreen via button or "F" key
 * - Exit via button or ESC key
 * - Persists preference per session (sessionStorage)
 */
export function useKDSFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync state with actual fullscreen status
  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFullscreen = !!document.fullscreenElement;
      setIsFullscreen(inFullscreen);
      
      // Remember preference for this session
      sessionStorage.setItem("kds-fullscreen", inFullscreen ? "true" : "false");
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Restore fullscreen preference on mount
  useEffect(() => {
    const savedPreference = sessionStorage.getItem("kds-fullscreen");
    if (savedPreference === "true" && !document.fullscreenElement) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        document.documentElement.requestFullscreen().catch(() => {
          // Fullscreen request may fail if not triggered by user gesture
          // That's okay, we'll just not auto-fullscreen
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {
        // Fullscreen not supported or blocked
        console.warn("Fullscreen request failed");
      });
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  return {
    isFullscreen,
    toggleFullscreen,
    exitFullscreen,
  };
}
