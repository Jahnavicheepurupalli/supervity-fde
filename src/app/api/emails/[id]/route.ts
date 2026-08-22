import { NextRequest, NextResponse } from 'next/server';
import { getEmailById } from '../../../../lib/store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const email = getEmailById(id);
  
  if (!email) {
    return NextResponse.json({ error: 'Email not found' }, { status: 404 });
  }

  return NextResponse.json(email);
}
