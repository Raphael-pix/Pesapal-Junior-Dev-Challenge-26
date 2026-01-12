// Core types
export * from "./types";

// Storage layer
export { Storage } from "./storage/Storage";

// Core database components
export { TableManager } from "./core/TableManager";
export { QueryEngine } from "./core/QueryEngine";
export { JoinEngine } from "./core/JoinEngine";
export { IndexManager } from "./core/IndexManager";

// SQL parser
export { SQLParser } from "./parser/SQLParser";
export type { ParsedStatement } from "./parser/SQLParser";

// REPL
export { DatabaseREPL } from "./repl/REPL";

/**
 * Simple RDBMS - A minimal relational database implemented in TypeScript
 *
 * Example usage:
 *
 * ```typescript
 * import { Storage, TableManager, QueryEngine } from './index';
 *
 * const storage = new Storage('./mydata');
 * const tables = new TableManager(storage);
 * const query = new QueryEngine(tables);
 *
 * // Create table
 * tables.createTable({
 *   name: 'users',
 *   columns: [
 *     { name: 'id', type: 'number', primaryKey: true },
 *     { name: 'name', type: 'string', notNull: true }
 *   ]
 * });
 *
 * // Insert
 * query.insert('users', { id: 1, name: 'Alice' });
 *
 * // Select
 * const result = query.select('users');
 * console.log(result.rows);
 * ```
 */

// Version info
export const VERSION = "1.0.0";

// Default export for convenience
import { Storage } from "./storage/Storage";
import { TableManager } from "./core/TableManager";
import { QueryEngine } from "./core/QueryEngine";
import { JoinEngine } from "./core/JoinEngine";
import { SQLParser } from "./parser/SQLParser";

/**
 * Create a new database instance with all components initialized
 */
export function createDatabase(dataDir: string = "./data") {
  const storage = new Storage(dataDir);
  const tableManager = new TableManager(storage);
  const queryEngine = new QueryEngine(tableManager);
  const joinEngine = new JoinEngine(tableManager);
  const parser = new SQLParser();

  return {
    storage,
    tableManager,
    queryEngine,
    joinEngine,
    parser,

    /**
     * Execute a SQL statement (convenience method)
     */
    execute(sql: string) {
      const statement = parser.parse(sql);

      switch (statement.type) {
        case "CREATE_TABLE":
          tableManager.createTable(statement.schema);
          return {
            success: true,
            message: `Table '${statement.schema.name}' created`,
          };

        case "INSERT":
          queryEngine.insert(statement.tableName, statement.row);
          return { success: true, message: "1 row inserted" };

        case "SELECT":
          return queryEngine.select(
            statement.tableName,
            statement.columns,
            statement.where
          );

        case "UPDATE":
          const updateCount = queryEngine.update(
            statement.tableName,
            statement.updates,
            statement.where
          );
          return { success: true, message: `${updateCount} row(s) updated` };

        case "DELETE":
          const deleteCount = queryEngine.delete(
            statement.tableName,
            statement.where
          );
          return { success: true, message: `${deleteCount} row(s) deleted` };

        case "JOIN":
          return joinEngine.innerJoin({
            leftTable: statement.leftTable,
            leftColumn: statement.leftColumn,
            rightTable: statement.rightTable,
            rightColumn: statement.rightColumn,
          });

        case "SHOW_TABLES":
          const tables = tableManager.listTables();
          return { success: true, tables };

        case "DESCRIBE":
          const table = tableManager.getTable(statement.tableName);
          return {
            success: true,
            schema: table.schema,
            rowCount: table.rows.length,
          };

        default:
          return { success: false, message: "Unknown statement type" };
      }
    },
  };
}

// Example usage (if run directly)
if (require.main === module) {
  console.log("Simple RDBMS v" + VERSION);
  console.log("\nUsage:");
  console.log("  npm run demo   - Run comprehensive demo");
  console.log("  npm run repl   - Start interactive shell");
  console.log("  npm run web    - Start web application");
  console.log("\nOr import as library:");
  console.log("  import { createDatabase } from './index';");
  console.log("  const db = createDatabase('./mydata');");
  console.log("  db.execute('CREATE TABLE ...');");
}
