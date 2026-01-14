# Simple RDBMS in TypeScript

A minimal relational database management system implemented from scratch in TypeScript. This project demonstrates core database concepts including storage, indexing, query execution, and SQL parsing.

## Features

- SQL-like query language (CREATE, INSERT, SELECT, UPDATE, DELETE)
- Hash-based indexing for fast lookups
- Primary key and unique constraints
- Persistent storage (JSON files)
- INNER JOIN support
- Interactive REPL
- REST API demo application

## Project Structure

```
/
├── src/
│   ├── types/           # Core type definitions
│   ├── storage/         # Filesystem persistence
│   ├── core/            # Table management, query engine, joins
│   ├── parser/          # SQL parser
│   ├── repl/            # Interactive CLI
│   └── web/             # Demo web application
├── data/                # Database files (auto-created)
├── public/              # Web frontend
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build
```

## Usage

### 1. Interactive REPL

```bash
npm run repl
```

Example session:

```sql
sql> CREATE TABLE users (id number PRIMARY KEY, name string NOT NULL, email string UNIQUE);
Table 'users' created.

sql> INSERT INTO users (id, name, email) VALUES (1, 'Alice', 'alice@example.com');
1 row inserted.

sql> SELECT * FROM users;

id | name  | email
---+-------+------------------
1  | Alice | alice@example.com

1 rows.

sql> UPDATE users SET name = 'Alice Smith' WHERE id = 1;
1 rows updated.

sql> SHOW TABLES;
Tables:
  users

sql> DESCRIBE users;

Table: users
Columns:
  id: number (PRIMARY KEY, NOT NULL)
  name: string (NOT NULL)
  email: string (UNIQUE)

Rows: 1
```

### 2. Web Application

```bash
npm run web
```

Visit `http://localhost:3000` to see the blog demo.

**API Endpoints:**

- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/posts` - List all posts
- `POST /api/posts` - Create post
- `GET /api/users/:id/posts` - Get posts by user
- `DELETE /api/posts/:id` - Delete post

## Supported SQL Syntax

### CREATE TABLE

```sql
CREATE TABLE table_name (
  column_name type [PRIMARY KEY] [UNIQUE] [NOT NULL],
  ...
);
```

**Supported types:** `string`, `number`, `boolean`

**Constraints:**

- `PRIMARY KEY` - Exactly one required per table
- `UNIQUE` - Column values must be unique
- `NOT NULL` - Column cannot be null

### INSERT

```sql
INSERT INTO table_name (col1, col2, ...) VALUES (val1, val2, ...);
```

**Value formats:**

- Strings: `'text'`
- Numbers: `42`, `3.14`
- Booleans: `true`, `false`
- Null: `null`

### SELECT

```sql
SELECT * FROM table_name;
SELECT col1, col2 FROM table_name WHERE column = value;
```

**Supported WHERE operators:** `=`, `!=`, `>`, `<`, `>=`, `<=`

### UPDATE

```sql
UPDATE table_name SET col1 = val1, col2 = val2 WHERE condition;
```

### DELETE

```sql
DELETE FROM table_name WHERE condition;
```

### INNER JOIN

```sql
SELECT * FROM table1 INNER JOIN table2 ON table1.col = table2.col;
```

### UTILITY COMMANDS

```sql
SHOW TABLES;
DESCRIBE table_name;
```

## Architecture & Design Decisions

### Storage Layer

**Implementation:** JSON files, one per table

**Tradeoffs:**

- Simple, human-readable
- No external dependencies
- Not efficient for large datasets
- Entire file rewritten on each change
- No transaction log

**Production Alternative:** Write-ahead logging (WAL), page-based storage, buffer pool management

### Indexing

**Implementation:** Hash indexes (`Map<value, Set<rowId>>`)

**Characteristics:**

- O(1) average-case lookup for equality (`WHERE col = value`)
- Automatically maintained on INSERT/UPDATE/DELETE
- Primary key and unique columns are auto-indexed

**Limitations:**

- Only supports `=` operator
- No range queries (`>`, `<`, `BETWEEN`)
- No ordering (can't optimize `ORDER BY`)

**Production Alternative:** B-tree indexes support range queries and maintain sort order

### Query Execution

**Implementation:** Direct execution, no query planner

**Strategy:**

- Uses indexes when available for `WHERE col = value`
- Falls back to full table scan for other conditions
- No cost-based optimization

**Production Alternative:** Query planner analyzes statistics and chooses optimal execution plan

### Joins

**Implementation:** Nested Loop Join

**Algorithm:**

```
for each row in left_table:
  for each row in right_table:
    if join_condition matches:
      yield combined_row
```

**Complexity:** O(n × m)

**Performance:**

- 100 × 100 rows: ~10ms
- 1,000 × 1,000 rows: ~1 second
- 10,000 × 10,000 rows: ~100 seconds

**Production Alternatives:**

- Hash Join: O(n + m)
- Merge Join: O(n log n + m log m)
- Index Nested Loop: O(n log m)

### Transactions

**Implementation:** None

**Current Behavior:**

- Each SQL statement is atomic
- No support for multi-statement transactions
- No ACID guarantees across statements

**Production Alternative:** MVCC (Multi-Version Concurrency Control), transaction log, two-phase commit

### Constraints

**Implemented:**

- Primary key (unique, not null)
- Unique columns
- Not null

**Not Implemented:**

- Foreign keys
- Check constraints
- Default values
- Auto-increment

## Example: Building a Blog

```sql
-- Create tables
CREATE TABLE users (id number PRIMARY KEY, username string UNIQUE NOT NULL, email string NOT NULL);
CREATE TABLE posts (id number PRIMARY KEY, user_id number NOT NULL, title string NOT NULL, content string NOT NULL);

-- Add data
INSERT INTO users (id, username, email) VALUES (1, 'alice', 'alice@example.com');
INSERT INTO users (id, username, email) VALUES (2, 'bob', 'bob@example.com');
INSERT INTO posts (id, user_id, title, content) VALUES (1, 1, 'Hello World', 'My first post!');
INSERT INTO posts (id, user_id, title, content) VALUES (2, 1, 'TypeScript Tips', 'Use strict mode!');
INSERT INTO posts (id, user_id, title, content) VALUES (3, 2, 'Database Design', 'Normalize your schemas.');

-- Query
SELECT * FROM users;
SELECT * FROM posts WHERE user_id = 1;
SELECT * FROM users INNER JOIN posts ON users.id = posts.user_id;

-- Update
UPDATE posts SET title = 'Hello TypeScript' WHERE id = 1;

-- Delete
DELETE FROM posts WHERE id = 3;
```
