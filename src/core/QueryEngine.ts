import {
  Row,
  WhereCondition,
  QueryResult,
  ValidationError,
  ConstraintError,
  ColumnDefinition,
} from "../types";
import { TableManager } from "./TableManager";

/**
 * Executes CRUD operations on tables
 * Maintains indexes and enforces constraints
 */
export class QueryEngine {
  private tableManager: TableManager;

  constructor(tableManager: TableManager) {
    this.tableManager = tableManager;
  }

  /**
   * INSERT INTO table
   * Validates data, enforces constraints, updates indexes
   */
  insert(tableName: string, row: Row): void {
    const table = this.tableManager.getTable(tableName);

    // Validate row against schema
    this.validateRow(table.schema.columns, row);

    // Check constraints (primary key, unique)
    this.checkConstraints(table, row);

    // Assign row ID
    const rowId = table.nextRowId++;

    // Add to table
    table.rows.push(row);

    // Update indexes
    this.updateIndexesOnInsert(table, row, rowId);

    // Persist
    this.tableManager.saveTable(tableName);
  }

  /**
   * SELECT with optional WHERE clause
   * Uses indexes when available
   */
  select(
    tableName: string,
    columns?: string[],
    where?: WhereCondition
  ): QueryResult {
    const table = this.tableManager.getTable(tableName);

    // Filter rows based on WHERE clause
    let matchingRows: Row[];

    if (where) {
      matchingRows = this.filterRows(table, where);
    } else {
      matchingRows = [...table.rows]; // All rows
    }

    // Project columns if specified
    if (columns && columns.length > 0) {
      matchingRows = matchingRows.map((row) => {
        const projected: Row = {};
        for (const col of columns) {
          if (col in row) {
            projected[col] = row[col];
          }
        }
        return projected;
      });
    }

    return {
      rows: matchingRows,
      rowCount: matchingRows.length,
    };
  }

  /**
   * UPDATE rows matching WHERE clause
   */
  update(
    tableName: string,
    updates: Partial<Row>,
    where?: WhereCondition
  ): number {
    const table = this.tableManager.getTable(tableName);

    // Find rows to update
    const rowsToUpdate: Array<{ row: Row; index: number }> = [];

    for (let i = 0; i < table.rows.length; i++) {
      const row = table.rows[i];
      if (!where || this.rowMatchesCondition(row, where)) {
        rowsToUpdate.push({ row, index: i });
      }
    }

    // Validate updates won't violate constraints
    for (const { row } of rowsToUpdate) {
      const updatedRow: Row = { ...row };
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          updatedRow[key] = value;
        }
      }

      this.validateRow(table.schema.columns, updatedRow, true);

