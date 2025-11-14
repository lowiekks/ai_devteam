import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  callback: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl === undefined || shortcut.ctrl === event.ctrlKey;
        const altMatch = shortcut.alt === undefined || shortcut.alt === event.altKey;
        const shiftMatch = shortcut.shift === undefined || shortcut.shift === event.shiftKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && altMatch && shiftMatch && keyMatch) {
          event.preventDefault();
          shortcut.callback();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Common shortcuts
export const commonShortcuts = {
  search: { key: 'k', ctrl: true, description: 'Open search' },
  settings: { key: ',', ctrl: true, description: 'Open settings' },
  help: { key: '?', description: 'Show keyboard shortcuts' },
  escape: { key: 'Escape', description: 'Close modal/dialog' },
};
