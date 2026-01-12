# File Structure Guide

Complete file-by-file breakdown of the Simple RDBMS project.

## Directory Tree

```
simple-rdbms/
├── src/                          # Source code
│   ├── types/                    # Type definitions
│   │   └── index.ts             # Core types (Column, Table, Row, etc.)
│   │
│   ├── storage/                  # Persistence layer
│   │   └── Storage.ts           # File-based storage (JSON)
│   │
│   ├── core/                     # Core database logic
│   │   ├── TableManager.ts      # CREATE TABLE, schema validation
│   │   ├── QueryEngine.ts       # INSERT, SELECT, UPDATE, DELETE
│   │   ├── JoinEngine.ts        # INNER JOIN implementation
│   │   └── IndexManager.ts      # Hash index management
│   │
│   ├── parser/                   # SQL parsing
│   │   └── SQLParser.ts         # Regex-based SQL parser
│   │
│   ├── repl/                     # Command-line interface
│   │   └── REPL.ts              # Interactive SQL shell
│   │
│   ├── web/                      # Web demo
│   │   └── app.ts               # Express REST API
│   │
│   ├── index.ts                 # Main entry point / public API
│   └── demo.ts                  # Comprehensive demo script
│
├── public/                       # Web frontend
│   └── index.html               # Blog demo UI
│
├── data/                         # Database files (auto-created)
│   ├── users.json               # Example table file
│   └── posts.json               # Example table file
│
├── package.json                  # NPM config & scripts
├── tsconfig.json                 # TypeScript config
├── README.md                     # Full documentation
├── QUICKSTART.md                 # 5-minute getting started
├── IMPLEMENTATION_SUMMARY.md     # Technical overview
└── FILE_STRUCTURE.md            # This file
```

## File-by-File Description

### Core Type System

**`src/types/index.ts`** (150 lines)

- Defines all TypeScript interfaces and types
- `ColumnType`: string | number | boolean
- `ColumnDefinition`: Schema for a column
- `TableSchema`: Schema for a table
- `Row`: Data structure for a row
- `HashIndex`: Index data structure
- `WhereCondition`: Filter condition
- Error classes: `DatabaseError`, `ValidationError`, `ConstraintError`

**Key exports:**

```typescript
export type ColumnType = "string" | "number" | "boolean";
export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
}
export type Row = Record<string, ColumnValue>;
```

---

### Storage Layer

**`src/storage/Storage.ts`** (150 lines)

- Handles reading/writing tables to disk
- One JSON file per table in `data/` directory
- Serializes/deserializes Map and Set structures

**Key methods:**

```typescript
saveTable(table: Table): void           // Write to disk
loadTable(tableName: string): Table     // Read from disk
tableExists(tableName: string): boolean // Check existence
listTables(): string[]                  // List all tables
```

**File format:** JSON with structure:

```json
{
  "schema": { "name": "users", "columns": [...] },
  "rows": [...],
  "indexes": { "id": [[1, [0]], [2, [1]]] },
  "nextRowId": 3
}
```

---

### Core Database Components

**`src/core/TableManager.ts`** (200 lines)

- Manages table lifecycle (create, get, drop)
- Validates schemas
- Initializes indexes
- Maintains in-memory cache of tables

**Key methods:**

```typescript
createTable(schema: TableSchema): void  // CREATE TABLE
getTable(tableName: string): Table      // Get table or throw
dropTable(tableName: string): void      // Drop table
validateSchema(schema: TableSchema)     // Validate schema rules
```

**Validation rules:**

- Exactly one primary key
- Unique column names
- Primary key cannot be null

---

**`src/core/QueryEngine.ts`** (350 lines)

- Executes CRUD operations
- Enforces constraints
- Maintains indexes
- Uses indexes for optimization

**Key methods:**

```typescript
insert(tableName: string, row: Row): void
select(tableName: string, columns?: string[], where?: WhereCondition): QueryResult
update(tableName: string, updates: Partial<Row>, where?: WhereCondition): number
delete(tableName: string, where?: WhereCondition): number
```

**Optimization:**

- Uses hash index for `WHERE col = value` → O(1)
- Falls back to table scan for other operators → O(n)

---

**`src/core/JoinEngine.ts`** (120 lines)

- Implements INNER JOIN
- Uses nested loop algorithm
- Prefixes columns with table names to avoid conflicts

**Key method:**

```typescript
innerJoin(condition: JoinCondition): QueryResult
```

**Algorithm:**

```typescript
for (const leftRow of leftTable) {
  for (const rightRow of rightTable) {
    if (leftRow[leftCol] === rightRow[rightCol]) {
      yield combine(leftRow, rightRow);
    }
  }
}
```

---

**`src/core/IndexManager.ts`** (150 lines)

- Manages hash indexes
- Provides O(1) average-case lookups
- Includes performance demonstration

**Key methods:**

```typescript
createHashIndex(): HashIndex
insertIntoIndex(index, value, rowId): void
removeFromIndex(index, value, rowId): void
lookup(index, value): Set<number>
```

**Data structure:**

```typescript
Map<ColumnValue, Set<RowID>>;
// Example: { 'alice': Set(0), 'bob': Set(1), ... }
```

