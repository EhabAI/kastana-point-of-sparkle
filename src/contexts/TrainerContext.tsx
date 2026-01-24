// Kastana POS System Trainer Context
// Global context for trainer state and explain mode

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import {
  getActiveTraining,
  getCurrentStep,
  startModule,
  startFirstShiftTraining,
  nextStep,
  exitTraining,
  skipModule,
  completeModule,
  needsFirstShiftTraining,
  getTrainingStats,
  markFirstShiftCompleted,
  type ActiveTraining,
} from "@/lib/trainerEngine";
import {
  getElementById,
  getElementsByScreen,
  type UIElement,
  type TrainingStep,
  type TrainingModule,
} from "@/lib/trainerRegistry";

// ============================================
// TYPES
// ============================================

export type TrainerMode = "off" | "training" | "explain";

interface TrainerState {
  mode: TrainerMode;
  activeTraining: ActiveTraining | null;
  currentStep: TrainingStep | null;
  explainElement: UIElement | null;
  showFirstShiftPrompt: boolean;
}

interface TrainerActions {
  // Mode control
  setMode: (mode: TrainerMode) => void;
  
  // Training control
  beginTraining: (moduleId: string) => void;
  beginFirstShift: () => void;
  goNextStep: () => void;
  goPreviousStep: () => void;
  endTraining: () => void;
  skipCurrentModule: () => void;
  dismissFirstShiftPrompt: () => void;
  
  // Explain mode
  explainElementById: (elementId: string) => void;
  clearExplanation: () => void;
  
  // Stats
  getStats: () => { completedCount: number; totalCount: number; percentage: number; firstShiftDone: boolean };
  
  // Utilities
  getScreenElements: () => UIElement[];
}

interface TrainerContextValue extends TrainerState, TrainerActions {}

// ============================================
// CONTEXT
// ============================================

const TrainerContext = createContext<TrainerContextValue | null>(null);

export function TrainerProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { role } = useAuth();
  
  const [mode, setModeState] = useState<TrainerMode>("off");
  const [activeTraining, setActiveTraining] = useState<ActiveTraining | null>(null);
  const [currentStep, setCurrentStep] = useState<TrainingStep | null>(null);
  const [explainElement, setExplainElement] = useState<UIElement | null>(null);
  const [showFirstShiftPrompt, setShowFirstShiftPrompt] = useState(false);
  
  // Get current screen ID from path
  const getScreenId = useCallback(() => {
    const path = location.pathname;
    if (path.includes("/pos")) return "pos";
    if (path.includes("/admin")) return "owner";
    if (path.includes("/kds")) return "kds";
    if (path.includes("/system-admin")) return "system_admin";
    return "unknown";
  }, [location.pathname]);
  
  // Check for first-shift prompt on mount/role change
  useEffect(() => {
    if (role && needsFirstShiftTraining(role)) {
      // Delay prompt to not interrupt initial load
      const timer = setTimeout(() => {
        setShowFirstShiftPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [role]);
  
  // Sync active training state
  useEffect(() => {
    const active = getActiveTraining();
    setActiveTraining(active);
    if (active) {
      setCurrentStep(getCurrentStep());
      setModeState("training");
    }
  }, []);
  
  // ============================================
  // MODE CONTROL
  // ============================================
  
  const setMode = useCallback((newMode: TrainerMode) => {
    setModeState(newMode);
    if (newMode === "off") {
      setExplainElement(null);
    }
  }, []);
  
  // ============================================
  // TRAINING CONTROL
  // ============================================
  
  const beginTraining = useCallback((moduleId: string) => {
    const training = startModule(moduleId);
    if (training) {
      setActiveTraining(training);
      setCurrentStep(training.module.steps[0] || null);
      setModeState("training");
    }
  }, []);
  
  const beginFirstShift = useCallback(() => {
    if (!role) return;
    
    const training = startFirstShiftTraining(role);
    if (training) {
      setActiveTraining(training);
      setCurrentStep(training.module.steps[0] || null);
      setModeState("training");
      setShowFirstShiftPrompt(false);
    }
  }, [role]);
  
  const goNextStep = useCallback(() => {
    const result = nextStep();
    
    if (result.completed) {
      setActiveTraining(null);
      setCurrentStep(null);
      setModeState("off");
    } else {
      setCurrentStep(result.step);
      // Refresh active training state
      setActiveTraining(getActiveTraining());
    }
  }, []);
  
  const goPreviousStep = useCallback(() => {
    // For now, just refresh the state
    const active = getActiveTraining();
    setActiveTraining(active);
    setCurrentStep(getCurrentStep());
  }, []);
  
  const endTraining = useCallback(() => {
    exitTraining();
    setActiveTraining(null);
    setCurrentStep(null);
    setModeState("off");
  }, []);
  
  const skipCurrentModule = useCallback(() => {
    skipModule();
    setActiveTraining(null);
    setCurrentStep(null);
    setModeState("off");
  }, []);
  
  const dismissFirstShiftPrompt = useCallback(() => {
    if (role) {
      markFirstShiftCompleted(role);
    }
    setShowFirstShiftPrompt(false);
  }, [role]);
  
  // ============================================
  // EXPLAIN MODE
  // ============================================
  
  const explainElementById = useCallback((elementId: string) => {
    const element = getElementById(elementId);
    if (element) {
      setExplainElement(element);
      setModeState("explain");
    }
  }, []);
  
  const clearExplanation = useCallback(() => {
    setExplainElement(null);
    if (mode === "explain") {
      setModeState("off");
    }
  }, [mode]);
  
  // ============================================
  // UTILITIES
  // ============================================
  
  const getStats = useCallback(() => {
    if (!role) {
      return { completedCount: 0, totalCount: 0, percentage: 0, firstShiftDone: true };
    }
    return getTrainingStats(role);
  }, [role]);
  
  const getScreenElements = useCallback(() => {
    return getElementsByScreen(getScreenId());
  }, [getScreenId]);
  
  // ============================================
  // CONTEXT VALUE
  // ============================================
  
  const value: TrainerContextValue = {
    // State
    mode,
    activeTraining,
    currentStep,
    explainElement,
    showFirstShiftPrompt,
    
    // Actions
    setMode,
    beginTraining,
    beginFirstShift,
    goNextStep,
    goPreviousStep,
    endTraining,
    skipCurrentModule,
    dismissFirstShiftPrompt,
    explainElementById,
    clearExplanation,
    getStats,
    getScreenElements,
  };
  
  return (
    <TrainerContext.Provider value={value}>
      {children}
    </TrainerContext.Provider>
  );
}

export function useTrainer() {
  const context = useContext(TrainerContext);
  if (!context) {
    throw new Error("useTrainer must be used within TrainerProvider");
  }
  return context;
}
