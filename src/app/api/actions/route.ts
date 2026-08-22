import { NextResponse } from 'next/server';
import { getActions } from '../../../lib/store';

export async function GET() {
  return NextResponse.json(getActions());
}
