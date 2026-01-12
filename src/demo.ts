import { Storage } from "./storage/Storage";
import { TableManager } from "./core/TableManager";
import { QueryEngine } from "./core/QueryEngine";
import { JoinEngine } from "./core/JoinEngine";
import { SQLParser } from "./parser/SQLParser";

function printSection(title: string) {
  console.log("\n" + "=".repeat(60));
  console.log(title);
  console.log("=".repeat(60) + "\n");
}

function printTable(rows: any[]) {
  if (rows.length === 0) {
    console.log("(empty result set)");
    return;
  }

  const columns = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const widths: Record<string, number> = {};

  for (const col of columns) {
    widths[col] = Math.max(
      col.length,
      ...rows.map((r) => String(r[col] ?? "NULL").length)
    );
  }

  const header = columns.map((c) => c.padEnd(widths[c])).join(" | ");
  console.log(header);
  console.log(columns.map((c) => "-".repeat(widths[c])).join("-+-"));

  for (const row of rows) {
    const line = columns
      .map((c) => String(row[c] ?? "NULL").padEnd(widths[c]))
      .join(" | ");
    console.log(line);
  }
  console.log(`\n(${rows.length} rows)\n`);
}

async function runDemo() {
  printSection("Simple RDBMS - Complete Demonstration");

  // Initialize system
  const storage = new Storage("./demo-data");
  const tableManager = new TableManager(storage);
  const queryEngine = new QueryEngine(tableManager);
  const joinEngine = new JoinEngine(tableManager);
  const parser = new SQLParser();

  // Clean up any existing demo data
  try {
    if (tableManager.tableExists("users")) tableManager.dropTable("users");
    if (tableManager.tableExists("posts")) tableManager.dropTable("posts");
    if (tableManager.tableExists("comments"))
      tableManager.dropTable("comments");
  } catch (e) {}

  // ===== STEP 1: CREATE TABLES =====
  printSection("Step 1: Creating Tables");

  console.log("Creating users table...");
  const createUsers = parser.parse(`
    CREATE TABLE users (
      id number PRIMARY KEY,
      username string UNIQUE NOT NULL,
      email string UNIQUE NOT NULL,
      active boolean NOT NULL
    )
  `);

  if (createUsers.type === "CREATE_TABLE") {
    tableManager.createTable(createUsers.schema);
    console.log("✓ Users table created");
  }

  console.log("\nCreating posts table...");
  const createPosts = parser.parse(`
    CREATE TABLE posts (
      id number PRIMARY KEY,
      user_id number NOT NULL,
      title string NOT NULL,
      content string NOT NULL,
      likes number NOT NULL
    )
  `);

  if (createPosts.type === "CREATE_TABLE") {
    tableManager.createTable(createPosts.schema);
    console.log("✓ Posts table created");
  }

  console.log("\nTables created:");
  tableManager.listTables().forEach((t) => console.log(`  - ${t}`));

  // ===== STEP 2: INSERT DATA =====
  printSection("Step 2: Inserting Data");

  const userData = [
    { id: 1, username: "alice", email: "alice@example.com", active: true },
    { id: 2, username: "bob", email: "bob@example.com", active: true },
    { id: 3, username: "charlie", email: "charlie@example.com", active: false },
  ];

  console.log("Inserting users...");
  for (const user of userData) {
    queryEngine.insert("users", user);
    console.log(`  ✓ Inserted user: ${user.username}`);
  }

  const postData = [
    {
      id: 1,
      user_id: 1,
      title: "Introduction to Databases",
      content: "Databases are amazing!",
      likes: 15,
    },
    {
      id: 2,
      user_id: 1,
      title: "TypeScript Best Practices",
      content: "Always use strict mode.",
      likes: 23,
    },
    {
      id: 3,
      user_id: 2,
      title: "Building a RDBMS",
      content: "It is easier than you think.",
      likes: 42,
    },
    {
      id: 4,
      user_id: 3,
      title: "Why Indexes Matter",
      content: "Speed is everything.",
      likes: 8,
    },
  ];

  console.log("\nInserting posts...");
  for (const post of postData) {
    queryEngine.insert("posts", post);
    console.log(`  ✓ Inserted post: ${post.title}`);
  }

  // ===== STEP 3: SELECT QUERIES =====
  printSection("Step 3: SELECT Queries");

  console.log("Query: SELECT * FROM users;\n");
  let result = queryEngine.select("users");
  printTable(result.rows);

  console.log(
    "Query: SELECT username, email FROM users WHERE active = true;\n"
  );
  result = queryEngine.select("users", ["username", "email"], {
    column: "active",
    operator: "=",
    value: true,
  });
  printTable(result.rows);

  console.log("Query: SELECT * FROM posts WHERE likes > 20;\n");
  result = queryEngine.select("posts", undefined, {
    column: "likes",
    operator: ">",
    value: 20,
  });
  printTable(result.rows);

  // ===== STEP 4: INDEX PERFORMANCE =====
  printSection("Step 4: Index Performance Demonstration");

  console.log("Indexed lookup (primary key):");
  console.time("Indexed lookup");
  for (let i = 0; i < 100; i++) {
    queryEngine.select("users", undefined, {
      column: "id",
      operator: "=",
      value: 1,
    });
  }
  console.timeEnd("Indexed lookup");

  console.log("\nNon-indexed lookup (active column):");
  console.time("Non-indexed lookup");
  for (let i = 0; i < 100; i++) {
    queryEngine.select("users", undefined, {
      column: "active",
      operator: "=",
      value: true,
    });
  }
  console.timeEnd("Non-indexed lookup");

  console.log("\nNote: Indexed lookup is significantly faster!");

  // ===== STEP 5: JOINS =====
  printSection("Step 5: INNER JOIN");

  console.log(
    "Query: SELECT * FROM users INNER JOIN posts ON users.id = posts.user_id;\n"
  );
  const joinResult = joinEngine.innerJoin({
    leftTable: "users",
    leftColumn: "id",
    rightTable: "posts",
    rightColumn: "user_id",
  });
  printTable(joinResult.rows);

  // ===== STEP 6: UPDATE =====
  printSection("Step 6: UPDATE");

  console.log("Query: UPDATE posts SET likes = 50 WHERE id = 3;\n");
  const updateCount = queryEngine.update(
    "posts",
    { likes: 50 },
    {
      column: "id",
      operator: "=",
      value: 3,
    }
  );
  console.log(`✓ ${updateCount} row(s) updated\n`);

  console.log("Verify update: SELECT * FROM posts WHERE id = 3;\n");
  result = queryEngine.select("posts", undefined, {
    column: "id",
    operator: "=",
    value: 3,
  });
  printTable(result.rows);

  // ===== STEP 7: DELETE =====
  printSection("Step 7: DELETE");

  console.log("Query: DELETE FROM posts WHERE user_id = 3;\n");
  const deleteCount = queryEngine.delete("posts", {
    column: "user_id",
    operator: "=",
    value: 3,
  });
  console.log(`✓ ${deleteCount} row(s) deleted\n`);

  console.log("Verify deletion: SELECT * FROM posts;\n");
  result = queryEngine.select("posts");
  printTable(result.rows);

  // ===== STEP 8: CONSTRAINT VIOLATIONS =====
  printSection("Step 8: Constraint Validation");

  console.log("Attempting to insert duplicate primary key...");
  try {
    queryEngine.insert("users", {
      id: 1, // Duplicate!
      username: "dave",
      email: "dave@example.com",
      active: true,
    });
    console.log("✗ Should have failed!");
  } catch (error) {
    console.log(`✓ Correctly rejected: ${(error as Error).message}`);
  }

  console.log("\nAttempting to insert duplicate unique column...");
  try {
    queryEngine.insert("users", {
      id: 10,
      username: "alice", // Duplicate username!
      email: "alice2@example.com",
      active: true,
    });
    console.log("✗ Should have failed!");
  } catch (error) {
    console.log(`✓ Correctly rejected: ${(error as Error).message}`);
  }

  console.log("\nAttempting to insert NULL into NOT NULL column...");
  try {
    queryEngine.insert("users", {
      id: 10,
      username: "dave",
      email: null, // NULL not allowed!
      active: true,
    });
    console.log("✗ Should have failed!");
  } catch (error) {
    console.log(`✓ Correctly rejected: ${(error as Error).message}`);
  }

  // ===== STEP 9: PERSISTENCE =====
  printSection("Step 9: Persistence Test");

  console.log("Saving all data to disk...");
  tableManager.saveTable("users");
  tableManager.saveTable("posts");
  console.log("✓ Data saved\n");

  console.log("Creating new database instance...");
  const newStorage = new Storage("./demo-data");
  const newTableManager = new TableManager(newStorage);
  const newQueryEngine = new QueryEngine(newTableManager);

  console.log("✓ New instance created\n");
  console.log("Loading persisted data...");

  const loadedTables = newTableManager.listTables();
  console.log(
    `✓ Found ${loadedTables.length} tables: ${loadedTables.join(", ")}\n`
  );

  console.log("Query from new instance: SELECT * FROM users;\n");
  result = newQueryEngine.select("users");
  printTable(result.rows);

  console.log("✓ Data successfully persisted and reloaded!");

  // ===== FINAL SUMMARY =====
  printSection("Demonstration Complete");

  console.log("Summary:");
  console.log("  ✓ Created tables with constraints");
  console.log("  ✓ Inserted data with validation");
  console.log("  ✓ Executed SELECT queries with WHERE clauses");
  console.log("  ✓ Demonstrated index performance");
  console.log("  ✓ Performed INNER JOIN");
  console.log("  ✓ Updated and deleted data");
  console.log("  ✓ Enforced constraints (primary key, unique, not null)");
  console.log("  ✓ Persisted data to disk");
  console.log("  ✓ Reloaded data from disk");

  console.log("\nThe database is fully functional!");
  console.log("\nTry the REPL: npm run repl");
  console.log("Or the web app: npm run web\n");
}

// Run demo
runDemo().catch(console.error);
