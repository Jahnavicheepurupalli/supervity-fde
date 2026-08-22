export type EmailCategory = 'INVOICE_SUBMISSION' | 'PAYMENT_QUERY' | 'DISPUTE' | 'SPAM' | 'UNCLASSIFIED';

export type EmailStatus = 'PENDING' | 'PROCESSED';

export type ProcessingDecision = 'AUTO_ACTION' | 'HUMAN_REVIEW' | 'NONE';

export type AutonomousActionType = 
  | 'Invoice Logged' 
  | 'Payment Follow-up Created' 
  | 'Dispute Escalated' 
  | 'Spam Marked' 
  | 'Human Review Created' 
  | 'None';

export interface ExtractedData {
  vendor?: string | null;
  invoiceNumber?: string | null;
  amount?: number | null;
  dueDate?: string | null;
  disputeReason?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'urgent' | null;
  referenceNumber?: string | null;
  spamIndicators?: string | null;
  possibleIntents?: string[] | null;
  ambiguityReason?: string | null;
}

export interface AuditTrailEntry {
  timestamp: string;
  event: string;
  details: string;
}

export interface Email {
  id: string;
  sender: string;
  senderName: string;
  subject: string;
  body: string;
  timestamp: string;
  attachments: string[];
  status: EmailStatus;
  category: EmailCategory;
  confidence: number; // 0 to 1
  reasoning: string;
  decision: ProcessingDecision;
  action: AutonomousActionType;
  actionResult: string;
  draftResponse: string;
  auditTrail: AuditTrailEntry[];
  extractedData: ExtractedData;
}

export interface SystemSettings {
  confidenceThreshold: number;
  mode: 'demo' | 'ai';
  isGroqConfigured: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  emailId: string;
  subject: string;
  category: EmailCategory;
  confidence: number;
  decision: ProcessingDecision;
  action: AutonomousActionType;
  reason: string;
}

export interface ActionRecord {
  id: string;
  emailId: string;
  emailSubject: string;
  senderName: string;
  type: AutonomousActionType;
  status: 'SUCCESS' | 'PENDING_REVIEW' | 'MARKED_SPAM';
  details: string;
  timestamp: string;
}
