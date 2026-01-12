/**
 * Supported column data types
 */
export type ColumnType = "string" | "number" | "boolean";

/**
 * Column definition with name, type, and constraints
 */
export interface ColumnDefinition {
  name: string;
  type: ColumnType;
  primaryKey?: boolean;
  unique?: boolean;
  notNull?: boolean;
}

/**
 * Table schema: name + column definitions
 */
export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
}

/**
 * Actual value types that can be stored
 * null is allowed unless notNull constraint is set
 */
export type ColumnValue = string | number | boolean | null;

/**
 * A row is a key-value map: column name -> value
 */
export type Row = Record<string, ColumnValue>;

/**
 * Index types we'll support
 * Starting with hash-based for O(1) lookups
 */
export type IndexType = "hash";

/**
 * Index definition
 */
export interface IndexDefinition {
  columnName: string;
  type: IndexType;
}

/**
 * Hash index: maps column value to row IDs
 * Using Set for handling multiple rows with same value (non-unique columns)
 */
export type HashIndex = Map<ColumnValue, Set<number>>;

/**
 * Complete table structure
 */
export interface Table {
  schema: TableSchema;
  rows: Row[];
  indexes: Map<string, HashIndex>; // columnName -> index
  nextRowId: number; // For generating unique row IDs
}

/**
 * WHERE clause condition
 */
export interface WhereCondition {
  column: string;
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=";
  value: ColumnValue;
}

/**
 * Query result set
 */
export interface QueryResult {
  rows: Row[];
  rowCount: number;
}

/**
 * Error types for better error handling
 */
export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class ConstraintError extends DatabaseError {
  constructor(message: string) {
    super(message);
    this.name = "ConstraintError";
  }
}