      // Check constraints (but exclude the current row when checking uniqueness)
      this.checkConstraints(table, updatedRow, row);
    }

    // Apply updates
    for (const { row, index } of rowsToUpdate) {
      // Remove old index entries
      this.updateIndexesOnDelete(table, row, index);

      // Update row
      Object.assign(row, updates);

      // Add new index entries
      this.updateIndexesOnInsert(table, row, index);
    }

    // Persist
    if (rowsToUpdate.length > 0) {
      this.tableManager.saveTable(tableName);
    }

    return rowsToUpdate.length;
  }

  /**
   * DELETE rows matching WHERE clause
   */
  delete(tableName: string, where?: WhereCondition): number {
    const table = this.tableManager.getTable(tableName);

    // Find rows to delete (in reverse order to avoid index issues)
    const rowsToDelete: Array<{ row: Row; index: number }> = [];

    for (let i = table.rows.length - 1; i >= 0; i--) {
      const row = table.rows[i];
      if (!where || this.rowMatchesCondition(row, where)) {
        rowsToDelete.push({ row, index: i });
      }
    }

    // Delete rows and update indexes
    for (const { row, index } of rowsToDelete) {
      this.updateIndexesOnDelete(table, row, index);
      table.rows.splice(index, 1);
    }

    // Persist
    if (rowsToDelete.length > 0) {
      this.tableManager.saveTable(tableName);
    }

    return rowsToDelete.length;
  }

  /**
   * Validate row data against schema
   */
  private validateRow(
    columns: ColumnDefinition[],
    row: Row,
    isUpdate: boolean = false
  ): void {
    for (const col of columns) {
      const value = row[col.name];

      // Check NOT NULL constraint
      if (col.notNull && (value === null || value === undefined)) {
        throw new ValidationError(`Column '${col.name}' cannot be null`);
      }

      // Check type
      if (value !== null && value !== undefined) {
        const actualType = typeof value;
        if (col.type === "string" && actualType !== "string") {
          throw new ValidationError(`Column '${col.name}' must be a string`);
        }
        if (col.type === "number" && actualType !== "number") {
          throw new ValidationError(`Column '${col.name}' must be a number`);
        }
        if (col.type === "boolean" && actualType !== "boolean") {
          throw new ValidationError(`Column '${col.name}' must be a boolean`);
        }
      }
    }

    // For inserts, check all required columns are present
    if (!isUpdate) {
      const requiredColumns = columns.filter((c) => c.notNull);
      for (const col of requiredColumns) {
        if (!(col.name in row)) {
          throw new ValidationError(`Missing required column: ${col.name}`);
        }
      }
    }
  }

  /**
   * Check primary key and unique constraints
   */
  private checkConstraints(table: any, row: Row, excludeRow?: Row): void {
    for (const col of table.schema.columns) {
      if (col.primaryKey || col.unique) {
        const value = row[col.name];
        const index = table.indexes.get(col.name);

        if (index && index.has(value)) {
          // Check if this value exists in other rows
          const existingRowIds = index.get(value);

          // If we're updating, exclude the current row
          if (excludeRow) {
            const currentRowId = table.rows.indexOf(excludeRow);
            if (
              existingRowIds &&
              existingRowIds.size === 1 &&
              existingRowIds.has(currentRowId)
            ) {
              continue; // It's the same row, constraint OK
            }
          }

          const constraintType = col.primaryKey ? "Primary key" : "Unique";
          throw new ConstraintError(
            `${constraintType} violation: ${col.name}=${value} already exists`
          );
        }
      }
    }
  }

  /**
   * Update indexes when inserting a row
   */
  private updateIndexesOnInsert(table: any, row: Row, rowId: number): void {
    for (const [columnName, index] of table.indexes) {
      const value = row[columnName];

      if (!index.has(value)) {
        index.set(value, new Set());
      }
      index.get(value)!.add(rowId);
    }
  }

  /**
   * Update indexes when deleting a row
   */
  private updateIndexesOnDelete(table: any, row: Row, rowId: number): void {
    for (const [columnName, index] of table.indexes) {
      const value = row[columnName];
      const rowIdSet = index.get(value);

      if (rowIdSet) {
        rowIdSet.delete(rowId);
        if (rowIdSet.size === 0) {
          index.delete(value);
        }
      }
    }
  }

  /**
   * Filter rows using WHERE condition
   * Uses index if available and condition is equality
   */
  private filterRows(table: any, where: WhereCondition): Row[] {
    // Try to use index for equality checks
    if (where.operator === "=" && table.indexes.has(where.column)) {
      const index = table.indexes.get(where.column)!;
      const rowIds = index.get(where.value);

      if (!rowIds || rowIds.size === 0) {
        return [];
      }

      return Array.from(rowIds).map((id) => table.rows[id as number]);
    }

    // Fall back to full table scan
    return table.rows.filter((row: Row) =>
      this.rowMatchesCondition(row, where)
    );
  }

  /**
   * Check if a row matches a WHERE condition
   */
  private rowMatchesCondition(row: Row, condition: WhereCondition): boolean {
    const value = row[condition.column];

    switch (condition.operator) {
      case "=":
        return value === condition.value;
      case "!=":
        return value !== condition.value;
      case ">":
        return (
          value !== null && condition.value !== null && value > condition.value
        );
      case "<":
        return (
          value !== null && condition.value !== null && value < condition.value
        );
      case ">=":
        return (
          value !== null && condition.value !== null && value >= condition.value
        );
      case "<=":
        return (
          value !== null && condition.value !== null && value <= condition.value
        );
      default:
        return false;
    }
  }
}
