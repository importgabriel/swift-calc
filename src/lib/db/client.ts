import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface CalculationEntry {
  id: string;
  expression: string;
  result: string;
  created_at: string;
}

// Database interface for history storage
export interface HistoryStore {
  saveCalculation(expression: string, result: string): Promise<CalculationEntry>;
  getCalculations(): Promise<CalculationEntry[]>;
  deleteCalculation(id: string): Promise<void>;
}

// In-memory fallback store when Supabase is not configured
class MockHistoryStore implements HistoryStore {
  private calculations: CalculationEntry[] = [
    {
      id: '1',
      expression: '2 + 3',
      result: '5',
      created_at: new Date('2026-03-17T10:00:00Z').toISOString(),
    },
    {
      id: '2',
      expression: '10 * 4',
      result: '40',
      created_at: new Date('2026-03-17T10:05:00Z').toISOString(),
    },
    {
      id: '3',
      expression: '15 / 3',
      result: '5',
      created_at: new Date('2026-03-17T10:10:00Z').toISOString(),
    },
  ];

  async saveCalculation(expression: string, result: string): Promise<CalculationEntry> {
    const entry: CalculationEntry = {
      id: (this.calculations.length + 1).toString(),
      expression,
      result,
      created_at: new Date().toISOString(),
    };
    this.calculations.unshift(entry); // Add to beginning for most recent first
    return entry;
  }

  async getCalculations(): Promise<CalculationEntry[]> {
    return [...this.calculations]; // Return copy to prevent mutation
  }

  async deleteCalculation(id: string): Promise<void> {
    this.calculations = this.calculations.filter(calc => calc.id !== id);
  }
}

// Supabase-backed store
class SupabaseHistoryStore implements HistoryStore {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async saveCalculation(expression: string, result: string): Promise<CalculationEntry> {
    const { data, error } = await this.supabase
      .from('calculations')
      .insert({ expression, result })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save calculation: ${error.message}`);
    }

    return data as CalculationEntry;
  }

  async getCalculations(): Promise<CalculationEntry[]> {
    const { data, error } = await this.supabase
      .from('calculations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch calculations: ${error.message}`);
    }

    return data as CalculationEntry[];
  }

  async deleteCalculation(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('calculations')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete calculation: ${error.message}`);
    }
  }
}

// Initialize the appropriate store based on environment
function createHistoryStore(): HistoryStore {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase not configured, using mock data store');
    return new MockHistoryStore();
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    return new SupabaseHistoryStore(supabase);
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    console.warn('Falling back to mock data store');
    return new MockHistoryStore();
  }
}

// Export singleton instance
export const historyStore = createHistoryStore();

// Export types for use by other modules
export type { HistoryStore };