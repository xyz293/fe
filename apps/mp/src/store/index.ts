import { create } from 'zustand';
import type { Quota, TaskSummary, User } from '@xiaoa/share/types';

export type UserRole = User['role'];
export type { Quota, TaskSummary, User };

interface AppState {
  user: User | null;
  quota: Quota | null;
  taskSummary: TaskSummary | null;
  setUser: (user: User | null) => void;
  setQuota: (quota: Quota | null) => void;
  setTaskSummary: (summary: TaskSummary | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  quota: null,
  taskSummary: null,
  setUser: (user) => set({ user }),
  setQuota: (quota) => set({ quota }),
  setTaskSummary: (taskSummary) => set({ taskSummary }),
}));