---

### SQL Parser

**`src/parser/SQLParser.ts`** (400 lines)

- Parses SQL-like text into structured commands
- Regex-based pattern matching
- Supports: CREATE TABLE, INSERT, SELECT, UPDATE, DELETE, JOIN, SHOW TABLES, DESCRIBE

**Key method:**

```typescript
parse(sql: string): ParsedStatement
```

**Example:**

```typescript
parse("SELECT name FROM users WHERE id = 1")
// Returns:
{
  type: 'SELECT',
  tableName: 'users',
  columns: ['name'],
  where: { column: 'id', operator: '=', value: 1 }
}
```

---

### User Interfaces

**`src/repl/REPL.ts`** (250 lines)

- Interactive command-line interface
- Uses Node.js `readline` module
- Formats results as ASCII tables
- Built-in help system

**Key features:**

- Prompt: `sql> `
- Commands: SQL statements, `help`, `exit`
- Output: Formatted tables with borders

---

**`src/web/app.ts`** (300 lines)

- Express.js REST API
- Manages users and posts (blog demo)
- JSON responses
- Serves static frontend

**Endpoints:**

```
GET    /api/users          List users
POST   /api/users          Create user
GET    /api/users/:id      Get user
PUT    /api/users/:id      Update user
DELETE /api/users/:id      Delete user
GET    /api/posts          List posts
POST   /api/posts          Create post
DELETE /api/posts/:id      Delete post
```

---

**`public/index.html`** (250 lines)

- Single-page web application
- Vanilla JavaScript (no frameworks)
- Split view: users on left, posts on right
- Real-time updates via fetch API

---

### Entry Points

**`src/index.ts`** (100 lines)

- Main library entry point
- Exports all public APIs
- Includes `createDatabase()` convenience function

**Usage:**

```typescript
import { createDatabase } from "./index";
const db = createDatabase("./mydata");
db.execute("CREATE TABLE ...");
```

---

**`src/demo.ts`** (300 lines)

- Comprehensive demonstration script
- Shows all features working together
- Creates sample data
- Tests constraints and persistence

**Run:** `npm run demo`

---

### Configuration Files

**`package.json`**

- NPM package configuration
- Dependencies: express, @types packages
- Scripts: build, repl, web, demo, clean
- Dev dependencies: typescript, ts-node

**`tsconfig.json`**

- TypeScript compiler configuration
- Target: ES2020
- Strict mode enabled
- Output: `./dist`

---

## File Dependencies

```
┌─────────────┐
│  demo.ts    │─────┐
│  repl.ts    │─────┤
│  app.ts     │─────┤
└─────────────┘     │
                    ↓
┌─────────────────────────┐
│  SQLParser.ts          │
└─────────────────────────┘
         │
         ↓
┌─────────────────────────┐
│  QueryEngine.ts        │
│  JoinEngine.ts         │
└─────────────────────────┘
         │
         ↓
┌─────────────────────────┐
│  TableManager.ts       │
│  IndexManager.ts       │
└─────────────────────────┘
         │
         ↓
┌─────────────────────────┐
│  Storage.ts            │
└─────────────────────────┘
         │
         ↓
┌─────────────────────────┐
│  types/index.ts        │
└─────────────────────────┘
```

## Lines of Code by Component

| Component    | Lines      | Percentage |
| ------------ | ---------- | ---------- |
| QueryEngine  | 350        | 12%        |
| SQLParser    | 400        | 14%        |
| Demo         | 300        | 10%        |
| Web App      | 300        | 10%        |
| REPL         | 250        | 9%         |
| HTML         | 250        | 9%         |
| TableManager | 200        | 7%         |
| Types        | 150        | 5%         |
| Storage      | 150        | 5%         |
| IndexManager | 150        | 5%         |
| JoinEngine   | 120        | 4%         |
| Other        | 280        | 10%        |
| **Total**    | **~2,900** | **100%**   |

## Reading Order for Learning

1. **Start here:** `types/index.ts` - Understand data structures
2. **Then:** `storage/Storage.ts` - See how data persists
3. **Next:** `core/TableManager.ts` - Learn table management
4. **Then:** `core/IndexManager.ts` - Understand indexes
5. **Next:** `core/QueryEngine.ts` - Study query execution
6. **Then:** `core/JoinEngine.ts` - See joins work
7. **Next:** `parser/SQLParser.ts` - Learn SQL parsing
8. **Finally:** `demo.ts` - See it all work together

## Quick Access: Where to Find...

- **Type definitions?** → `src/types/index.ts`
- **How indexes work?** → `src/core/IndexManager.ts`
- **How queries execute?** → `src/core/QueryEngine.ts`
- **How SQL is parsed?** → `src/parser/SQLParser.ts`
- **How data persists?** → `src/storage/Storage.ts`
- **How to use the library?** → `src/index.ts`
- **Example queries?** → `src/demo.ts`
- **REST API?** → `src/web/app.ts`
- **CLI interface?** → `src/repl/REPL.ts`

---

**Need to find something?** Use your editor's search (Ctrl+Shift+F) to search across all files.
