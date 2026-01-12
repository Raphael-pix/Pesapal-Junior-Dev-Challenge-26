import { Row, QueryResult } from "../types";
import { TableManager } from "./TableManager";

/**
 * Join condition for INNER JOIN
 */
export interface JoinCondition {
  leftTable: string;
  leftColumn: string;
  rightTable: string;
  rightColumn: string;
}

/**
 * Executes JOIN operations
 *
 * Algorithm: Nested Loop Join
 * - For each row in left table
 *   - For each row in right table
 *     - If join condition matches, combine rows
 *
 * Complexity: O(n * m) where n = left rows, m = right rows
 *
 * Performance Limitations:
 * - No optimization (hash join, merge join, etc.)
 * - Suitable only for small datasets (< 1000 rows each)
 * - No use of indexes for join columns
 *
 * Production improvements would include:
 * - Hash joins for large datasets
 * - Index-based nested loop joins
 * - Join order optimization
 * - Cost-based query planning
 */
export class JoinEngine {
  private tableManager: TableManager;

  constructor(tableManager: TableManager) {
    this.tableManager = tableManager;
  }

  /**
   * Execute INNER JOIN
   * Returns rows where join condition is satisfied
   */
  innerJoin(condition: JoinCondition): QueryResult {
    const leftTable = this.tableManager.getTable(condition.leftTable);
    const rightTable = this.tableManager.getTable(condition.rightTable);

    const result: Row[] = [];

    // Nested loop join
    for (const leftRow of leftTable.rows) {
      for (const rightRow of rightTable.rows) {
        // Check if join condition is satisfied
        if (this.rowsMatch(leftRow, rightRow, condition)) {
          // Combine rows with prefixed column names to avoid conflicts
          const joinedRow = this.combineRows(
            leftRow,
            rightRow,
            condition.leftTable,
            condition.rightTable
          );
          result.push(joinedRow);
        }
      }
    }

    return {
      rows: result,
      rowCount: result.length,
    };
  }

  /**
   * Check if two rows match the join condition
   */
  private rowsMatch(
    leftRow: Row,
    rightRow: Row,
    condition: JoinCondition
  ): boolean {
    const leftValue = leftRow[condition.leftColumn];
    const rightValue = rightRow[condition.rightColumn];
    return leftValue === rightValue;
  }

  /**
   * Combine two rows, prefixing columns with table names
   * Example: { id: 1, name: 'Alice' } + { id: 1, email: 'alice@ex.com' }
   *       -> { users.id: 1, users.name: 'Alice', profiles.id: 1, profiles.email: 'alice@ex.com' }
   */
  private combineRows(
    leftRow: Row,
    rightRow: Row,
    leftTableName: string,
    rightTableName: string
  ): Row {
    const combined: Row = {};

    // Add left row columns with prefix
    for (const [col, value] of Object.entries(leftRow)) {
      combined[`${leftTableName}.${col}`] = value;
    }

    // Add right row columns with prefix
    for (const [col, value] of Object.entries(rightRow)) {
      combined[`${rightTableName}.${col}`] = value;
    }

    return combined;
  }

  /**
   * Demonstrate join performance characteristics
   */
  static demonstratePerformance(): void {
    console.log("=== JOIN Performance Analysis ===\n");
    console.log("Algorithm: Nested Loop Join");
    console.log("Complexity: O(n × m)\n");

    const sizes = [10, 100, 500, 1000];

    for (const size of sizes) {
      // Create mock data
      const leftTable = Array(size)
        .fill(null)
        .map((_, i) => ({ id: i % 50 }));
      const rightTable = Array(size)
        .fill(null)
        .map((_, i) => ({ id: i % 50 }));

      // Measure join time
      const start = Date.now();
      let matches = 0;

      for (const left of leftTable) {
        for (const right of rightTable) {
          if (left.id === right.id) {
            matches++;
          }
        }
      }

      const elapsed = Date.now() - start;

      console.log(`${size} × ${size} rows: ${elapsed}ms (${matches} matches)`);
    }

    console.log("\nPerformance degrades quadratically!");
    console.log("For 10,000 × 10,000 rows, this would take ~10 seconds.");
    console.log("\nProduction systems use:");
    console.log("- Hash joins: O(n + m)");
    console.log("- Index-based joins: O(n log m)");
    console.log("- Join order optimization");
  }
}

// Performance demo
if (require.main === module) {
  JoinEngine.demonstratePerformance();
}
