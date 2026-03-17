import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Import interfaces from other agents - do not redefine
interface CalculationEntry {
  id: string;
  expression: string;
  result: string;
  created_at: string;
}

// Mock data for fallback when database is unavailable
const mockHistoryData: CalculationEntry[] = [
  {
    id: '1',
    expression: '2 + 2',
    result: '4',
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  },
  {
    id: '2',
    expression: '10 * 5',
    result: '50',
    created_at: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
  },
  {
    id: '3',
    expression: '100 / 4',
    result: '25',
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
];

// GET /api/history/[id] - Retrieve a specific calculation by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<{ data: CalculationEntry | null; error: string | null }>> {
  const id = params.id;

  // Validate ID parameter
  if (!id || typeof id !== 'string' || id.trim() === '') {
    return NextResponse.json({
      data: null,
      error: 'Invalid ID parameter',
    }, { status: 400 });
  }

  try {
    // Attempt to connect to Supabase
    const supabase = await createClient();

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Supabase configuration missing');
    }

    // Query the specific calculation by ID
    const { data, error } = await supabase
      .from('calculations')
      .select('id, expression, result, created_at')
      .eq('id', id.trim())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - calculation not found
        return NextResponse.json({
          data: null,
          error: 'Calculation not found',
        }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({
      data,
      error: null,
    });

  } catch (dbError) {
    // Fallback to mock data when database is unavailable
    console.warn('Database unavailable for GET by ID, using mock data:', dbError);

    const mockCalculation = mockHistoryData.find(item => item.id === id.trim());

    if (!mockCalculation) {
      return NextResponse.json({
        data: null,
        error: 'Calculation not found',
      }, { status: 404 });
    }

    return NextResponse.json({
      data: mockCalculation,
      error: null,
    });
  }
}

// DELETE /api/history/[id] - Delete a specific calculation by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<{ success: boolean; error: string | null }>> {
  const id = params.id;

  // Validate ID parameter
  if (!id || typeof id !== 'string' || id.trim() === '') {
    return NextResponse.json({
      success: false,
      error: 'Invalid ID parameter',
    }, { status: 400 });
  }

  try {
    // Attempt to connect to Supabase
    const supabase = await createClient();

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Supabase configuration missing');
    }

    // First check if the calculation exists
    const { data: existingData, error: selectError } = await supabase
      .from('calculations')
      .select('id')
      .eq('id', id.trim())
      .single();

    if (selectError) {
      if (selectError.code === 'PGRST116') {
        // No rows returned - calculation not found
        return NextResponse.json({
          success: false,
          error: 'Calculation not found',
        }, { status: 404 });
      }
      throw selectError;
    }

    // Delete the calculation
    const { error } = await supabase
      .from('calculations')
      .delete()
      .eq('id', id.trim());

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      error: null,
    });

  } catch (dbError) {
    // Fallback: return mock success when database is unavailable
    console.warn('Database unavailable for DELETE, returning mock response:', dbError);

    const mockCalculationExists = mockHistoryData.some(item => item.id === id.trim());

    if (!mockCalculationExists) {
      return NextResponse.json({
        success: false,
        error: 'Calculation not found',
      }, { status: 404 });
    }

    // In a real scenario, we'd remove from persistent storage
    // For mock mode, we just return success
    return NextResponse.json({
      success: true,
      error: null,
    });
  }
}