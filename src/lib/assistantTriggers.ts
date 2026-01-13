// Kastana POS Assistant - Training Card Triggers
// Manages when training cards should be shown based on user behavior

export type TriggerType = 
  | "screen_visit" 
  | "feature_use" 
  | "system_update" 
  | "repeated_error";

interface TriggerState {
  visitedScreens: string[];
  usedFeatures: string[];
  acknowledgedUpdates: string[];
  errorCounts: Record<string, number>;
  triggeredCards: Record<string, string[]>; // triggerType -> cardIds shown
  lastVersion: string;
}

// Storage key
const TRIGGER_STATE_KEY = "kastana_training_triggers";
const CURRENT_VERSION = "1.2.0"; // Update this when adding new features

// Screen to card mappings
const SCREEN_CARDS: Record<string, string> = {
  "/pos": "training_shift_open",
  "/admin": "training_z_report",
  "/admin?tab=inventory": "training_inventory_count",
  "/admin?tab=reports": "training_z_report",
};

// Feature to card mappings
const FEATURE_CARDS: Record<string, string> = {
  "hold_order": "training_hold_order",
  "payment": "training_payment_flow",
  "refund": "training_refund",
  "stock_count": "training_inventory_count",
};

// Error action to card mappings (for repeated errors)
const ERROR_CARDS: Record<string, string> = {
  "pay_button_disabled": "training_shift_open",
  "hold_empty_order": "training_hold_order",
  "refund_unpaid_order": "training_refund",
};

// New feature cards per version
const VERSION_CARDS: Record<string, string[]> = {
  "1.1.0": ["training_hold_order"],
  "1.2.0": ["training_inventory_count"],
};

/**
 * Get current trigger state from localStorage
 */
function getTriggerState(): TriggerState {
  try {
    const stored = localStorage.getItem(TRIGGER_STATE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return {
    visitedScreens: [],
    usedFeatures: [],
    acknowledgedUpdates: [],
    errorCounts: {},
    triggeredCards: {},
    lastVersion: "",
  };
}

/**
 * Save trigger state to localStorage
 */
function saveTriggerState(state: TriggerState): void {
  localStorage.setItem(TRIGGER_STATE_KEY, JSON.stringify(state));
}

/**
 * Check if a card was already triggered for a specific trigger type
 */
function wasCardTriggered(triggerType: TriggerType, cardId: string): boolean {
  const state = getTriggerState();
  const triggered = state.triggeredCards[triggerType] || [];
  return triggered.includes(cardId);
}

/**
 * Mark a card as triggered for a specific trigger type
 */
export function markCardTriggered(triggerType: TriggerType, cardId: string): void {
  const state = getTriggerState();
  if (!state.triggeredCards[triggerType]) {
    state.triggeredCards[triggerType] = [];
  }
  if (!state.triggeredCards[triggerType].includes(cardId)) {
    state.triggeredCards[triggerType].push(cardId);
    saveTriggerState(state);
  }
}

/**
 * Check for first-time screen visit trigger
 * Returns card ID if trigger should fire, null otherwise
 */
export function checkScreenVisitTrigger(screenPath: string): string | null {
  const state = getTriggerState();
  
  // Normalize path (remove query params for base matching)
  const basePath = screenPath.split("?")[0];
  const fullPath = screenPath;
  
  // Check both full path and base path
  const cardId = SCREEN_CARDS[fullPath] || SCREEN_CARDS[basePath];
  
  if (!cardId) return null;
  
  // Check if screen was already visited
  if (state.visitedScreens.includes(fullPath)) return null;
  
  // Check if card was already triggered
  if (wasCardTriggered("screen_visit", cardId)) return null;
  
  // Mark screen as visited
  state.visitedScreens.push(fullPath);
  saveTriggerState(state);
  
  return cardId;
}

/**
 * Check for first-time feature use trigger
 */
export function checkFeatureUseTrigger(featureId: string): string | null {
  const state = getTriggerState();
  const cardId = FEATURE_CARDS[featureId];
  
  if (!cardId) return null;
  
  // Check if feature was already used
  if (state.usedFeatures.includes(featureId)) return null;
  
  // Check if card was already triggered
  if (wasCardTriggered("feature_use", cardId)) return null;
  
  // Mark feature as used
  state.usedFeatures.push(featureId);
  saveTriggerState(state);
  
  return cardId;
}

/**
 * Check for system update trigger (new features)
 */
export function checkSystemUpdateTrigger(): string[] {
  const state = getTriggerState();
  const cardIds: string[] = [];
  
  // Check if version changed
  if (state.lastVersion !== CURRENT_VERSION) {
    // Find new cards for versions after last version
    for (const [version, cards] of Object.entries(VERSION_CARDS)) {
      if (version > state.lastVersion && !state.acknowledgedUpdates.includes(version)) {
        for (const cardId of cards) {
          if (!wasCardTriggered("system_update", cardId)) {
            cardIds.push(cardId);
          }
        }
        state.acknowledgedUpdates.push(version);
      }
    }
    
    // Update last version
    state.lastVersion = CURRENT_VERSION;
    saveTriggerState(state);
  }
  
  return cardIds;
}

/**
 * Record a user error and check if it triggers a training card
 * Returns card ID if error threshold (3) is reached
 */
export function recordErrorAndCheckTrigger(errorAction: string): string | null {
  const state = getTriggerState();
  const cardId = ERROR_CARDS[errorAction];
  
  if (!cardId) return null;
  
  // Increment error count
  state.errorCounts[errorAction] = (state.errorCounts[errorAction] || 0) + 1;
  saveTriggerState(state);
  
  // Check if threshold reached (3 times)
  if (state.errorCounts[errorAction] >= 3) {
    // Check if card was already triggered for this error
    if (wasCardTriggered("repeated_error", cardId)) return null;
    
    // Reset error count
    state.errorCounts[errorAction] = 0;
    saveTriggerState(state);
    
    return cardId;
  }
  
  return null;
}

/**
 * Get all triggered card IDs (for "View Training" feature)
 */
export function getTriggeredCardIds(): string[] {
  const state = getTriggerState();
  const allTriggered = new Set<string>();
  
  for (const cardIds of Object.values(state.triggeredCards)) {
    for (const cardId of cardIds) {
      allTriggered.add(cardId);
    }
  }
  
  return Array.from(allTriggered);
}

/**
 * Reset all triggers (for testing/support)
 */
export function resetAllTriggers(): void {
  localStorage.removeItem(TRIGGER_STATE_KEY);
}

/**
 * Get current app version
 */
export function getCurrentVersion(): string {
  return CURRENT_VERSION;
}
