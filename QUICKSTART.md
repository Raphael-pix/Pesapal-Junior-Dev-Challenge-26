# Quick Start Guide

Get up and running with the Simple RDBMS in 5 minutes.

## Installation

```bash
# Clone or create project directory
mkdir simple-rdbms
cd simple-rdbms

# Install dependencies
npm install

# You're ready!
```

## Three Ways to Use It

### 1. Run the Demo (Recommended First Step)

See everything in action:

```bash
npm run demo
```

This will:

- Create sample tables (users, posts)
- Insert test data
- Run various queries (SELECT, JOIN, UPDATE, DELETE)
- Test constraint enforcement
- Demonstrate persistence

**Expected output:** ~60 lines showing all features working

### 2. Interactive REPL

SQL command-line interface:

```bash
npm run repl
```

Try these commands:

```sql
-- Create a table
CREATE TABLE products (
  id number PRIMARY KEY,
  name string NOT NULL,
  price number NOT NULL,
  in_stock boolean NOT NULL
);

-- Insert data
INSERT INTO products (id, name, price, in_stock) VALUES (1, 'Laptop', 999.99, true);
INSERT INTO products (id, name, price, in_stock) VALUES (2, 'Mouse', 29.99, true);
INSERT INTO products (id, name, price, in_stock) VALUES (3, 'Keyboard', 79.99, false);

-- Query
SELECT * FROM products;
SELECT name, price FROM products WHERE in_stock = true;
SELECT * FROM products WHERE price < 100;

-- Update
UPDATE products SET price = 899.99 WHERE id = 1;
UPDATE products SET in_stock = true WHERE id = 3;

-- Show schema
DESCRIBE products;

-- Exit
exit
```

### 3. Web Application

Full-featured blog demo with UI:

```bash
npm run web
```

Then open http://localhost:3000

**Features:**

- Create and manage users
- Write and publish posts
- RESTful API endpoints
- Real-time updates

## Common Tasks

### Clear All Data

```bash
npm run clean
```

### Build TypeScript

```bash
npm run build
```

### View Database Files

Database files are stored as JSON in `./data/`:

```bash
ls data/
cat data/users.json
```

## Example: Building a TODO App

Here's a complete example:

```sql
-- Create table
CREATE TABLE todos (
  id number PRIMARY KEY,
  task string NOT NULL,
  completed boolean NOT NULL,
  priority number NOT NULL
);

-- Add tasks
INSERT INTO todos (id, task, completed, priority) VALUES (1, 'Buy groceries', false, 2);
INSERT INTO todos (id, task, completed, priority) VALUES (2, 'Write documentation', false, 1);
INSERT INTO todos (id, task, completed, priority) VALUES (3, 'Deploy to production', false, 1);

-- View all todos
SELECT * FROM todos;

-- View high priority incomplete tasks
SELECT task FROM todos WHERE priority = 1 AND completed = false;

-- Complete a task
UPDATE todos SET completed = true WHERE id = 1;

-- Delete completed tasks
DELETE FROM todos WHERE completed = true;
```

## Troubleshooting

**Problem:** `Cannot find module 'express'`
**Solution:** Run `npm install`

**Problem:** Port 3000 already in use (web app)
**Solution:** Set custom port: `PORT=3001 npm run web`

**Problem:** Data corruption after crash
**Solution:** Run `npm run clean` and recreate your data

**Problem:** "Table already exists" error
**Solution:** Either drop the table first or use a different name

## Next Steps

1. Read the full [README.md](README.md) for architecture details
2. Explore the [src/](src/) directory to understand the implementation
3. Try building your own features (see README "Next Steps" section)
4. Experiment with breaking things to understand constraints

## Learning Path

**Beginner:**

1. Run the demo
2. Play with REPL for 10 minutes
3. Try the web app

**Intermediate:**

1. Read through `src/types/index.ts`
2. Understand `src/core/QueryEngine.ts`
3. Study how indexes work in `src/core/IndexManager.ts`

**Advanced:**

1. Implement a new SQL command (e.g., ORDER BY)
2. Add a new data type (e.g., date)
3. Implement a new join algorithm (e.g., hash join)
4. Add transaction support

## Resources

- **Code:** All in `src/` directory
- **Data:** Stored in `data/` directory as JSON
- **Docs:** [README.md](README.md) has full documentation
- **Examples:** `src/demo.ts` shows comprehensive usage

---

**Questions?** Read the code - it's well-commented and designed to be educational!
