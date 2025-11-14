import { Injectable, signal } from '@angular/core';

export interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan';
  value: any;
}

export interface AdvancedSearchQuery {
  filters: SearchFilter[];
  logic: 'AND' | 'OR';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  resultCount: number;
  type: 'users' | 'products' | 'logs';
}

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  // Search history
  searchHistory = signal<SearchHistoryItem[]>([]);
  recentSearches = signal<string[]>([]);

  // Search suggestions
  suggestions = signal<string[]>([]);

  constructor() {
    this.loadSearchHistory();
    this.loadRecentSearches();
  }

  /**
   * Perform advanced search with multiple filters
   */
  advancedSearch<T>(data: T[], query: AdvancedSearchQuery): T[] {
    let results = data;

    // Apply filters
    if (query.filters.length > 0) {
      if (query.logic === 'AND') {
        // All filters must match
        results = data.filter((item) =>
          query.filters.every((filter) => this.matchesFilter(item, filter))
        );
      } else {
        // At least one filter must match
        results = data.filter((item) =>
          query.filters.some((filter) => this.matchesFilter(item, filter))
        );
      }
    }

    // Apply sorting
    if (query.sortBy) {
      results = this.sortResults(results, query.sortBy, query.sortOrder || 'asc');
    }

    return results;
  }

  /**
   * Simple fuzzy search across multiple fields
   */
  fuzzySearch<T>(
    data: T[],
    searchTerm: string,
    fields: (keyof T)[]
  ): T[] {
    if (!searchTerm) return data;

    const lowerSearch = searchTerm.toLowerCase();
    return data.filter((item) => {
      return fields.some((field) => {
        const value = item[field];
        if (value == null) return false;

        // Handle nested objects
        if (typeof value === 'object') {
          return JSON.stringify(value).toLowerCase().includes(lowerSearch);
        }

        return String(value).toLowerCase().includes(lowerSearch);
      });
    });
  }

  /**
   * Search with highlighting
   */
  searchWithHighlight<T>(
    data: T[],
    searchTerm: string,
    fields: (keyof T)[]
  ): Array<T & { _highlights?: Record<string, string> }> {
    if (!searchTerm) return data as Array<T & { _highlights?: Record<string, string> }>;

    const lowerSearch = searchTerm.toLowerCase();
    const results: Array<T & { _highlights?: Record<string, string> }> = [];

    data.forEach((item) => {
      const highlights: Record<string, string> = {};
      let hasMatch = false;

      fields.forEach((field) => {
        const value = String(item[field] || '');
        const lowerValue = value.toLowerCase();

        if (lowerValue.includes(lowerSearch)) {
          hasMatch = true;
          // Simple highlight: wrap matching text in <mark> tags
          const regex = new RegExp(`(${searchTerm})`, 'gi');
          highlights[String(field)] = value.replace(regex, '<mark>$1</mark>');
        }
      });

      if (hasMatch) {
        results.push({ ...item, _highlights: highlights });
      }
    });

    return results;
  }

  /**
   * Add search to history
   */
  addToHistory(
    query: string,
    resultCount: number,
    type: 'users' | 'products' | 'logs'
  ): void {
    const historyItem: SearchHistoryItem = {
      id: Date.now().toString(),
      query,
      timestamp: new Date(),
      resultCount,
      type,
    };

    const history = [historyItem, ...this.searchHistory()].slice(0, 50);
    this.searchHistory.set(history);
    this.saveSearchHistory(history);

    // Update recent searches
    const recent = [query, ...this.recentSearches().filter((q) => q !== query)].slice(0, 10);
    this.recentSearches.set(recent);
    this.saveRecentSearches(recent);
  }

  /**
   * Clear search history
   */
  clearHistory(): void {
    this.searchHistory.set([]);
    this.recentSearches.set([]);
    localStorage.removeItem('search_history');
    localStorage.removeItem('recent_searches');
  }

  /**
   * Generate search suggestions
   */
  generateSuggestions(query: string, data: any[], fields: string[]): string[] {
    if (!query || query.length < 2) return [];

    const lowerQuery = query.toLowerCase();
    const suggestions = new Set<string>();

    data.forEach((item) => {
      fields.forEach((field) => {
        const value = String(this.getNestedValue(item, field) || '');
        if (value.toLowerCase().includes(lowerQuery)) {
          suggestions.add(value);
        }
      });
    });

    return Array.from(suggestions).slice(0, 10);
  }

  // Private helper methods

  private matchesFilter(item: any, filter: SearchFilter): boolean {
    const value = this.getNestedValue(item, filter.field);
    const filterValue = filter.value;

    switch (filter.operator) {
      case 'equals':
        return value === filterValue;
      case 'contains':
        return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'startsWith':
        return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
      case 'endsWith':
        return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
      case 'greaterThan':
        return Number(value) > Number(filterValue);
      case 'lessThan':
        return Number(value) < Number(filterValue);
      default:
        return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private sortResults<T>(data: T[], sortBy: string, sortOrder: 'asc' | 'desc'): T[] {
    return [...data].sort((a, b) => {
      const aVal = this.getNestedValue(a, sortBy);
      const bVal = this.getNestedValue(b, sortBy);

      if (aVal === bVal) return 0;

      const comparison = aVal > bVal ? 1 : -1;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  private loadSearchHistory(): void {
    try {
      const stored = localStorage.getItem('search_history');
      if (stored) {
        const history = JSON.parse(stored);
        this.searchHistory.set(history);
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  }

  private saveSearchHistory(history: SearchHistoryItem[]): void {
    try {
      localStorage.setItem('search_history', JSON.stringify(history));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }

  private loadRecentSearches(): void {
    try {
      const stored = localStorage.getItem('recent_searches');
      if (stored) {
        const recent = JSON.parse(stored);
        this.recentSearches.set(recent);
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  }

  private saveRecentSearches(recent: string[]): void {
    try {
      localStorage.setItem('recent_searches', JSON.stringify(recent));
    } catch (error) {
      console.error('Error saving recent searches:', error);
    }
  }
}
