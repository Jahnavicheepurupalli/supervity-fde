import { NextRequest, NextResponse } from 'next/server';
import { getEmailById, getEmails, updateEmail, getSettings } from '../../../lib/store';
import { classifyDeterministic, classifyWithAI } from '../../../lib/classifier';
import { executeAction } from '../../../lib/action-engine';
import { recordAuditAndAction } from '../../../lib/audit-logger';
import { Email, AuditTrailEntry } from '../../../types/email';

async function processSingleEmail(email: Email, threshold: number, mode: 'demo' | 'ai'): Promise<Email> {
  if (email.status === 'PROCESSED') {
    return email;
  }

  const startTime = new Date().toISOString();
  const updatedEmail = { ...email };
  
  // 1. Initialize Audit Trail
  const trail: AuditTrailEntry[] = [
    {
      timestamp: startTime,
      event: 'Email Received',
      details: `Email from ${email.senderName} (${email.sender}) received at pipeline endpoint.`
    }
  ];

  // 2. Classify (Demo vs AI Mode)
  let classification;
  if (mode === 'ai') {
    classification = await classifyWithAI({
      subject: email.subject,
      body: email.body,
      senderName: email.senderName
    });
  } else {
    classification = classifyDeterministic({
      subject: email.subject,
      body: email.body,
      senderName: email.senderName
    });
  }

  trail.push({
    timestamp: new Date().toISOString(),
    event: 'Intent Classified',
    details: `Categorized as [${classification.category}] with ${Math.round(classification.confidence * 100)}% confidence using ${mode.toUpperCase()} engine. Reasoning: ${classification.reasoning}`
  });

  // 3. Evaluate Threshold & Execute Deterministic Action Engine
  const actionOutcome = executeAction(
    classification.category,
    classification.confidence,
    threshold,
    classification.extractedData,
    email.senderName,
    classification.ambiguous
  );

  trail.push({
    timestamp: new Date().toISOString(),
    event: 'Safety Threshold Evaluated',
    details: `Decision: ${actionOutcome.decision}. Safety threshold: ${Math.round(threshold * 100)}%. System determined action path.`
  });

  trail.push({
    timestamp: new Date().toISOString(),
    event: 'Business Action Triggered',
    details: `Action: ${actionOutcome.action}. Result summary: ${actionOutcome.actionResult}`
  });

  // 4. Update Email Model
  updatedEmail.category = classification.category;
  updatedEmail.confidence = classification.confidence;
  updatedEmail.reasoning = classification.reasoning;
  updatedEmail.extractedData = classification.extractedData;
  
  updatedEmail.decision = actionOutcome.decision;
  updatedEmail.action = actionOutcome.action;
  updatedEmail.actionResult = actionOutcome.actionResult;
  updatedEmail.draftResponse = actionOutcome.draftResponse;
  updatedEmail.status = 'PROCESSED';
  updatedEmail.auditTrail = trail;

  // 5. Save back to store
  updateEmail(updatedEmail);

  // 6. Record in global log tables
  recordAuditAndAction(updatedEmail, classification.reasoning);

  return updatedEmail;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emailId, all } = body;
    const settings = getSettings();
    const threshold = settings.confidenceThreshold;
    const mode = settings.mode;

    if (all === true) {
      const emails = getEmails();
      const pendingEmails = emails.filter(e => e.status === 'PENDING');
      
      const processed: Email[] = [];
      for (const email of pendingEmails) {
        const result = await processSingleEmail(email, threshold, mode);
        processed.push(result);
      }
      
      return NextResponse.json({
        success: true,
        processedCount: processed.length,
        emails: getEmails()
      });
    }

    if (!emailId) {
      return NextResponse.json({ error: 'Missing emailId or all parameter' }, { status: 400 });
    }

    const email = getEmailById(emailId);
    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    if (email.status === 'PROCESSED') {
      return NextResponse.json({ error: 'Email already processed' }, { status: 400 });
    }

    const processedEmail = await processSingleEmail(email, threshold, mode);
    return NextResponse.json({
      success: true,
      email: processedEmail,
      emails: getEmails()
    });

  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json({
      error: 'Processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
