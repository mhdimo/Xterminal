// Session Store - PTY session state management
// Manages active PTY sessions and their state

import { create } from 'zustand';
import type { PtySession } from '@/types';

interface SessionState {
  sessions: Map<string, PtySession>;

  // Actions
  addSession: (session: PtySession) => void;
  removeSession: (sessionId: string) => void;
  updateSession: (sessionId: string, updates: Partial<PtySession>) => void;
  getSession: (sessionId: string) => PtySession | undefined;
  getAllSessions: () => PtySession[];
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: new Map(),

  addSession: (session) => {
    set((state) => {
      const sessions = new Map(state.sessions);
      sessions.set(session.id, session);
      return { sessions };
    });
  },

  removeSession: (sessionId) => {
    set((state) => {
      const sessions = new Map(state.sessions);
      sessions.delete(sessionId);
      return { sessions };
    });
  },

  updateSession: (sessionId, updates) => {
    set((state) => {
      const sessions = new Map(state.sessions);
      const existing = sessions.get(sessionId);
      if (existing) {
        sessions.set(sessionId, { ...existing, ...updates });
      }
      return { sessions };
    });
  },

  getSession: (sessionId) => {
    return get().sessions.get(sessionId);
  },

  getAllSessions: () => {
    return Array.from(get().sessions.values());
  },
}));
