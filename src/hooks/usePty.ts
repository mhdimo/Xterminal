// usePty Hook - PTY communication hook
// Handles PTY communication via Tauri IPC

import { useEffect, useRef, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import type { SessionInfo, PtyDataEvent, PtyExitEvent } from '@/types';
import { useSessionStore } from '@/store';

interface UsePtyOptions {
  onData?: (data: string) => void;
  onExit?: (exitCode: number) => void;
}

interface UsePtyReturn {
  spawn: (shell: string, cols: number, rows: number) => Promise<SessionInfo>;
  write: (data: string) => Promise<void>;
  resize: (cols: number, rows: number) => Promise<void>;
  close: () => Promise<void>;
  isConnected: boolean;
}

/**
 * Hook for PTY communication
 * Handles spawning, writing to, resizing, and closing PTY sessions
 */
export function usePty(sessionId: string | null, options: UsePtyOptions = {}): UsePtyReturn {
  const { onData, onExit } = options;
  const isConnectedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(sessionId);
  const onDataRef = useRef(onData);
  const onExitRef = useRef(onExit);
  const { addSession, removeSession, updateSession } = useSessionStore();

  // Keep the refs in sync with the props
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);
  
  useEffect(() => {
    onDataRef.current = onData;
  }, [onData]);
  
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  // Spawn a new PTY session
  const spawn = useCallback(async (shell: string, cols: number, rows: number): Promise<SessionInfo> => {
    try {
      const sessionInfo = await invoke<SessionInfo>('spawn_pty', {
        options: {
          shell,
          cols,
          rows,
        },
      });

      // Add to session store
      addSession({
        id: sessionInfo.id,
        pid: sessionInfo.pid,
        shell: sessionInfo.shell,
        status: 'active',
        cols,
        rows,
      });

      // Update our ref so write/resize work immediately
      sessionIdRef.current = sessionInfo.id;
      isConnectedRef.current = true;
      return sessionInfo;
    } catch (error) {
      console.error('Failed to spawn PTY:', error);
      throw error;
    }
  }, [addSession]);

  // Write data to the PTY
  const write = useCallback(async (data: string) => {
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) {
      console.warn('[usePty] No session ID provided for write');
      return;
    }

    try {
      await invoke('pty_write', {
        sessionId: currentSessionId,
        data,
      });
    } catch (error) {
      console.error('[usePty] Failed to write to PTY:', error);
      throw error;
    }
  }, []); // No dependencies needed - uses ref

  // Resize the PTY
  const resize = useCallback(async (cols: number, rows: number) => {
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) {
      console.warn('No session ID provided for resize');
      return;
    }

    try {
      await invoke('pty_resize', {
        sessionId: currentSessionId,
        cols,
        rows,
      });

      // Update session store
      updateSession(currentSessionId, { cols, rows });
    } catch (error) {
      console.error('Failed to resize PTY:', error);
      throw error;
    }
  }, [updateSession]);

  // Close the PTY session
  const close = useCallback(async () => {
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) {
      console.warn('No session ID provided for close');
      return;
    }

    try {
      await invoke('pty_close', { sessionId: currentSessionId });
      isConnectedRef.current = false;

      // Remove from session store
      removeSession(currentSessionId);
    } catch (error) {
      console.error('Failed to close PTY:', error);
      throw error;
    }
  }, [removeSession]);

  // Set up event listeners for PTY data and exit events
  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let isMounted = true;

    const unlistenPromises = [
      // Listen for PTY output events
      listen<string>(`pty://${sessionId}/data`, (event) => {
        if (!isMounted) return;
        onDataRef.current?.(event.payload);
      }),

      // Listen for exit events
      listen<{ exitCode: number }>(`pty://${sessionId}/exit`, (event) => {
        if (!isMounted) return;
        const { exitCode } = event.payload;
        isConnectedRef.current = false;

        // Update session store
        updateSession(sessionId, {
          status: exitCode === 0 ? 'exited' : 'failed',
          exitCode,
        });

        onExitRef.current?.(exitCode);
      }),
    ];

    // Cleanup listeners on unmount
    return () => {
      isMounted = false;
      Promise.all(unlistenPromises).then((unlisteners) => {
        unlisteners.forEach((unlisten) => unlisten());
      });
    };
  }, [sessionId, updateSession]);

  return {
    spawn,
    write,
    resize,
    close,
    isConnected: isConnectedRef.current,
  };
}
