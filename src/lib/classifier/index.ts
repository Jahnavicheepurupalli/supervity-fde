import { Email, EmailCategory, ExtractedData } from '../../types/email';

export interface ClassifierResult {
  category: EmailCategory;
  confidence: number;
  reasoning: string;
  extractedData: ExtractedData;
  ambiguous: boolean;
}

/**
 * Deterministic rule-based classifier for Demo Mode.
 * Ensures identical, reproducible output for the synthetic dataset.
 */
export function classifyDeterministic(email: { subject: string; body: string; senderName: string }): ClassifierResult {
  const subject = email.subject.toLowerCase();
  const body = email.body.toLowerCase();
  const text = `${subject} ${body}`;

  // 1. Detect Ambiguous Case (Both payment query and dispute signals present)
  const hasPaymentSignal = /payment|paid|payment status|remittance|payment pending|when will payment|when will we receive/i.test(text);
  const hasDisputeSignal = /dispute|disputing|disputed|contest|contesting|challenge|challenging|incorrect amount|incorrect total|wrong amount|overcharge|charged incorrectly|billing error|credit note|request correction|object to charge|objecting to charge|double-billed|double billed|wrong rate|amount is incorrect|amount is wrong/i.test(text);

  if (hasPaymentSignal && hasDisputeSignal) {
    const invMatch = text.match(/inv-\d+/i);
    const invoiceNumber = invMatch ? invMatch[0].toUpperCase() : null;

    return {
      category: 'UNCLASSIFIED',
      confidence: 0.58, // Approx 0.55 - 0.65 as required
      reasoning: 'The email contains conflicting or ambiguous business signals, so autonomous action is unsafe.',
      extractedData: {
        invoiceNumber,
        possibleIntents: ['PAYMENT_QUERY', 'DISPUTE'],
        ambiguityReason: 'The email contains both a payment query and a dispute, so autonomous routing could trigger the wrong workflow.'
      },
      ambiguous: true
    };
  }

  // 2. Check for Spam
  const spamMatches: string[] = [];
  if (text.includes('winner')) spamMatches.push('winner');
  if (text.includes('prize')) spamMatches.push('prize');
  if (text.includes('crypto investment')) spamMatches.push('crypto investment');
  if (text.includes('claim reward')) spamMatches.push('claim reward');
  if (text.includes('lottery')) spamMatches.push('lottery');
  if (text.includes('click here urgently')) spamMatches.push('click here urgently');
  if (text.includes('guaranteed return') || /guaranteed.*return/i.test(text)) spamMatches.push('guaranteed return');

  if (spamMatches.length > 0) {
    return {
      category: 'SPAM',
      confidence: 0.98,
      reasoning: 'The email contains promotional or spam indicators and does not represent a legitimate business workflow.',
      extractedData: {
        spamIndicators: spamMatches.join(', ')
      },
      ambiguous: false
    };
  }

  // 3. Check for Dispute (Priority above Payment and Invoice)
  if (hasDisputeSignal) {
    const invMatch = text.match(/inv-\d+/i);
    const invoiceNumber = invMatch ? invMatch[0].toUpperCase() : null;

    let disputeReason = 'Billing dispute / Overcharge';
    if (text.includes('rate') || text.includes('hours')) {
      disputeReason = 'Wrong rate applied to consulting hours';
    } else if (text.includes('surcharge')) {
      disputeReason = 'Fuel surcharge exceeds the contractual cap';
    } else if (text.includes('double') || text.includes('double-billed') || text.includes('incorrect invoice total')) {
      disputeReason = 'Double-billed hardware installation / incorrect invoice total';
    }

    let amount: number | null = null;
    const amountMatch = text.match(/(?:₹|rs\.?)\s*([0-9,]+(?:\.[0-9]{2})?)/i);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    return {
      category: 'DISPUTE',
      confidence: 0.86,
      reasoning: 'The email challenges an invoice charge and requests correction, indicating a billing dispute.',
      extractedData: {
        invoiceNumber,
        disputeReason,
        amount
      },
      ambiguous: false
    };
  }

  // 4. Check for Payment Query
  if (hasPaymentSignal) {
    const invMatch = text.match(/inv-\d+|sc-\d+/i);
    const invoiceNumber = invMatch ? invMatch[0].toUpperCase() : null;

    return {
      category: 'PAYMENT_QUERY',
      confidence: 0.88,
      reasoning: 'The email asks for payment status or remittance information for an existing invoice.',
      extractedData: {
        invoiceNumber,
        referenceNumber: invoiceNumber
      },
      ambiguous: false
    };
  }

  // 5. Check for Invoice Submission
  if (/invoice|bill|attached invoice|invoice number|inv-/i.test(text)) {
    let vendor = email.senderName || 'Unknown Vendor';
    
    const invMatch = text.match(/inv-\d+(?:-\d+)?/i);
    const invoiceNumber = invMatch ? invMatch[0].toUpperCase() : null;

    let amount: number | null = null;
    const amountMatch = text.match(/(?:₹|rs\.?)\s*([0-9,]+(?:\.[0-9]{2})?)/i);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    let dueDate: string | null = null;
    const dateMatch = text.match(/due date:\s*([A-Za-z]+ \d{1,2},? \d{4})/i);
    if (dateMatch) {
      dueDate = dateMatch[1];
    }

    return {
      category: 'INVOICE_SUBMISSION',
      confidence: 0.94,
      reasoning: 'The email submits or requests processing of a new invoice.',
      extractedData: {
        vendor,
        invoiceNumber,
        amount,
        dueDate
      },
      ambiguous: false
    };
  }

  // Fallback
  return {
    category: 'UNCLASSIFIED',
    confidence: 0.40,
    reasoning: 'The email contains conflicting or ambiguous business signals, so autonomous action is unsafe.',
    extractedData: {},
    ambiguous: true
  };
}

