// Kastana POS Assistant - Training Progress Tracker
// Lightweight localStorage-based progress tracking

export interface TrainingProgress {
  completedCards: string[];
  skippedCards: string[];
  lastSeenTimestamp: Record<string, number>;
  currentLevel: "beginner" | "intermediate" | "advanced";
  totalInteractions: number;
}

const PROGRESS_KEY = "kastana_training_progress";

/**
 * Get current training progress from localStorage
 */
export function getTrainingProgress(): TrainingProgress {
  try {
    const stored = localStorage.getItem(PROGRESS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  
  return {
    completedCards: [],
    skippedCards: [],
    lastSeenTimestamp: {},
    currentLevel: "beginner",
    totalInteractions: 0,
  };
}

/**
 * Save training progress to localStorage
 */
function saveProgress(progress: TrainingProgress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

/**
 * Mark a training card as completed
 */
export function completeCard(cardId: string): void {
  const progress = getTrainingProgress();
  
  if (!progress.completedCards.includes(cardId)) {
    progress.completedCards.push(cardId);
    progress.lastSeenTimestamp[cardId] = Date.now();
    
    // Remove from skipped if it was there
    progress.skippedCards = progress.skippedCards.filter(id => id !== cardId);
    
    // Update level based on completed count
    updateLevel(progress);
    
    saveProgress(progress);
  }
}

/**
 * Mark a training card as skipped
 */
export function skipCard(cardId: string): void {
  const progress = getTrainingProgress();
  
  if (!progress.skippedCards.includes(cardId) && !progress.completedCards.includes(cardId)) {
    progress.skippedCards.push(cardId);
    progress.lastSeenTimestamp[cardId] = Date.now();
    saveProgress(progress);
  }
}

/**
 * Check if a card is completed
 */
export function isCardCompleted(cardId: string): boolean {
  return getTrainingProgress().completedCards.includes(cardId);
}

/**
 * Check if a card was skipped
 */
export function isCardSkipped(cardId: string): boolean {
  return getTrainingProgress().skippedCards.includes(cardId);
}

/**
 * Record an interaction for level progression
 */
export function recordInteraction(): void {
  const progress = getTrainingProgress();
  progress.totalInteractions += 1;
  updateLevel(progress);
  saveProgress(progress);
}

/**
 * Update user level based on progress
 */
function updateLevel(progress: TrainingProgress): void {
  const completedCount = progress.completedCards.length;
  
  if (completedCount >= 10) {
    progress.currentLevel = "advanced";
  } else if (completedCount >= 5) {
    progress.currentLevel = "intermediate";
  } else {
    progress.currentLevel = "beginner";
  }
}

/**
 * Get suggested next card based on context
 */
export function getSuggestedNextCard(
  availableCards: string[],
  currentScreen?: string
): string | null {
  const progress = getTrainingProgress();
  
  // Filter out completed and skipped cards
  const unseenCards = availableCards.filter(
    cardId => 
      !progress.completedCards.includes(cardId) && 
      !progress.skippedCards.includes(cardId)
  );
  
  if (unseenCards.length === 0) {
    // If all cards seen, suggest re-learning skipped ones
    return progress.skippedCards[0] || null;
  }
  
  // Prioritize cards relevant to current screen
  if (currentScreen) {
    const screenRelevant = unseenCards.find(cardId => 
      cardId.includes(currentScreen.toLowerCase().replace("/", ""))
    );
    if (screenRelevant) return screenRelevant;
  }
  
  // Return first unseen card
  return unseenCards[0];
}

/**
 * Reset all training progress
 */
export function resetTrainingProgress(): void {
  localStorage.removeItem(PROGRESS_KEY);
}

/**
 * Get progress statistics
 */
export function getProgressStats(): {
  completed: number;
  skipped: number;
  level: string;
  totalInteractions: number;
} {
  const progress = getTrainingProgress();
  return {
    completed: progress.completedCards.length,
    skipped: progress.skippedCards.length,
    level: progress.currentLevel,
    totalInteractions: progress.totalInteractions,
  };
}

/**
 * Un-skip a card (for re-learning)
 */
export function unskipCard(cardId: string): void {
  const progress = getTrainingProgress();
  progress.skippedCards = progress.skippedCards.filter(id => id !== cardId);
  saveProgress(progress);
}
