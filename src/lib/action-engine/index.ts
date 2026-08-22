import { Email, EmailCategory, ExtractedData, AutonomousActionType, ProcessingDecision } from '../../types/email';

export interface ActionEngineResult {
  decision: ProcessingDecision;
  action: AutonomousActionType;
  actionResult: string;
  draftResponse: string;
}

export function executeAction(
  category: EmailCategory,
  confidence: number,
  threshold: number,
  extractedData: ExtractedData,
  senderName: string,
  ambiguous: boolean
): ActionEngineResult {
  const confidencePercent = Math.round(confidence * 100);
  const thresholdPercent = Math.round(threshold * 100);

  // 1. Safety Threshold check or ambiguous detection routes to Human Review
  if (confidence < threshold || category === 'UNCLASSIFIED' || ambiguous) {
    const reason = ambiguous 
      ? 'The email contains both a payment query and a dispute, so autonomous routing could trigger the wrong workflow.'
      : `Confidence of ${confidencePercent}% is below the safety threshold of ${thresholdPercent}%.`;
      
    return {
      decision: 'HUMAN_REVIEW',
      action: 'Human Review Created',
      actionResult: `Mock human review task created. Reason: ${reason}`,
      draftResponse: `Dear ${senderName},\n\nWe have received your message. A customer service operations manager is reviewing it to ensure proper handling.\n\nRegards,\nFinance Operations Team`
    };
  }

  // 2. Deterministic Action Routing
  switch (category) {
    case 'INVOICE_SUBMISSION': {
      const invNum = extractedData.invoiceNumber || 'N/A';
      return {
        decision: 'AUTO_ACTION',
        action: 'Invoice Logged',
        actionResult: `Mock invoice record created. Details: Vendor: ${extractedData.vendor || senderName}, Invoice Number: ${invNum}, Amount: ₹${extractedData.amount?.toLocaleString('en-IN') || 0}.`,
        draftResponse: `Dear ${senderName},\n\nWe have received and logged invoice ${invNum} for processing.\n\nRegards,\nFinance Operations`
      };
    }

    case 'PAYMENT_QUERY': {
      const invNum = extractedData.invoiceNumber || 'N/A';
      return {
        decision: 'AUTO_ACTION',
        action: 'Payment Follow-up Created',
        actionResult: `Mock payment follow-up task created for invoice ${invNum}.`,
        draftResponse: `Dear ${senderName},\n\nWe have received your inquiry regarding payment status for invoice ${invNum}. A follow-up task has been scheduled.\n\nRegards,\nFinance Operations`
      };
    }

    case 'DISPUTE': {
      const invNum = extractedData.invoiceNumber || 'N/A';
      return {
        decision: 'AUTO_ACTION',
        action: 'Dispute Escalated',
        actionResult: `Mock dispute escalation task created. Reason: ${extractedData.disputeReason || 'Billing discrepancy'}.`,
        draftResponse: `Hi ${senderName},\n\nWe have received your dispute regarding invoice ${invNum}.\nThe issue has been escalated to our finance review team for investigation.\n\nRegards,\nFinance Operations`
      };
    }

    case 'SPAM': {
      return {
        decision: 'AUTO_ACTION',
        action: 'Spam Marked',
        actionResult: 'Mock spam action recorded. Automated reply suppressed.',
        draftResponse: ''
      };
    }

    default: {
      return {
        decision: 'HUMAN_REVIEW',
        action: 'Human Review Created',
        actionResult: 'Mock human review task created.',
        draftResponse: `Dear ${senderName},\n\nWe have received your message. A operations manager is reviewing it to ensure proper handling.\n\nRegards,\nFinance Operations`
      };
    }
  }
}
