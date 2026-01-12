import {
  TableSchema,
  ColumnDefinition,
  ColumnType,
  Row,
  WhereCondition,
  ColumnValue,
  ValidationError,
} from "../types";

/**
 * Parsed SQL statement types
 */
export type ParsedStatement =
  | { type: "CREATE_TABLE"; schema: TableSchema }
  | { type: "INSERT"; tableName: string; row: Row }
  | {
      type: "SELECT";
      tableName: string;
      columns?: string[];
      where?: WhereCondition;
    }
  | {
      type: "UPDATE";
      tableName: string;
      updates: Partial<Row>;
      where?: WhereCondition;
    }
  | { type: "DELETE"; tableName: string; where?: WhereCondition }
  | {
      type: "JOIN";
      leftTable: string;
      rightTable: string;
      leftColumn: string;
      rightColumn: string;
    }
  | { type: "SHOW_TABLES" }
  | { type: "DESCRIBE"; tableName: string };

/**
 * Simple SQL parser
 *
 * Supported syntax:
 *
 * CREATE TABLE users (
 *   id number PRIMARY KEY,
 *   name string NOT NULL,
 *   email string UNIQUE
 * );
 *
 * INSERT INTO users (id, name, email) VALUES (1, 'Alice', 'alice@example.com');
 *
 * SELECT * FROM users;
 * SELECT * FROM users INNER JOIN profiles ON users.id = profiles.user_id;
 *
 * UPDATE users SET name = 'Bob' WHERE id = 1;
 *
 * DELETE FROM users WHERE id = 1;
 *
 * SHOW TABLES;
 *
 * DESCRIBE users;
 */
export class SQLParser {
  /**
   * Parse a SQL statement
   */
  parse(sql: string): ParsedStatement {
    // Normalize: trim and remove semicolon
    sql = sql.trim().replace(/;$/, "");

    // Determine statement type
    const upperSQL = sql.toUpperCase();

    if (upperSQL.startsWith("CREATE TABLE")) {
      return this.parseCreateTable(sql);
    } else if (upperSQL.startsWith("INSERT INTO")) {
      return this.parseInsert(sql);
    } else if (upperSQL.startsWith("SELECT")) {
      return this.parseSelect(sql);
    } else if (upperSQL.includes("INNER JOIN")) {
      return this.parseJoin(sql);
    } else if (upperSQL.startsWith("UPDATE")) {
      return this.parseUpdate(sql);
    } else if (upperSQL.startsWith("DELETE FROM")) {
      return this.parseDelete(sql);
    } else if (upperSQL === "SHOW TABLES") {
      return { type: "SHOW_TABLES" };
    } else if (upperSQL.startsWith("DESCRIBE ")) {
      return this.parseDescribe(sql);
    } else {
      throw new ValidationError(`Unsupported SQL statement: ${sql}`);
    }
  }

  /**
   * Parse CREATE TABLE statement
   * CREATE TABLE users (id number PRIMARY KEY, name string NOT NULL)
   */
  private parseCreateTable(sql: string): ParsedStatement {
    const match = sql.match(/CREATE TABLE\s+(\w+)\s*\((.*)\)/is);

    if (!match) {
      throw new ValidationError("Invalid CREATE TABLE syntax");
    }

    const tableName = match[1];
    const columnsStr = match[2];

    // Parse columns
    const columns: ColumnDefinition[] = [];
    const columnDefs = columnsStr.split(",").map((s) => s.trim());

    for (const def of columnDefs) {
      columns.push(this.parseColumnDefinition(def));
    }

    return {
      type: "CREATE_TABLE",
      schema: { name: tableName, columns },
    };
  }

  /**
   * Parse column definition
   * Example: "id number PRIMARY KEY"
   */
  private parseColumnDefinition(def: string): ColumnDefinition {
    const parts = def.trim().split(/\s+/);

    if (parts.length < 2) {
      throw new ValidationError(`Invalid column definition: ${def}`);
    }

    const name = parts[0];
    const typeStr = parts[1].toLowerCase();

    // Validate type
    if (!["string", "number", "boolean"].includes(typeStr)) {
      throw new ValidationError(`Invalid column type: ${typeStr}`);
    }

    const column: ColumnDefinition = {
      name,
      type: typeStr as ColumnType,
    };

    // Parse constraints
    const upperDef = def.toUpperCase();
    if (upperDef.includes("PRIMARY KEY")) {
      column.primaryKey = true;
      column.notNull = true;
    }
    if (upperDef.includes("UNIQUE")) {
      column.unique = true;
    }
    if (upperDef.includes("NOT NULL")) {
      column.notNull = true;
    }

    return column;
  }

  /**
   * Parse INSERT statement
   * INSERT INTO users (id, name) VALUES (1, 'Alice')
   */
  private parseInsert(sql: string): ParsedStatement {
    const match = sql.match(
      /INSERT INTO\s+(\w+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\)/is
    );

    if (!match) {
      throw new ValidationError("Invalid INSERT syntax");
    }

    const tableName = match[1];
    const columnsStr = match[2];
    const valuesStr = match[3];

    const columns = columnsStr.split(",").map((s) => s.trim());
    const values = this.parseValues(valuesStr);

    if (columns.length !== values.length) {
      throw new ValidationError("Column count does not match value count");
    }

    const row: Row = {};
    for (let i = 0; i < columns.length; i++) {
      row[columns[i]] = values[i];
    }

    return { type: "INSERT", tableName, row };
  }

