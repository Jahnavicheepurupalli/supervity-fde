import { Email, AuditLogEntry, ActionRecord } from '../../types/email';
import { addAuditLog, addAction } from '../store';

let auditIdCounter = 1000;
let actionIdCounter = 1000;

export function recordAuditAndAction(email: Email, classificationReason: string) {
  const timestamp = new Date().toISOString();
  
  // 1. Create a global Audit Log entry
  const auditEntry: AuditLogEntry = {
    id: `AUDIT-${auditIdCounter++}`,
    timestamp,
    emailId: email.id,
    subject: email.subject,
    category: email.category,
    confidence: email.confidence,
    decision: email.decision,
    action: email.action,
    reason: classificationReason
  };
  addAuditLog(auditEntry);

  // 2. Create an Action Record if it represents a physical action (including marking spam or review)
  if (email.action !== 'None') {
    let status: 'SUCCESS' | 'PENDING_REVIEW' | 'MARKED_SPAM' = 'SUCCESS';
    if (email.decision === 'HUMAN_REVIEW') {
      status = 'PENDING_REVIEW';
    } else if (email.category === 'SPAM') {
      status = 'MARKED_SPAM';
    }

    const actionRecord: ActionRecord = {
      id: `ACTION-${actionIdCounter++}`,
      emailId: email.id,
      emailSubject: email.subject,
      senderName: email.senderName,
      type: email.action,
      status,
      details: email.actionResult,
      timestamp
    };
    addAction(actionRecord);
  }
}
