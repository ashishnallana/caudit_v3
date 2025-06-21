import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { trialBalance, appliedDate } = body;

    // Make request to Python backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/generate-final-accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        trialBalance,
        appliedDate,
        userId: session.user.id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Backend error: ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in generate-final-accounts API:', error);
    return NextResponse.json(
      { error: 'Failed to generate final accounts' },
      { status: 500 }
    );
  }
} 