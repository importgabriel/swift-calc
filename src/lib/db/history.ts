import { historyStore, CalculationEntry, HistoryStore } from './client';

// API response wrapper type (imported from other agents)
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// History query helpers that wrap the historyStore with error handling
export class HistoryQueries {
  private store: HistoryStore;

  constructor(store: HistoryStore = historyStore) {
    this.store = store;
  }

  /**
   * Save a new calculation to history
   */
  async saveCalculation(
    expression: string,
    result: string
  ): Promise<ApiResponse<CalculationEntry>> {
    try {
      if (!expression?.trim() || !result?.trim()) {
        return {
          data: null,
          error: 'Expression and result are required',
        };
      }

      const entry = await this.store.saveCalculation(expression.trim(), result.trim());
      return {
        data: entry,
        error: null,
      };
    } catch (error) {
      console.error('Error saving calculation:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to save calculation',
      };
    }
  }

  /**
   * Retrieve all calculations from history, sorted by most recent first
   */
  async getAllCalculations(): Promise<ApiResponse<CalculationEntry[]>> {
    try {
      const calculations = await this.store.getCalculations();
      return {
        data: calculations,
        error: null,
      };
    } catch (error) {
      console.error('Error fetching calculations:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch calculations',
      };
    }
  }

  /**
   * Delete a calculation from history by ID
   */
  async deleteCalculation(id: string): Promise<ApiResponse<void>> {
    try {
      if (!id?.trim()) {
        return {
          data: null,
          error: 'Calculation ID is required',
        };
      }

      await this.store.deleteCalculation(id.trim());
      return {
        data: null,
        error: null,
      };
    } catch (error) {
      console.error('Error deleting calculation:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to delete calculation',
      };
    }
  }

  /**
   * Clear all calculation history
   */
  async clearAllHistory(): Promise<ApiResponse<void>> {
    try {
      const { data: calculations } = await this.getAllCalculations();
      if (calculations) {
        // Delete all calculations one by one
        const deletePromises = calculations.map(calc => this.store.deleteCalculation(calc.id));
        await Promise.all(deletePromises);
      }
      return {
        data: null,
        error: null,
      };
    } catch (error) {
      console.error('Error clearing history:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to clear history',
      };
    }
  }

  /**
   * Get recent calculations (limit to specified number)
   */
  async getRecentCalculations(limit: number = 10): Promise<ApiResponse<CalculationEntry[]>> {
    try {
      const { data: allCalculations, error } = await this.getAllCalculations();
      if (error) {
        return { data: null, error };
      }

      const recentCalculations = allCalculations?.slice(0, Math.max(0, limit)) || [];
      return {
        data: recentCalculations,
        error: null,
      };
    } catch (error) {
      console.error('Error fetching recent calculations:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch recent calculations',
      };
    }
  }
}

// Export singleton instance for use by API routes
export const historyQueries = new HistoryQueries();

// Export types for use by other modules
export type { CalculationEntry };