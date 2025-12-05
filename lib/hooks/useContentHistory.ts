"use client";

import { useCallback, useRef, useState } from "react";
import { WebsiteContent } from "@/types/content";

export interface HistoryEntry {
  content: WebsiteContent;
  timestamp: string;
  description: string;
  source: "ai" | "manual" | "initial" | "reset";
}

export interface UseContentHistoryOptions {
  /** Maximum number of history entries to keep */
  maxHistory?: number;
  /** Initial content to start with */
  initialContent: WebsiteContent;
}

export interface UseContentHistoryReturn {
  /** Current content state */
  content: WebsiteContent;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Number of undo steps available */
  undoCount: number;
  /** Number of redo steps available */
  redoCount: number;
  /** Push new content state to history */
  pushState: (content: WebsiteContent, description: string, source?: HistoryEntry["source"]) => void;
  /** Undo to previous state */
  undo: () => WebsiteContent | null;
  /** Redo to next state */
  redo: () => WebsiteContent | null;
  /** Clear all history and reset to initial state */
  reset: (newInitialContent?: WebsiteContent) => void;
  /** Get current history for debugging */
  getHistory: () => { past: HistoryEntry[]; present: HistoryEntry; future: HistoryEntry[] };
  /** Set content without adding to history (for external sync) */
  setContentSilent: (content: WebsiteContent) => void;
}

/**
 * Custom hook for managing content edit history with undo/redo support.
 * 
 * Uses a past/present/future model for efficient undo/redo operations.
 * Each state change is tracked with a description and source for audit purposes.
 */
export function useContentHistory({
  maxHistory = 50,
  initialContent,
}: UseContentHistoryOptions): UseContentHistoryReturn {
  // Past states (oldest first)
  const pastRef = useRef<HistoryEntry[]>([]);
  
  // Current state
  const [present, setPresent] = useState<HistoryEntry>({
    content: initialContent,
    timestamp: new Date().toISOString(),
    description: "Initial content",
    source: "initial",
  });
  
  // Future states for redo (oldest first, i.e., next redo is at index 0)
  const futureRef = useRef<HistoryEntry[]>([]);

  // Force re-render when history changes
  const [, forceUpdate] = useState({});

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;
  const undoCount = pastRef.current.length;
  const redoCount = futureRef.current.length;

  /**
   * Push a new state to history.
   * Clears the redo stack since we're branching from the current state.
   */
  const pushState = useCallback(
    (content: WebsiteContent, description: string, source: HistoryEntry["source"] = "manual") => {
      // Don't push if content is identical (deep compare)
      if (JSON.stringify(content) === JSON.stringify(present.content)) {
        return;
      }

      const newEntry: HistoryEntry = {
        content: JSON.parse(JSON.stringify(content)), // Deep clone
        timestamp: new Date().toISOString(),
        description,
        source,
      };

      // Move present to past
      pastRef.current = [...pastRef.current, present];
      
      // Trim past if it exceeds max
      if (pastRef.current.length > maxHistory) {
        pastRef.current = pastRef.current.slice(-maxHistory);
      }

      // Clear future (redo stack) since we're branching
      futureRef.current = [];

      // Set new present
      setPresent(newEntry);
      forceUpdate({});
    },
    [present, maxHistory]
  );

  /**
   * Undo to previous state.
   * Returns the restored content or null if no undo available.
   */
  const undo = useCallback((): WebsiteContent | null => {
    if (pastRef.current.length === 0) {
      return null;
    }

    // Pop from past
    const previousState = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);

    // Push current to future (for redo)
    futureRef.current = [present, ...futureRef.current];

    // Trim future if it exceeds max
    if (futureRef.current.length > maxHistory) {
      futureRef.current = futureRef.current.slice(0, maxHistory);
    }

    // Restore previous state
    setPresent(previousState);
    forceUpdate({});

    return previousState.content;
  }, [present, maxHistory]);

  /**
   * Redo to next state.
   * Returns the restored content or null if no redo available.
   */
  const redo = useCallback((): WebsiteContent | null => {
    if (futureRef.current.length === 0) {
      return null;
    }

    // Pop from future
    const nextState = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);

    // Push current to past (for undo)
    pastRef.current = [...pastRef.current, present];

    // Trim past if it exceeds max
    if (pastRef.current.length > maxHistory) {
      pastRef.current = pastRef.current.slice(-maxHistory);
    }

    // Restore next state
    setPresent(nextState);
    forceUpdate({});

    return nextState.content;
  }, [present, maxHistory]);

  /**
   * Reset history to a new initial state.
   * Clears all past and future entries.
   */
  const reset = useCallback((newInitialContent?: WebsiteContent) => {
    const contentToUse = newInitialContent ?? initialContent;
    
    pastRef.current = [];
    futureRef.current = [];
    
    setPresent({
      content: JSON.parse(JSON.stringify(contentToUse)),
      timestamp: new Date().toISOString(),
      description: "Reset to initial state",
      source: "reset",
    });
    forceUpdate({});
  }, [initialContent]);

  /**
   * Get current history state for debugging.
   */
  const getHistory = useCallback(() => ({
    past: pastRef.current,
    present,
    future: futureRef.current,
  }), [present]);

  /**
   * Set content without adding to history.
   * Useful for external sync operations where we don't want to pollute history.
   */
  const setContentSilent = useCallback((content: WebsiteContent) => {
    setPresent((prev) => ({
      ...prev,
      content: JSON.parse(JSON.stringify(content)),
      timestamp: new Date().toISOString(),
    }));
  }, []);

  return {
    content: present.content,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    pushState,
    undo,
    redo,
    reset,
    getHistory,
    setContentSilent,
  };
}
