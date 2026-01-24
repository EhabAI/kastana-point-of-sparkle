// Kastana POS System Trainer - Training Engine
// Unified engine for guided tours and training modules

import { 
  TrainingModule, 
  TrainingStep, 
  getModuleById, 
  getFirstShiftModules,
  getModulesForRole 
} from "./trainerRegistry";

// ============================================
// TYPES
// ============================================

export interface TrainerProgress {
  completedModules: string[];
  currentModule: string | null;
  currentStep: number;
  firstShiftCompleted: Record<string, boolean>; // role -> completed
  lastActiveTimestamp: number;
  totalStepsCompleted: number;
}

export interface ActiveTraining {
  module: TrainingModule;
  currentStep: number;
  isActive: boolean;
}

// ============================================
// LOCAL STORAGE
// ============================================

const TRAINER_PROGRESS_KEY = "kastana_trainer_progress";

/**
 * Get trainer progress from localStorage
 */
export function getTrainerProgress(): TrainerProgress {
  try {
    const stored = localStorage.getItem(TRAINER_PROGRESS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return {
    completedModules: [],
    currentModule: null,
    currentStep: 0,
    firstShiftCompleted: {},
    lastActiveTimestamp: 0,
    totalStepsCompleted: 0,
  };
}

/**
 * Save trainer progress to localStorage
 */
function saveTrainerProgress(progress: TrainerProgress): void {
  progress.lastActiveTimestamp = Date.now();
  localStorage.setItem(TRAINER_PROGRESS_KEY, JSON.stringify(progress));
}

// ============================================
// TRAINING STATE
// ============================================

/**
 * Check if user needs first-shift training for a role
 */
export function needsFirstShiftTraining(role: string): boolean {
  const progress = getTrainerProgress();
  return !progress.firstShiftCompleted[role];
}

/**
 * Check if a module is completed
 */
export function isModuleCompleted(moduleId: string): boolean {
  const progress = getTrainerProgress();
  return progress.completedModules.includes(moduleId);
}

/**
 * Get current active training (if any)
 */
export function getActiveTraining(): ActiveTraining | null {
  const progress = getTrainerProgress();
  
  if (!progress.currentModule) return null;
  
  const module = getModuleById(progress.currentModule);
  if (!module) return null;
  
  return {
    module,
    currentStep: progress.currentStep,
    isActive: true,
  };
}

/**
 * Get current step of active training
 */
export function getCurrentStep(): TrainingStep | null {
  const active = getActiveTraining();
  if (!active) return null;
  
  return active.module.steps[active.currentStep] || null;
}

// ============================================
// TRAINING ACTIONS
// ============================================

/**
 * Start a training module
 */
export function startModule(moduleId: string): ActiveTraining | null {
  const module = getModuleById(moduleId);
  if (!module) return null;
  
  const progress = getTrainerProgress();
  progress.currentModule = moduleId;
  progress.currentStep = 0;
  saveTrainerProgress(progress);
  
  return {
    module,
    currentStep: 0,
    isActive: true,
  };
}

/**
 * Start first-shift training for a role
 */
export function startFirstShiftTraining(role: string): ActiveTraining | null {
  const modules = getFirstShiftModules(role);
  if (modules.length === 0) return null;
  
  return startModule(modules[0].id);
}

/**
 * Go to next step in training
 */
export function nextStep(): { completed: boolean; step: TrainingStep | null } {
  const progress = getTrainerProgress();
  
  if (!progress.currentModule) {
    return { completed: true, step: null };
  }
  
  const module = getModuleById(progress.currentModule);
  if (!module) {
    return { completed: true, step: null };
  }
  
  const nextStepIndex = progress.currentStep + 1;
  
  if (nextStepIndex >= module.steps.length) {
    // Module completed
    completeModule(progress.currentModule);
    return { completed: true, step: null };
  }
  
  // Move to next step
  progress.currentStep = nextStepIndex;
  progress.totalStepsCompleted += 1;
  saveTrainerProgress(progress);
  
  return { 
    completed: false, 
    step: module.steps[nextStepIndex] 
  };
}

/**
 * Go to previous step
 */
export function previousStep(): TrainingStep | null {
  const progress = getTrainerProgress();
  
  if (!progress.currentModule || progress.currentStep <= 0) {
    return null;
  }
  
  progress.currentStep -= 1;
  saveTrainerProgress(progress);
  
  const module = getModuleById(progress.currentModule);
  return module?.steps[progress.currentStep] || null;
}

/**
 * Complete current module
 */
export function completeModule(moduleId: string): void {
  const progress = getTrainerProgress();
  
  if (!progress.completedModules.includes(moduleId)) {
    progress.completedModules.push(moduleId);
  }
  
  // Check if this was a first-shift module
  const module = getModuleById(moduleId);
  if (module?.isFirstShift) {
    module.roles.forEach(role => {
      progress.firstShiftCompleted[role] = true;
    });
  }
  
  // Clear current module
  progress.currentModule = null;
  progress.currentStep = 0;
  saveTrainerProgress(progress);
}

/**
 * Skip current module
 */
export function skipModule(): void {
  const progress = getTrainerProgress();
  progress.currentModule = null;
  progress.currentStep = 0;
  saveTrainerProgress(progress);
}

/**
 * Exit training without completing
 */
export function exitTraining(): void {
  const progress = getTrainerProgress();
  progress.currentModule = null;
  progress.currentStep = 0;
  saveTrainerProgress(progress);
}

// ============================================
// PROGRESS STATS
// ============================================

/**
 * Get training progress statistics
 */
export function getTrainingStats(role: string): {
  completedCount: number;
  totalCount: number;
  percentage: number;
  firstShiftDone: boolean;
} {
  const progress = getTrainerProgress();
  const allModules = getModulesForRole(role);
  
  const completedCount = progress.completedModules.filter(id => 
    allModules.some(m => m.id === id)
  ).length;
  
  return {
    completedCount,
    totalCount: allModules.length,
    percentage: allModules.length > 0 
      ? Math.round((completedCount / allModules.length) * 100) 
      : 0,
    firstShiftDone: progress.firstShiftCompleted[role] || false,
  };
}

/**
 * Reset all training progress
 */
export function resetTrainerProgress(): void {
  localStorage.removeItem(TRAINER_PROGRESS_KEY);
}

/**
 * Mark first shift as completed for a role (manual skip)
 */
export function markFirstShiftCompleted(role: string): void {
  const progress = getTrainerProgress();
  progress.firstShiftCompleted[role] = true;
  saveTrainerProgress(progress);
}
