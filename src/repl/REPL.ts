import * as readline from "readline";
import { Storage } from "../storage/Storage";
import { TableManager } from "../core/TableManager";
import { QueryEngine } from "../core/QueryEngine";
import { JoinEngine } from "../core/JoinEngine";
import { SQLParser } from "../parser/SQLParser";
import { DatabaseError } from "../types";

/**
 * Interactive REPL for the database
 * Accepts SQL-like commands and displays results
 */
export class DatabaseREPL {
  private storage: Storage;
  private tableManager: TableManager;
  private queryEngine: QueryEngine;
  private joinEngine: JoinEngine;
  private parser: SQLParser;
  private rl: readline.Interface;

  constructor(dataDir: string = "./data") {
    this.storage = new Storage(dataDir);
    this.tableManager = new TableManager(this.storage);
    this.queryEngine = new QueryEngine(this.tableManager);
    this.joinEngine = new JoinEngine(this.tableManager);
    this.parser = new SQLParser();

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "sql> ",
    });
  }

  /**
   * Start the REPL
   */
  start(): void {
    this.printWelcome();
    this.rl.prompt();

    this.rl.on("line", (line: string) => {
      const input = line.trim();

      if (input === "") {
        this.rl.prompt();
        return;
      }

      if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") {
        console.log("Goodbye!");
        this.rl.close();
        return;
      }

      if (input.toLowerCase() === "help") {
        this.printHelp();
        this.rl.prompt();
        return;
      }

      try {
        this.executeSQL(input);
      } catch (error) {
        if (error instanceof DatabaseError) {
          console.error(`Error: ${error.message}`);
        } else {
          console.error(`Unexpected error: ${error}`);
        }
      }

      this.rl.prompt();
    });

    this.rl.on("close", () => {
      process.exit(0);
    });
  }

  /**
   * Execute a SQL statement
   */
  private executeSQL(sql: string): void {
    const statement = this.parser.parse(sql);

    switch (statement.type) {
      case "CREATE_TABLE":
        this.tableManager.createTable(statement.schema);
        console.log(`Table '${statement.schema.name}' created.`);
        break;

      case "INSERT":
        this.queryEngine.insert(statement.tableName, statement.row);
        console.log("1 row inserted.");
        break;

      case "SELECT":
        const selectResult = this.queryEngine.select(
          statement.tableName,
          statement.columns,
          statement.where
        );
        this.printTable(selectResult.rows);
        console.log(`${selectResult.rowCount} rows.`);
        break;

      case "UPDATE":
        const updateCount = this.queryEngine.update(
          statement.tableName,
          statement.updates,
          statement.where
        );
        console.log(`${updateCount} rows updated.`);
        break;

      case "DELETE":
        const deleteCount = this.queryEngine.delete(
          statement.tableName,
          statement.where
        );
        console.log(`${deleteCount} rows deleted.`);
        break;

      case "JOIN":
        const joinResult = this.joinEngine.innerJoin({
          leftTable: statement.leftTable,
          leftColumn: statement.leftColumn,
          rightTable: statement.rightTable,
          rightColumn: statement.rightColumn,
        });
        this.printTable(joinResult.rows);
        console.log(`${joinResult.rowCount} rows.`);
        break;

      case "SHOW_TABLES":
        const tables = this.tableManager.listTables();
        if (tables.length === 0) {
          console.log("No tables.");
        } else {
          console.log("Tables:");
          tables.forEach((t) => console.log(`  ${t}`));
        }
        break;

      case "DESCRIBE":
        const table = this.tableManager.getTable(statement.tableName);
        console.log(`\nTable: ${statement.tableName}`);
        console.log("Columns:");
        for (const col of table.schema.columns) {
          const constraints = [];
          if (col.primaryKey) constraints.push("PRIMARY KEY");
          if (col.unique) constraints.push("UNIQUE");
          if (col.notNull) constraints.push("NOT NULL");
          const constraintStr =
            constraints.length > 0 ? ` (${constraints.join(", ")})` : "";
          console.log(`  ${col.name}: ${col.type}${constraintStr}`);
        }
        console.log(`\nRows: ${table.rows.length}`);
        break;
    }
  }

  /**
   * Print rows as a formatted table
   */
  private printTable(rows: any[]): void {
    if (rows.length === 0) {
      console.log("(empty)");
      return;
    }

    // Get all column names
    const columns = Array.from(
      new Set(rows.flatMap((row) => Object.keys(row)))
    );

    // Calculate column widths
    const widths: Record<string, number> = {};
    for (const col of columns) {
      widths[col] = Math.max(
        col.length,
        ...rows.map((row) => String(row[col] ?? "NULL").length)
      );
    }

    // Print header
    const header = columns.map((col) => col.padEnd(widths[col])).join(" | ");
    console.log("\n" + header);
    console.log(columns.map((col) => "-".repeat(widths[col])).join("-+-"));

    // Print rows
    for (const row of rows) {
      const line = columns
        .map((col) => String(row[col] ?? "NULL").padEnd(widths[col]))
        .join(" | ");
      console.log(line);
    }
    console.log();
  }

  /**
   * Print welcome message
   */
  private printWelcome(): void {
    console.log("========================================");
    console.log("   Simple RDBMS - Interactive Shell");
    console.log("========================================");
    console.log('Type "help" for usage information');
    console.log('Type "exit" to quit\n');
  }

  /**
   * Print help message
   */
  private printHelp(): void {
    console.log("\nSupported Commands:\n");
    console.log("CREATE TABLE:");
    console.log(
      "  CREATE TABLE users (id number PRIMARY KEY, name string NOT NULL);"
    );
    console.log("\nINSERT:");
    console.log("  INSERT INTO users (id, name) VALUES (1, 'Alice');");
    console.log("\nSELECT:");
    console.log("  SELECT * FROM users;");
    console.log("  SELECT name FROM users WHERE id = 1;");
    console.log("\nUPDATE:");
    console.log("  UPDATE users SET name = 'Bob' WHERE id = 1;");
    console.log("\nDELETE:");
    console.log("  DELETE FROM users WHERE id = 1;");
    console.log("\nJOIN:");
    console.log(
      "  SELECT * FROM users INNER JOIN orders ON users.id = orders.user_id;"
    );
    console.log("\nUTILITY:");
    console.log("  SHOW TABLES;");
    console.log("  DESCRIBE users;");
    console.log('\nType "exit" to quit\n');
  }
}

// Run REPL if this file is executed directly
if (require.main === module) {
  const repl = new DatabaseREPL();
  repl.start();
}