/**
 * AI Mode classifier using Groq.
 * Calls Groq chat completion API with a structured prompt.
 */
export async function classifyWithAI(email: { subject: string; body: string; senderName: string }): Promise<ClassifierResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq API Key is not configured on the server.');
  }

  const prompt = `You are a high-accuracy enterprise email classification agent.
Analyze the following email and categorize it into exactly one of these allowed categories:
- INVOICE_SUBMISSION (new invoice submission to be logged/processed)
- PAYMENT_QUERY (asking when an invoice will be paid, asking for status)
- DISPUTE (contesting invoice charge, wrong rate, incorrect totals)
- SPAM (lottery, crypto investment pitches, urgent unsolicited reward claims)

Return a structured JSON object only. Do NOT include markdown blocks like \`\`\`json or trailing text. The JSON must exactly match the schema below:
{
  "category": "INVOICE_SUBMISSION" | "PAYMENT_QUERY" | "DISPUTE" | "SPAM" | "UNCLASSIFIED",
  "confidence": number, // between 0.0 and 1.0 representing how confident you are
  "reasoning": string, // MUST be one of these exact strings depending on your classification:
                       // - For INVOICE_SUBMISSION: "The email submits or requests processing of a new invoice."
                       // - For PAYMENT_QUERY: "The email asks for payment status or remittance information for an existing invoice."
                       // - For DISPUTE: "The email challenges an invoice charge and requests correction, indicating a billing dispute."
                       // - For SPAM: "The email contains promotional or spam indicators and does not represent a legitimate business workflow."
                       // - For UNCLASSIFIED/ambiguous: "The email contains conflicting or ambiguous business signals, so autonomous action is unsafe."
  "extractedData": {
    "vendor": string | null, // (Only for INVOICE_SUBMISSION) Name of the vendor submitting the invoice
    "invoiceNumber": string | null, // Invoice/reference number (e.g. INV-1042)
    "amount": number | null, // Amount in numeric format without currency symbols (e.g. 12500)
    "dueDate": string | null, // (Only for INVOICE_SUBMISSION) Due date string if specified (e.g. "September 5, 2026")
    "disputeReason": string | null, // (Only for DISPUTE) Reason for the dispute
    "spamIndicators": string | null, // (Only for SPAM) Key trigger phrases like "crypto investment, claim reward"
    "possibleIntents": string[] | null, // (Only for ambiguous) List of candidate intents e.g. ["PAYMENT_QUERY", "DISPUTE"]
    "ambiguityReason": string | null // (Only for ambiguous) Description of why the intents conflict
  },
  "ambiguous": boolean // Set to true if the email contains multiple conflicting intents (e.g., query AND dispute) making auto-action unsafe
}

Note:
1. If the email contains BOTH a payment query and a dispute (e.g. asking for payment status of a disputed/incorrect invoice), set "ambiguous" to true, "category" to "UNCLASSIFIED", and confidence to lower than 0.70.
2. Never invent info. Return null for fields not present in the text.

EMAIL CONTENT:
Sender Name: ${email.senderName}
Subject: ${email.subject}
Body:
${email.body}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You always output structured JSON data.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API returned HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Groq returned an empty response.');
    }

    const result = JSON.parse(content) as ClassifierResult;
    
    // Safety verification/normalization of the output
    const allowedCategories: EmailCategory[] = ['INVOICE_SUBMISSION', 'PAYMENT_QUERY', 'DISPUTE', 'SPAM', 'UNCLASSIFIED'];
    if (!allowedCategories.includes(result.category)) {
      result.category = 'UNCLASSIFIED';
    }

    // Standardize confidence format
    if (typeof result.confidence !== 'number' || isNaN(result.confidence)) {
      result.confidence = 0.50;
    }
    if (result.confidence > 1) {
      result.confidence = result.confidence / 100; // auto-correct 0-100 values
    }

    return result;
  } catch (error) {
    console.error('Groq AI Classification failed, falling back to deterministic:', error);
    // Graceful fallback to rule-based engine on failure
    const fallbackResult = classifyDeterministic(email);
    fallbackResult.reasoning = `[AI Fallback Mode] ${fallbackResult.reasoning} (Reason: ${error instanceof Error ? error.message : 'Unknown error'})`;
    return fallbackResult;
  }
}
