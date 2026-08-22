import { NextResponse } from 'next/server';
import { getEmails, resetStore } from '../../../lib/store';

export async function GET() {
  return NextResponse.json(getEmails());
}

export async function POST() {
  resetStore();
  return NextResponse.json({ success: true, emails: getEmails() });
}
