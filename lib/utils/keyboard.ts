import { useEffect, useCallback } from "react";

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  callback: (event: KeyboardEvent) => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch =
          shortcut.ctrl === undefined || shortcut.ctrl === event.ctrlKey;
        const shiftMatch =
          shortcut.shift === undefined || shortcut.shift === event.shiftKey;
        const altMatch =
          shortcut.alt === undefined || shortcut.alt === event.altKey;
        const metaMatch =
          shortcut.meta === undefined || shortcut.meta === event.metaKey;

        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          ctrlMatch &&
          shiftMatch &&
          altMatch &&
          metaMatch
        ) {
          event.preventDefault();
          shortcut.callback(event);
          break;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);
}

export function useEditorShortcuts({
  onSaveAction,
  onUndoAction,
  onRedoAction,
  onSearchAction,
}: {
  onSaveAction?: () => void;
  onUndoAction?: () => void;
  onRedoAction?: () => void;
  onSearchAction?: () => void;
}) {
  useKeyboardShortcuts([
    {
      key: "s",
      meta: true,
      callback: () => onSaveAction?.(),
      description: "Save changes",
    },
    {
      key: "z",
      meta: true,
      callback: () => onUndoAction?.(),
      description: "Undo",
    },
    {
      key: "z",
      meta: true,
      shift: true,
      callback: () => onRedoAction?.(),
      description: "Redo",
    },
    {
      key: "k",
      meta: true,
      callback: () => onSearchAction?.(),
      description: "Quick search",
    },
  ]);
}
