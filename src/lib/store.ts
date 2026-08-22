import { Email, AuditLogEntry, ActionRecord, SystemSettings } from '../types/email';
import { INITIAL_EMAILS } from '../data/emails';

// Deep copy helper to avoid reference mutation issues
const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

let emailsState: Email[] = clone(INITIAL_EMAILS);
let auditLogsState: AuditLogEntry[] = [];
let actionRecordsState: ActionRecord[] = [];
let settingsState: SystemSettings = {
  confidenceThreshold: 0.75,
  mode: 'demo',
  isGroqConfigured: typeof process.env.GROQ_API_KEY === 'string' && process.env.GROQ_API_KEY.trim().length > 0,
};

export const getEmails = (): Email[] => {
  return emailsState;
};

export const getEmailById = (id: string): Email | undefined => {
  return emailsState.find(e => e.id === id);
};

export const updateEmail = (updatedEmail: Email): void => {
  const index = emailsState.findIndex(e => e.id === updatedEmail.id);
  if (index !== -1) {
    emailsState[index] = clone(updatedEmail);
  }
};

export const getAuditLogs = (): AuditLogEntry[] => {
  return auditLogsState;
};

export const addAuditLog = (entry: AuditLogEntry): void => {
  auditLogsState.unshift(clone(entry)); // newest first
};

export const getActions = (): ActionRecord[] => {
  return actionRecordsState;
};

export const addAction = (action: ActionRecord): void => {
  actionRecordsState.unshift(clone(action)); // newest first
};

export const getSettings = (): SystemSettings => {
  // Always update configured state dynamically based on actual environment
  settingsState.isGroqConfigured = typeof process.env.GROQ_API_KEY === 'string' && process.env.GROQ_API_KEY.trim().length > 0;
  return settingsState;
};

export const updateSettings = (updated: Partial<SystemSettings>): SystemSettings => {
  settingsState = {
    ...settingsState,
    ...updated,
  };
  return getSettings();
};

export const resetStore = (): void => {
  emailsState = clone(INITIAL_EMAILS);
  auditLogsState = [];
  actionRecordsState = [];
  settingsState = {
    confidenceThreshold: settingsState.confidenceThreshold, // keep the current threshold
    mode: settingsState.mode, // keep current mode choice
    isGroqConfigured: typeof process.env.GROQ_API_KEY === 'string' && process.env.GROQ_API_KEY.trim().length > 0,
  };
};
