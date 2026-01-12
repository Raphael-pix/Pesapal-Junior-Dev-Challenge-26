import express, { Request, Response } from "express";
import { Storage } from "../storage/Storage";
import { TableManager } from "../core/TableManager";
import { QueryEngine } from "../core/QueryEngine";
import { DatabaseError, Row } from "../types";

const app = express();
app.use(express.json());
app.use(express.static("public"));

// Initialize database
const storage = new Storage("./data");
const tableManager = new TableManager(storage);
const queryEngine = new QueryEngine(tableManager);

// Initialize schema if tables don't exist
function initializeSchema() {
  try {
    if (!tableManager.tableExists("users")) {
      tableManager.createTable({
        name: "users",
        columns: [
          { name: "id", type: "number", primaryKey: true, notNull: true },
          { name: "username", type: "string", unique: true, notNull: true },
          { name: "email", type: "string", unique: true, notNull: true },
          { name: "created_at", type: "number", notNull: true },
        ],
      });
      console.log("Created users table");
    }

    if (!tableManager.tableExists("posts")) {
      tableManager.createTable({
        name: "posts",
        columns: [
          { name: "id", type: "number", primaryKey: true, notNull: true },
          { name: "user_id", type: "number", notNull: true },
          { name: "title", type: "string", notNull: true },
          { name: "content", type: "string", notNull: true },
          { name: "created_at", type: "number", notNull: true },
        ],
      });
      console.log("Created posts table");
    }
  } catch (error) {
    if (error instanceof DatabaseError) {
      console.log("Tables already exist");
    }
  }
}

initializeSchema();

// ===== USER ENDPOINTS =====

// Get all users
app.get("/api/users", (req: Request, res: Response) => {
  try {
    const result = queryEngine.select("users");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get user by ID
app.get("/api/users/:id", (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = queryEngine.select("users", undefined, {
      column: "id",
      operator: "=",
      value: id,
    });

    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create user
app.post("/api/users", (req: Request, res: Response) => {
  try {
    const { username, email } = req.body;

    if (!username || !email) {
      res.status(400).json({ error: "Username and email are required" });
      return;
    }

    // Generate ID
    const users = queryEngine.select("users");
    const id =
      users.rows.length > 0
        ? Math.max(...users.rows.map((u) => u.id as number)) + 1
        : 1;

    const user: Row = {
      id,
      username,
      email,
      created_at: Date.now(),
    };

    queryEngine.insert("users", user);
    res.status(201).json(user);
  } catch (error) {
    if (error instanceof DatabaseError) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: (error as Error).message });
    }
  }
});

// Update user
app.put("/api/users/:id", (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { username, email } = req.body;

    const updates: Partial<Row> = {};
    if (username !== undefined) updates.username = username;
    if (email !== undefined) updates.email = email;

    const count = queryEngine.update("users", updates, {
      column: "id",
      operator: "=",
      value: id,
    });

    if (count === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ message: "User updated" });
  } catch (error) {
    if (error instanceof DatabaseError) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: (error as Error).message });
    }
  }
});

// Delete user
app.delete("/api/users/:id", (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const count = queryEngine.delete("users", {
      column: "id",
      operator: "=",
      value: id,
    });

    if (count === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Also delete user's posts
    queryEngine.delete("posts", {
      column: "user_id",
      operator: "=",
      value: id,
    });

    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ===== POST ENDPOINTS =====

// Get all posts
app.get("/api/posts", (req: Request, res: Response) => {
  try {
    const result = queryEngine.select("posts");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get posts by user
app.get("/api/users/:id/posts", (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const result = queryEngine.select("posts", undefined, {
      column: "user_id",
      operator: "=",
      value: userId,
    });
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create post
app.post("/api/posts", (req: Request, res: Response) => {
  try {
    const { user_id, title, content } = req.body;

    if (!user_id || !title || !content) {
      res
        .status(400)
        .json({ error: "user_id, title, and content are required" });
      return;
    }

    // Verify user exists
    const userResult = queryEngine.select("users", undefined, {
      column: "id",
      operator: "=",
      value: user_id,
    });

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Generate ID
    const posts = queryEngine.select("posts");
    const id =
      posts.rows.length > 0
        ? Math.max(...posts.rows.map((p) => p.id as number)) + 1
        : 1;

    const post: Row = {
      id,
      user_id,
      title,
      content,
      created_at: Date.now(),
    };

    queryEngine.insert("posts", post);
    res.status(201).json(post);
  } catch (error) {
    if (error instanceof DatabaseError) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: (error as Error).message });
    }
  }
});

// Delete post
app.delete("/api/posts/:id", (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const count = queryEngine.delete("posts", {
      column: "id",
      operator: "=",
      value: id,
    });

    if (count === 0) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    res.json({ message: "Post deleted" });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("API endpoints:");
  console.log("  GET    /api/users");
  console.log("  GET    /api/users/:id");
  console.log("  POST   /api/users");
  console.log("  PUT    /api/users/:id");
  console.log("  DELETE /api/users/:id");
  console.log("  GET    /api/posts");
  console.log("  GET    /api/users/:id/posts");
  console.log("  POST   /api/posts");
  console.log("  DELETE /api/posts/:id");
});

export default app;
