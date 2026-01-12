import * as fs from "fs";
import * as path from "path";
import { Table, TableSchema, Row, HashIndex } from "../types";

/**
 * Serializable table format for JSON storage
 * We can't serialize Map/Set directly, so we convert to plain objects/arrays
 */
interface SerializedTable {
  schema: TableSchema;
  rows: Row[];
  indexes: Record<string, [string | number | boolean | null, number[]][]>; // columnName -> [value, rowIds[]]
  nextRowId: number;
}

/**
 * Simple filesystem-based storage layer
 * Each table is stored as a separate JSON file
 */
export class Storage {
  private dataDir: string;

  constructor(dataDir: string = "./data") {
    this.dataDir = dataDir;
    this.ensureDataDir();
  }

  /**
   * Ensure data directory exists
   */
  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Get file path for a table
   */
  private getTablePath(tableName: string): string {
    return path.join(this.dataDir, `${tableName}.json`);
  }

  /**
   * Check if a table exists on disk
   */
  tableExists(tableName: string): boolean {
    return fs.existsSync(this.getTablePath(tableName));
  }

  /**
   * Save table to disk
   * Converts Map/Set structures to serializable format
   */
  saveTable(table: Table): void {
    const serialized: SerializedTable = {
      schema: table.schema,
      rows: table.rows,
      indexes: this.serializeIndexes(table.indexes),
      nextRowId: table.nextRowId,
    };

    const filePath = this.getTablePath(table.schema.name);
    fs.writeFileSync(filePath, JSON.stringify(serialized, null, 2), "utf-8");
  }

  /**
   * Load table from disk
   * Reconstructs Map/Set structures from JSON
   */
  loadTable(tableName: string): Table | null {
    const filePath = this.getTablePath(tableName);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const serialized: SerializedTable = JSON.parse(content);

      return {
        schema: serialized.schema,
        rows: serialized.rows,
        indexes: this.deserializeIndexes(serialized.indexes),
        nextRowId: serialized.nextRowId,
      };
    } catch (error) {
      throw new Error(`Failed to load table ${tableName}: ${error}`);
    }
  }

  /**
   * Delete table file
   */
  deleteTable(tableName: string): void {
    const filePath = this.getTablePath(tableName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * List all tables
   */
  listTables(): string[] {
    const files = fs.readdirSync(this.dataDir);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
  }

  /**
   * Convert Map<string, HashIndex> to plain object for JSON
   * HashIndex is Map<ColumnValue, Set<number>>
   */
  private serializeIndexes(
    indexes: Map<string, HashIndex>
  ): Record<string, [string | number | boolean | null, number[]][]> {
    const result: Record<
      string,
      [string | number | boolean | null, number[]][]
    > = {};

    for (const [columnName, hashIndex] of indexes) {
      const entries: [string | number | boolean | null, number[]][] = [];

      for (const [value, rowIdSet] of hashIndex) {
        entries.push([value, Array.from(rowIdSet)]);
      }

      result[columnName] = entries;
    }

    return result;
  }

  /**
   * Reconstruct Map<string, HashIndex> from JSON
   */
  private deserializeIndexes(
    serialized: Record<string, [string | number | boolean | null, number[]][]>
  ): Map<string, HashIndex> {
    const indexes = new Map<string, HashIndex>();

    for (const [columnName, entries] of Object.entries(serialized)) {
      const hashIndex = new Map<
        string | number | boolean | null,
        Set<number>
      >();

      for (const [value, rowIds] of entries) {
        hashIndex.set(value, new Set(rowIds));
      }

      indexes.set(columnName, hashIndex);
    }

    return indexes;
  }
}
