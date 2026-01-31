// Owner Training Panel - Multi-Track Training UI
// Non-blocking, progressive guidance through multiple training phases

import { useEffect, useState, useCallback } from "react";
import { 
  ChevronRight, Settings, SkipForward, CheckCircle2, Sparkles, 
  Play, Pause, BookOpen, Layers, BarChart3, Building2, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  type TrainingStep,
  type TrainingAction,
  type TrackId,
  type TrainingTrack,
  getCurrentStep,
  getCurrentTrack,
  getTrack,
  startTrack,
  startOwnerTraining,
  resumeOwnerTraining,
  nextStep,
  pauseOwnerTraining,
  completeCurrentTrack,
  goToSettingsStep,
  getOverallProgress,
  getTrackProgress,
  isOwnerTrainingActive,
  isOwnerTrainingPaused,
  isOwnerTrainingCompleted,
  isTrackCompleted,
  ownerNeedsTraining,
  getCompletedTracks,
  getAvailableTracks,
  getNextRecommendedTrack,
  TRAINING_TRACKS,
  recordFirstLogin,
} from "@/lib/ownerTrainingFlow";

interface OwnerTrainingPanelProps {
  language: "ar" | "en";
  onNavigateToSettings?: () => void;
  onNavigateToTab?: (tab: string) => void;
  onTrainingStateChange?: (active: boolean) => void;
}

