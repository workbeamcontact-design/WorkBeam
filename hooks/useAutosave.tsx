import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDebounce } from './usePerformance';
import { secureStorage } from '../utils/secure-storage';

/**
 * Autosave hook - Automatically saves form data with debouncing
 * 
 * Features:
 * - Debounced saves (configurable delay)
 * - Save status tracking
 * - Error handling
 * - Manual save trigger
 * - Dirty state detection
 */

export interface AutosaveOptions {
  delay?: number; // Debounce delay in ms (default: 2000)
  onSave: (data: any) => Promise<void> | void;
  onError?: (error: Error) => void;
  enabled?: boolean; // Enable/disable autosave
  storageKey?: string; // LocalStorage key for persistence
}

export interface AutosaveState {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved: Date | null;
  error: Error | null;
  isDirty: boolean;
}

export const useAutosave = <T,>(data: T, options: AutosaveOptions) => {
  const {
    delay = 2000,
    onSave,
    onError,
    enabled = true,
    storageKey
  } = options;

  const [state, setState] = useState<AutosaveState>({
    status: 'idle',
    lastSaved: null,
    error: null,
    isDirty: false
  });

  const initialDataRef = useRef<T>(data);
  const isSavingRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced data for autosave
  const debouncedData = useDebounce(data, delay);

  // Check if data has changed
  const isDirty = useCallback(() => {
    return JSON.stringify(data) !== JSON.stringify(initialDataRef.current);
  }, [data]);

  // Manual save function
  const save = useCallback(async () => {
    if (isSavingRef.current) return;

    try {
      isSavingRef.current = true;
      setState(prev => ({ ...prev, status: 'saving', error: null }));

      await onSave(data);

      // Update initial data reference
      initialDataRef.current = data;

      // Save to secure storage if key provided
      if (storageKey) {
        await secureStorage.setItem(storageKey, data);
      }

      setState({
        status: 'saved',
        lastSaved: new Date(),
        error: null,
        isDirty: false
      });

      // Reset to idle after 2 seconds
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, status: 'idle' }));
      }, 2000);

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Save failed');
      setState({
        status: 'error',
        lastSaved: null,
        error: err,
        isDirty: true
      });

      if (onError) {
        onError(err);
      }
    } finally {
      isSavingRef.current = false;
    }
  }, [data, onSave, onError, storageKey]);

  // Autosave effect
  useEffect(() => {
    if (!enabled) return;
    if (!isDirty()) return;

    save();
  }, [debouncedData, enabled]); // Triggers when debounced data changes

  // Update dirty state
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isDirty: isDirty()
    }));
  }, [data, isDirty]);

  // Load from secure storage on mount
  useEffect(() => {
    if (storageKey) {
      secureStorage.getItem(storageKey).then(stored => {
        if (stored) {
          initialDataRef.current = stored;
        }
      }).catch(error => {
        console.warn('Failed to load autosaved data:', error);
      });
    }
  }, [storageKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Clear saved draft
  const clearDraft = useCallback(() => {
    if (storageKey) {
      secureStorage.removeItem(storageKey);
    }
    initialDataRef.current = data;
    setState({
      status: 'idle',
      lastSaved: null,
      error: null,
      isDirty: false
    });
  }, [data, storageKey]);

  return {
    ...state,
    save, // Manual save function
    clearDraft,
    enabled
  };
};

/**
 * Autosave status indicator component
 */
export const AutosaveStatus: React.FC<{ state: AutosaveState }> = ({ state }) => {
  if (state.status === 'idle' && !state.isDirty) return null;

  const statusConfig = {
    idle: { text: '', icon: null, color: 'text-gray-500' },
    saving: { text: 'Saving...', icon: '⏳', color: 'text-blue-600' },
    saved: { text: 'Saved', icon: '✓', color: 'text-green-600' },
    error: { text: 'Error saving', icon: '⚠️', color: 'text-red-600' }
  };

  const config = statusConfig[state.status];

  return (
    <div className={`text-xs ${config.color} flex items-center gap-1`}>
      {config.icon && <span>{config.icon}</span>}
      <span>{config.text}</span>
      {state.lastSaved && state.status === 'saved' && (
        <span className="text-gray-400">
          {new Date(state.lastSaved).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      )}
    </div>
  );
};