  /**
   * Parse SELECT statement
   * SELECT * FROM users WHERE id = 1
   */
  private parseSelect(sql: string): ParsedStatement {
    const match = sql.match(
      /SELECT\s+(.*?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.*))?/is
    );

    if (!match) {
      throw new ValidationError("Invalid SELECT syntax");
    }

    const columnsStr = match[1].trim();
    const tableName = match[2];
    const whereStr = match[3];

    const columns =
      columnsStr === "*"
        ? undefined
        : columnsStr.split(",").map((s) => s.trim());
    const where = whereStr ? this.parseWhere(whereStr) : undefined;

    return { type: "SELECT", tableName, columns, where };
  }

  /**
   * Parse UPDATE statement
   * UPDATE users SET name = 'Bob' WHERE id = 1
   */
  private parseUpdate(sql: string): ParsedStatement {
    const match = sql.match(
      /UPDATE\s+(\w+)\s+SET\s+(.*?)(?:\s+WHERE\s+(.*))?$/is
    );

    if (!match) {
      throw new ValidationError("Invalid UPDATE syntax");
    }

    const tableName = match[1];
    const setStr = match[2];
    const whereStr = match[3];

    const updates = this.parseSetClause(setStr);
    const where = whereStr ? this.parseWhere(whereStr) : undefined;

    return { type: "UPDATE", tableName, updates, where };
  }

  /**
   * Parse DELETE statement
   * DELETE FROM users WHERE id = 1
   */
  private parseDelete(sql: string): ParsedStatement {
    const match = sql.match(/DELETE FROM\s+(\w+)(?:\s+WHERE\s+(.*))?/is);

    if (!match) {
      throw new ValidationError("Invalid DELETE syntax");
    }

    const tableName = match[1];
    const whereStr = match[2];

    const where = whereStr ? this.parseWhere(whereStr) : undefined;

    return { type: "DELETE", tableName, where };
  }

  /**
   * Parse DESCRIBE statement
   * DESCRIBE users
   */
  private parseDescribe(sql: string): ParsedStatement {
    const match = sql.match(/DESCRIBE\s+(\w+)/i);

    if (!match) {
      throw new ValidationError("Invalid DESCRIBE syntax");
    }

    return { type: "DESCRIBE", tableName: match[1] };
  }

  /**
   * Parse JOIN statement
   * SELECT * FROM users INNER JOIN profiles ON users.id = profiles.user_id
   */
  private parseJoin(sql: string): ParsedStatement {
    const match = sql.match(
      /SELECT\s+\*\s+FROM\s+(\w+)\s+INNER JOIN\s+(\w+)\s+ON\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/i
    );

    if (!match) {
      throw new ValidationError(
        "Invalid JOIN syntax. Use: SELECT * FROM table1 INNER JOIN table2 ON table1.col = table2.col"
      );
    }

    return {
      type: "JOIN",
      leftTable: match[1],
      rightTable: match[2],
      leftColumn: match[4],
      rightColumn: match[6],
    };
  }

  /**
   * Parse WHERE clause
   * Example: "id = 1" or "age > 18"
   */
  private parseWhere(whereStr: string): WhereCondition {
    const match = whereStr.match(/(\w+)\s*(=|!=|>|<|>=|<=)\s*(.+)/);

    if (!match) {
      throw new ValidationError(`Invalid WHERE clause: ${whereStr}`);
    }

    const column = match[1];
    const operator = match[2] as WhereCondition["operator"];
    const valueStr = match[3].trim();

    return {
      column,
      operator,
      value: this.parseValue(valueStr),
    };
  }

  /**
   * Parse SET clause for UPDATE
   * Example: "name = 'Bob', age = 30"
   */
  private parseSetClause(setStr: string): Partial<Row> {
    const updates: Partial<Row> = {};
    const assignments = setStr.split(",").map((s) => s.trim());

    for (const assignment of assignments) {
      const match = assignment.match(/(\w+)\s*=\s*(.+)/);
      if (!match) {
        throw new ValidationError(`Invalid SET clause: ${assignment}`);
      }

      const column = match[1];
      const valueStr = match[2].trim();
      updates[column] = this.parseValue(valueStr);
    }

    return updates;
  }

  /**
   * Parse comma-separated values
   * Example: "1, 'Alice', true"
   */
  private parseValues(valuesStr: string): ColumnValue[] {
    const values: ColumnValue[] = [];
    const parts = valuesStr.split(",").map((s) => s.trim());

    for (const part of parts) {
      values.push(this.parseValue(part));
    }

    return values;
  }

  /**
   * Parse a single value (string, number, boolean, null)
   */
  private parseValue(valueStr: string): ColumnValue {
    valueStr = valueStr.trim();

    // null
    if (valueStr.toLowerCase() === "null") {
      return null;
    }

    // String (quoted)
    if (valueStr.startsWith("'") && valueStr.endsWith("'")) {
      return valueStr.slice(1, -1);
    }

    // Boolean
    if (valueStr.toLowerCase() === "true") {
      return true;
    }
    if (valueStr.toLowerCase() === "false") {
      return false;
    }

    // Number
    const num = Number(valueStr);
    if (!isNaN(num)) {
      return num;
    }

    throw new ValidationError(`Cannot parse value: ${valueStr}`);
  }
}