export function OwnerTrainingPanel({ 
  language, 
  onNavigateToSettings,
  onNavigateToTab,
  onTrainingStateChange 
}: OwnerTrainingPanelProps) {
  const [currentStep, setCurrentStep] = useState<TrainingStep | null>(null);
  const [currentTrack, setCurrentTrack] = useState<TrainingTrack | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [trackProgress, setTrackProgress] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showTrackList, setShowTrackList] = useState(false);

  // Load initial state
  useEffect(() => {
    refreshState();
    // Record first login for trigger tracking
    recordFirstLogin();
  }, []);

  const refreshState = useCallback(() => {
    const active = isOwnerTrainingActive();
    const paused = isOwnerTrainingPaused();
    const completed = isOwnerTrainingCompleted();
    
    setIsActive(active);
    setIsPaused(paused);
    setIsCompleted(completed);
    setOverallProgress(getOverallProgress());
    
    if (active) {
      const step = getCurrentStep();
      const track = getCurrentTrack();
      setCurrentStep(step);
      setCurrentTrack(track);
      if (track) {
        setTrackProgress(getTrackProgress(track.id));
      }
    } else {
      setCurrentStep(null);
      setCurrentTrack(null);
    }
  }, []);

  // Notify parent of state changes
  useEffect(() => {
    onTrainingStateChange?.(isActive);
  }, [isActive, onTrainingStateChange]);

  // Handle starting training
  const handleStart = useCallback(() => {
    const step = startOwnerTraining();
    if (step) {
      refreshState();
    }
  }, [refreshState]);

  // Handle starting a specific track
  const handleStartTrack = useCallback((trackId: TrackId) => {
    const step = startTrack(trackId);
    if (step) {
      refreshState();
      setShowTrackList(false);
    }
  }, [refreshState]);

  // Handle resuming training
  const handleResume = useCallback(() => {
    const step = resumeOwnerTraining();
    if (step) {
      refreshState();
    }
  }, [refreshState]);

  // Handle pausing training
  const handlePause = useCallback(() => {
    pauseOwnerTraining();
    refreshState();
  }, [refreshState]);

  // Handle action button clicks
  const handleAction = useCallback((action: TrainingAction) => {
    switch (action.type) {
      case "next": {
        const next = nextStep();
        if (next) {
          refreshState();
        } else {
          // End of track
          completeCurrentTrack();
          refreshState();
        }
        break;
      }
      
      case "navigate": {
        // Navigate to the specified tab
        if (action.navigateTo === "settings") {
          goToSettingsStep();
          onNavigateToSettings?.();
        } else if (action.navigateTo) {
          onNavigateToTab?.(action.navigateTo);
        }
        const next = nextStep();
        if (next) {
          refreshState();
        }
        break;
      }
      
      case "skip": {
        pauseOwnerTraining();
        refreshState();
        break;
      }
      
      case "finish_track": {
        completeCurrentTrack();
        refreshState();
        break;
      }
    }
  }, [refreshState, onNavigateToSettings, onNavigateToTab]);

  const labels = {
    title: language === "ar" ? "🎓 تدريب المالك" : "🎓 Owner Training",
    startTraining: language === "ar" ? "ابدأ" : "Start",
    resumeTraining: language === "ar" ? "إكمال التدريب" : "Continue Training",
    pauseTraining: language === "ar" ? "إيقاف مؤقت" : "Pause",
    trainingPaused: language === "ar" ? "التدريب متوقف مؤقتاً" : "Training Paused",
    trainingComplete: language === "ar" ? "تم إكمال جميع المراحل ✓" : "All Tracks Complete ✓",
    overallProgress: language === "ar" ? "التقدم الكلي" : "Overall Progress",
    trackProgress: language === "ar" ? "تقدم المرحلة" : "Track Progress",
    needsTraining: language === "ar" 
      ? "ابدأ جولة سريعة للتعرف على النظام" 
      : "Start a quick tour to learn the system",
    viewAllTracks: language === "ar" ? "عرض المراحل" : "View Tracks",
    completedTracks: language === "ar" ? "مراحل مكتملة" : "Completed Tracks",
    availableTracks: language === "ar" ? "مراحل متاحة" : "Available Tracks",
    startTrack: language === "ar" ? "ابدأ" : "Start",
    completed: language === "ar" ? "مكتمل" : "Completed",
    recommended: language === "ar" ? "موصى به" : "Recommended",
  };

  // Get current stage name based on progress percentage (9 stages)
  const getCurrentStageName = (progress: number): { ar: string; en: string } => {
    if (progress < 15) {
      return { ar: "الإعدادات الأساسية", en: "Basic Settings" };
    } else if (progress < 25) {
      return { ar: "المستخدمين", en: "Users & Roles" };
    } else if (progress < 45) {
      return { ar: "القائمة", en: "Menu Setup" };
    } else if (progress < 55) {
      return { ar: "العروض", en: "Offers" };
    } else if (progress < 65) {
      return { ar: "إدارة الطاولات", en: "Table Management" };
    } else if (progress < 80) {
      return { ar: "الكاشيير", en: "POS Operation" };
    } else if (progress < 90) {
      return { ar: "المتابعة اليومية", en: "Daily Monitoring" };
    } else if (progress < 95) {
      return { ar: "الفروع", en: "Branches" };
    } else {
      return { ar: "الخلاصة", en: "Final" };
    }
  };

  const getTrackIcon = (trackId: TrackId) => {
    switch (trackId) {
      case "getting_started": return <Sparkles className="h-4 w-4" />;
      case "daily_operations": return <BookOpen className="h-4 w-4" />;
      case "insights_reports": return <BarChart3 className="h-4 w-4" />;
      case "management_expansion": return <Building2 className="h-4 w-4" />;
      default: return <Layers className="h-4 w-4" />;
    }
  };

  // Get action button variant and icon
  const getActionButton = (action: TrainingAction) => {
    switch (action.type) {
      case "navigate":
        return {
          variant: "default" as const,
          icon: <Settings className="h-3.5 w-3.5" />
        };
      case "skip":
        return {
          variant: "ghost" as const,
          icon: <SkipForward className="h-3.5 w-3.5" />
        };
      case "finish_track":
        return {
          variant: "default" as const,
          icon: <CheckCircle2 className="h-3.5 w-3.5" />
        };
      case "next":
      default:
        return {
          variant: "default" as const,
          icon: <ChevronRight className="h-3.5 w-3.5" />
        };
    }
  };

  // Show all tracks completed state
  if (isCompleted) {
    return (
      <div className="p-4 bg-green-50/50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800/50">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          <span className="font-medium text-green-700 dark:text-green-300 text-sm">
            {labels.trainingComplete}
          </span>
        </div>
        <Progress value={100} className="h-1.5" />
        
        {/* Show completed tracks */}
        <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800/50">
          <div className="text-xs text-green-600 dark:text-green-400 mb-2">{labels.completedTracks}:</div>
          <div className="flex flex-wrap gap-1.5">
            {TRAINING_TRACKS.map(track => (
              <div 
                key={track.id}
                className="flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full"
              >
                {getTrackIcon(track.id)}
                <span>{track.name[language]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show track list view
  if (showTrackList) {
    const completedTracks = getCompletedTracks();
    const availableTracks = getAvailableTracks();
    const recommendedTrack = getNextRecommendedTrack();

    return (
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <span className="font-medium text-primary text-sm">{labels.title}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowTrackList(false)}
          >
            ✕
          </Button>
        </div>

        {/* Overall progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{labels.overallProgress}</span>
            <span>{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-1.5" />
        </div>

        {/* Completed tracks */}
        {completedTracks.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-muted-foreground mb-2">{labels.completedTracks}</div>
            <div className="space-y-1.5">
              {completedTracks.map(trackId => {
                const track = getTrack(trackId);
                if (!track) return null;
                return (
                  <div 
                    key={trackId}
                    className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-md"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs text-green-700 dark:text-green-300 flex-1">
                      {track.name[language]}
                    </span>
                    <span className="text-xs text-green-600 dark:text-green-400">
                      {labels.completed}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Available tracks */}
        {availableTracks.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-2">{labels.availableTracks}</div>
            <div className="space-y-1.5">
              {availableTracks.map(track => {
                const isRecommended = recommendedTrack?.id === track.id;
                return (
                  <div 
                    key={track.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md border",
                      isRecommended 
                        ? "bg-primary/5 border-primary/30" 
                        : "bg-card border-border"
                    )}
                  >
                    <div className={cn(
                      "p-1.5 rounded-md",
                      isRecommended ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {getTrackIcon(track.id)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">{track.name[language]}</span>
                        {isRecommended && (
                          <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                            {labels.recommended}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {track.description[language]}
                      </p>
                    </div>
                    <Button
                      variant={isRecommended ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs shrink-0"
                      onClick={() => handleStartTrack(track.id)}
                    >
                      {labels.startTrack}
                      <ArrowRight className="h-3 w-3 ltr:ml-1 rtl:mr-1" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show paused state with resume option
  if (isPaused && !isActive) {
    return (
      <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
        <div className="flex items-center gap-2 mb-3">
          <Pause className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <span className="font-medium text-amber-700 dark:text-amber-300 text-sm">
            {labels.trainingPaused}
          </span>
        </div>
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{labels.overallProgress}</span>
            <span>{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-1.5" />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={handleResume}
          >
            <Play className="h-3.5 w-3.5 ltr:mr-1.5 rtl:ml-1.5" />
            {labels.resumeTraining}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setShowTrackList(true)}
          >
            <Layers className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // Show start option if training not started
  if (!isActive && ownerNeedsTraining() && !isPaused) {
    return (
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-medium text-primary text-sm">{labels.title}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{labels.needsTraining}</p>
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={handleStart}
          >
            <Play className="h-3.5 w-3.5 ltr:mr-1.5 rtl:ml-1.5" />
            {labels.startTraining}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setShowTrackList(true)}
          >
            <Layers className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // Show active training step
  if (!currentStep || !currentTrack) return null;

  const stageName = getCurrentStageName(trackProgress);

  return (
    <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800/50">
      {/* Header with track info */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getTrackIcon(currentTrack.id)}
          <div className="flex flex-col">
            <span className="font-medium text-blue-700 dark:text-blue-300 text-sm">
              {currentTrack.name[language]}
            </span>
            <span className="text-[10px] text-blue-500 dark:text-blue-400">
              {stageName[language]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setShowTrackList(true)}
            title={labels.viewAllTracks}
          >
            <Layers className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={handlePause}
            title={labels.pauseTraining}
          >
            <Pause className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      {/* Track progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400 mb-1">
          <span>{labels.trackProgress}</span>
          <span>{trackProgress}%</span>
        </div>
        <Progress value={trackProgress} className="h-1.5" />
      </div>
      
      {/* Message content */}
      <div className="mb-4">
        <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
          {currentStep.message[language]}
        </p>
      </div>
      
      {/* Action buttons */}
      {currentStep.actions && currentStep.actions.length > 0 && (
        <div className={cn(
          "flex gap-2",
          currentStep.actions.length === 1 ? "justify-end" : "justify-between"
        )}>
          {currentStep.actions.map((action) => {
            const { variant, icon } = getActionButton(action);
            return (
              <Button
                key={action.id}
                variant={variant}
                size="sm"
                className={cn(
                  "h-8 text-xs gap-1.5",
                  currentStep.actions!.length === 1 && "flex-1"
                )}
                onClick={() => handleAction(action)}
              >
                {action.type === "skip" ? (
                  <>
                    {action.label[language]}
                    {icon}
                  </>
                ) : (
                  <>
                    {icon}
                    {action.label[language]}
                  </>
                )}
              </Button>
            );
          })}
        </div>
      )}

      {/* Overall progress indicator */}
      <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800/50">
        <div className="flex justify-between text-[10px] text-blue-500 dark:text-blue-400">
          <span>{labels.overallProgress}: {overallProgress}%</span>
          <span>{getCompletedTracks().length}/{TRAINING_TRACKS.length} {language === "ar" ? "مراحل" : "tracks"}</span>
        </div>
      </div>
    </div>
  );
}
