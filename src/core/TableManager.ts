import {
  Table,
  TableSchema,
  ColumnDefinition,
  HashIndex,
  ValidationError,
  DatabaseError,
} from "../types";
import { Storage } from "../storage/Storage";

/**
 * Manages table creation, validation, and initialization
 */
export class TableManager {
  private storage: Storage;
  private tables: Map<string, Table>; // In-memory cache

  constructor(storage: Storage) {
    this.storage = storage;
    this.tables = new Map();
    this.loadExistingTables();
  }

  /**
   * Load all existing tables from disk on startup
   */
  private loadExistingTables(): void {
    const tableNames = this.storage.listTables();
    for (const name of tableNames) {
      const table = this.storage.loadTable(name);
      if (table) {
        this.tables.set(name, table);
      }
    }
  }

  /**
   * CREATE TABLE
   * Validates schema and initializes indexes
   */
  createTable(schema: TableSchema): void {
    // Check if table already exists
    if (this.tables.has(schema.name)) {
      throw new DatabaseError(`Table '${schema.name}' already exists`);
    }

    // Validate schema
    this.validateSchema(schema);

    // Create table structure
    const table: Table = {
      schema,
      rows: [],
      indexes: new Map(),
      nextRowId: 0,
    };

    // Initialize indexes for primary key and unique columns
    this.initializeIndexes(table);

    // Save to memory and disk
    this.tables.set(schema.name, table);
    this.storage.saveTable(table);
  }

  /**
   * Get a table (throw if not exists)
   */
  getTable(tableName: string): Table {
    const table = this.tables.get(tableName);
    if (!table) {
      throw new DatabaseError(`Table '${tableName}' does not exist`);
    }
    return table;
  }

  /**
   * Check if table exists
   */
  tableExists(tableName: string): boolean {
    return this.tables.has(tableName);
  }

  /**
   * List all table names
   */
  listTables(): string[] {
    return Array.from(this.tables.keys());
  }

  /**
   * Drop table
   */
  dropTable(tableName: string): void {
    if (!this.tables.has(tableName)) {
      throw new DatabaseError(`Table '${tableName}' does not exist`);
    }

    this.tables.delete(tableName);
    this.storage.deleteTable(tableName);
  }

  /**
   * Save table changes to disk
   */
  saveTable(tableName: string): void {
    const table = this.getTable(tableName);
    this.storage.saveTable(table);
  }

  /**
   * Validate table schema
   * Rules:
   * - Must have at least one column
   * - Column names must be unique
   * - Exactly one primary key
   * - Primary key cannot be null
   */
  private validateSchema(schema: TableSchema): void {
    if (!schema.name || schema.name.trim() === "") {
      throw new ValidationError("Table name cannot be empty");
    }

    if (schema.columns.length === 0) {
      throw new ValidationError("Table must have at least one column");
    }

    // Check for duplicate column names
    const columnNames = new Set<string>();
    for (const col of schema.columns) {
      if (!col.name || col.name.trim() === "") {
        throw new ValidationError("Column name cannot be empty");
      }

      if (columnNames.has(col.name)) {
        throw new ValidationError(`Duplicate column name: ${col.name}`);
      }

      columnNames.add(col.name);
    }

    // Check primary key constraints
    const primaryKeys = schema.columns.filter((c) => c.primaryKey);

    if (primaryKeys.length === 0) {
      throw new ValidationError("Table must have exactly one primary key");
    }

    if (primaryKeys.length > 1) {
      throw new ValidationError("Table cannot have multiple primary keys");
    }

    // Primary key must be NOT NULL
    const pk = primaryKeys[0];
    if (!pk.notNull) {
      pk.notNull = true; // Auto-enforce
    }
  }

  /**
   * Initialize indexes for primary key and unique columns
   * These indexes enable fast lookups and constraint enforcement
   */
  private initializeIndexes(table: Table): void {
    for (const column of table.schema.columns) {
      // Create index for primary key and unique columns
      if (column.primaryKey || column.unique) {
        const index: HashIndex = new Map();
        table.indexes.set(column.name, index);
      }
    }
  }

  /**
   * Get column definition by name
   */
  getColumn(
    schema: TableSchema,
    columnName: string
  ): ColumnDefinition | undefined {
    return schema.columns.find((c) => c.name === columnName);
  }

  /**
   * Get primary key column
   */
  getPrimaryKey(schema: TableSchema): ColumnDefinition {
    const pk = schema.columns.find((c) => c.primaryKey);
    if (!pk) {
      throw new DatabaseError("Table has no primary key"); // Should never happen after validation
    }
    return pk;
  }
}
