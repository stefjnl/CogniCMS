"use client";

import { Button } from "@/components/ui/Button";

interface UndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  onUndo: () => void;
  onRedo: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Undo/Redo control buttons for the editor toolbar.
 * 
 * Shows the number of available undo/redo steps and provides
 * keyboard shortcut hints in tooltips.
 */
export function UndoRedoControls({
  canUndo,
  canRedo,
  undoCount,
  redoCount,
  onUndo,
  onRedo,
  disabled = false,
  className = "",
}: UndoRedoControlsProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Undo Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onUndo}
        disabled={disabled || !canUndo}
        title={`Undo${canUndo ? ` (${undoCount} step${undoCount !== 1 ? "s" : ""})` : ""} — Ctrl+Z`}
        className="relative h-8 w-8 p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
        {canUndo && undoCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-600 px-1 text-[10px] font-medium text-white">
            {undoCount > 9 ? "9+" : undoCount}
          </span>
        )}
      </Button>

      {/* Redo Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRedo}
        disabled={disabled || !canRedo}
        title={`Redo${canRedo ? ` (${redoCount} step${redoCount !== 1 ? "s" : ""})` : ""} — Ctrl+Y`}
        className="relative h-8 w-8 p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
        </svg>
        {canRedo && redoCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-600 px-1 text-[10px] font-medium text-white">
            {redoCount > 9 ? "9+" : redoCount}
          </span>
        )}
      </Button>
    </div>
  );
}
