import { HashIndex, ColumnValue, Row } from "../types";

/**
 * Manages hash-based indexes for fast lookups
 *
 * Hash indexes provide O(1) average-case lookups for equality conditions.
 * Limitations:
 * - Only support equality (=) operations, not ranges (>, <, etc.)
 * - No sort order preservation (unlike B-trees)
 * - Memory usage grows with number of distinct values
 *
 * Production databases typically use B-tree indexes which support:
 * - Range queries
 * - Sorted retrieval
 * - Better worst-case guarantees
 */
export class IndexManager {
  /**
   * Create a new empty hash index
   */
  static createHashIndex(): HashIndex {
    return new Map<ColumnValue, Set<number>>();
  }

  /**
   * Insert a value into the index
   * Maps value -> set of row IDs
   */
  static insertIntoIndex(
    index: HashIndex,
    value: ColumnValue,
    rowId: number
  ): void {
    if (!index.has(value)) {
      index.set(value, new Set<number>());
    }
    index.get(value)!.add(rowId);
  }

  /**
   * Remove a value from the index
   */
  static removeFromIndex(
    index: HashIndex,
    value: ColumnValue,
    rowId: number
  ): void {
    const rowIds = index.get(value);
    if (rowIds) {
      rowIds.delete(rowId);
      // Clean up empty entries
      if (rowIds.size === 0) {
        index.delete(value);
      }
    }
  }

  /**
   * Look up row IDs by value
   * Returns empty set if value not found
   */
  static lookup(index: HashIndex, value: ColumnValue): Set<number> {
    return index.get(value) || new Set<number>();
  }

  /**
   * Check if a value exists in the index
   */
  static contains(index: HashIndex, value: ColumnValue): boolean {
    const rowIds = index.get(value);
    return rowIds !== undefined && rowIds.size > 0;
  }

  /**
   * Build an index from existing table data
   * Used when creating indexes on existing tables
   */
  static buildIndex(rows: Row[], columnName: string): HashIndex {
    const index = this.createHashIndex();

    for (let rowId = 0; rowId < rows.length; rowId++) {
      const value = rows[rowId][columnName];
      this.insertIntoIndex(index, value, rowId);
    }

    return index;
  }

  /**
   * Get index statistics
   * Useful for query optimization in more advanced systems
   */
  static getStats(index: HashIndex): {
    distinctValues: number;
    totalEntries: number;
    avgEntriesPerValue: number;
  } {
    const distinctValues = index.size;
    let totalEntries = 0;

    for (const rowIds of index.values()) {
      totalEntries += rowIds.size;
    }

    return {
      distinctValues,
      totalEntries,
      avgEntriesPerValue:
        distinctValues > 0 ? totalEntries / distinctValues : 0,
    };
  }

  /**
   * Demonstrate index performance
   * Shows the difference between indexed and non-indexed lookups
   */
  static demonstratePerformance(): void {
    console.log("=== Index Performance Demonstration ===\n");

    // Create sample data
    const rows: Row[] = [];
    for (let i = 0; i < 10000; i++) {
      rows.push({
        id: i,
        category: `cat_${i % 100}`, // 100 distinct categories
        value: Math.random() * 1000,
      });
    }

    // Build index on category
    const categoryIndex = this.buildIndex(rows, "category");

    // Indexed lookup
    console.time("Indexed lookup (100 searches)");
    for (let i = 0; i < 100; i++) {
      const searchValue = `cat_${i}`;
      const results = this.lookup(categoryIndex, searchValue);
      // In a real system, we'd fetch the actual rows here
    }
    console.timeEnd("Indexed lookup (100 searches)");

    // Non-indexed lookup (table scan)
    console.time("Table scan (100 searches)");
    for (let i = 0; i < 100; i++) {
      const searchValue = `cat_${i}`;
      const results = rows.filter((row) => row.category === searchValue);
    }
    console.timeEnd("Table scan (100 searches)");

    console.log("\nIndex stats:", this.getStats(categoryIndex));
    console.log("\nIndexed lookup is O(1) average case");
    console.log("Table scan is O(n) where n = number of rows");
  }
}

// Example usage and performance characteristics
if (require.main === module) {
  console.log("Hash Index Implementation\n");
  console.log("How it works:");
  console.log("1. Maps each distinct column value to a set of row IDs");
  console.log("2. Provides O(1) average-case lookup for equality checks");
  console.log("3. Automatically maintained on INSERT/UPDATE/DELETE\n");

  console.log("Trade-offs:");
  console.log("✓ Very fast for exact-match lookups (WHERE col = value)");
  console.log("✓ Simple to implement and understand");
  console.log("✗ Cannot handle range queries (WHERE col > value)");
  console.log("✗ No ordering (cannot optimize ORDER BY)");
  console.log("✗ Memory overhead for index storage\n");

  IndexManager.demonstratePerformance();
}
