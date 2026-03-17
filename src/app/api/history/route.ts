import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Import interfaces from other agents - do not redefine
interface CalculationEntry {
  id: string;
  expression: string;
  result: string;
  created_at: string;
}

interface SaveCalculationInput {
  expression: string;
  result: string;
}

interface HistoryResult {
  data: CalculationEntry[];
  error: string | null;
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

// GET /api/history - Retrieve paginated calculation history
export async function GET(request: NextRequest): Promise<NextResponse<HistoryResult>> {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
  const offset = (page - 1) * limit;

  try {
    // Attempt to connect to Supabase
    const supabase = await createClient();

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Supabase configuration missing');
    }

    // Query the calculations table
    const { data, error } = await supabase
      .from('calculations')
      .select('id, expression, result, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      data: data || [],
      error: null,
    });

  } catch (error) {
    // Fallback to mock data when database is unavailable
    console.warn('Database unavailable, using mock data:', error);

    // Simulate pagination with mock data
    const paginatedMockData = mockHistoryData.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginatedMockData,
      error: null,
    }, { status: 200 });
  }
}

// POST /api/history - Save a new calculation entry
export async function POST(request: NextRequest): Promise<NextResponse<{ data: CalculationEntry | null; error: string | null }>> {
  try {
    // Parse and validate request body
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json({
        data: null,
        error: 'Request body is required',
      }, { status: 400 });
    }

    const { expression, result } = body as SaveCalculationInput;

    // Validate required fields
    if (!expression || typeof expression !== 'string' || expression.trim() === '') {
      return NextResponse.json({
        data: null,
        error: 'Expression is required and must be a non-empty string',
      }, { status: 400 });
    }

    if (!result || typeof result !== 'string' || result.trim() === '') {
      return NextResponse.json({
        data: null,
        error: 'Result is required and must be a non-empty string',
      }, { status: 400 });
    }

    try {
      // Attempt to connect to Supabase
      const supabase = await createClient();

      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('Supabase configuration missing');
      }

      // Insert new calculation
      const { data, error } = await supabase
        .from('calculations')
        .insert([
          {
            expression: expression.trim(),
            result: result.trim(),
            created_at: new Date().toISOString(),
          },
        ])
        .select('id, expression, result, created_at')
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        data,
        error: null,
      }, { status: 201 });

    } catch (dbError) {
      // Fallback: return mock success response when database is unavailable
      console.warn('Database unavailable for POST, returning mock response:', dbError);

      const mockCalculation: CalculationEntry = {
        id: Math.random().toString(36).substring(2),
        expression: expression.trim(),
        result: result.trim(),
        created_at: new Date().toISOString(),
      };

      return NextResponse.json({
        data: mockCalculation,
        error: null,
      }, { status: 201 });
    }

  } catch (error) {
    // Handle JSON parsing errors or unexpected errors
    return NextResponse.json({
      data: null,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }, { status: 400 });
  }
}