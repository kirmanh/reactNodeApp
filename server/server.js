// server.mjs
import express from "express";
import cors from "cors";
import pkg from "pg";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const { Pool } = pkg;

const app = express();
const port = 4000;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "myappdb",
  password: "postgres",
  port: 5432,
});

app.use(express.json());
app.use(cors());

// app.post("/register", async (req, res) => {
//   const { userName, userEmail, userPassword } = req.body;

//   const client = await pool.connect();
//   try {
//     await client.query("BEGIN");

//     const result = await client.query(
//       "INSERT INTO usersdata (username, email, password) VALUES ($1, $2, $3) RETURNING id",
//       [userName, userEmail, userPassword]
//     );
//     console.log(userName, userEmail, userPassword);

//     await client.query("COMMIT");

//     res.json({ success: true, userId: result.rows[0].id });
//   } catch (error) {
//     await client.query("ROLLBACK");
//     console.error("Error during registration:", error);
//     res.status(500).json({ success: false, error: "Internal Server Error" });
//   } finally {
//     client.release();
//   }
// });

// app.post("/register", async (req, res) => {
//   const { userName, userEmail, userPassword } = req.body;

//   const hashedPassword = await bcrypt.hash(userPassword, 10);

//   const client = await pool.connect();
//   try {
//     await client.query("BEGIN");

//     const result = await client.query(
//       "INSERT INTO usersdata (username, email, password) VALUES ($1, $2, $3) RETURNING id",
//       [userName, userEmail, hashedPassword]
//     );

//     await client.query("COMMIT");

//     res.json({ success: true, userId: result.rows[0].id });
//   } catch (error) {
//     await client.query("ROLLBACK");
//     console.error("Error during registration:", error);
//     res.status(500).json({ success: false, error: "Internal Server Error" });
//   } finally {
//     client.release();
//   }
// });

app.post("/register", async (req, res) => {
  const { userName, userEmail, userPassword } = req.body;

  // Check if the username or email already exists
  const client = await pool.connect();
  try {
    const existingUser = await client.query(
      "SELECT * FROM usersdata WHERE username = $1 OR email = $2",
      [userName, userEmail]
    );

    if (existingUser.rows.length > 0) {
      // User with the provided username or email already exists
      return res
        .status(400)
        .json({ success: false, error: "Username or email already exists" });
    }

    // If username and email are unique, proceed with registration
    const hashedPassword = await bcrypt.hash(userPassword, 10);

    await client.query("BEGIN");

    const result = await client.query(
      "INSERT INTO usersdata (username, email, password) VALUES ($1, $2, $3) RETURNING id",
      [userName, userEmail, hashedPassword]
    );

    await client.query("COMMIT");

    res.json({ success: true, userId: result.rows[0].id });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error during registration:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  } finally {
    client.release();
  }
});

app.post("/login", async (req, res) => {
  const { userName, userPassword } = req.body;

  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, password FROM usersdata WHERE username = $1",
      [userName]
    );

    // console.log("User Email:", userEmail);
    // console.log("User Password:", hashedPassword);

    if (result.rows.length === 0) {
      // User not found
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    const storedPassword = result.rows[0].password;
    const isPasswordValid = await bcrypt.compare(userPassword, storedPassword);

    if (!isPasswordValid) {
      // Incorrect password
      return res
        .status(401)
        .json({ success: false, error: "Invalid Password" });
    }

    // Generate a JWT token
    const token = jwt.sign({ userId: result.rows[0].id }, "secret-key", {
      expiresIn: "300s",
    });
    res.json({ success: true, token, userName });
    console.log(token, userName);
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  } finally {
    client.release();
  }
});

app.post("/api/articles", (req, res) => {
  const { title, content, userId } = req.body;

  pool
    .query(
      "INSERT INTO usersarticles (title, content, user_id) VALUES ($1, $2, $3) RETURNING *",
      [title, content, userId]
    )
    .then((result) => res.json(result.rows[0]))
    .catch((err) => res.status(400).json("Error creating article"));
});

app.put("/api/articles/:articleId", (req, res) => {
  const { title, content } = req.body;
  const { articleId } = req.params;

  db("usersarticles")
    .where({ article_id: articleId })
    .update({ title, content })
    .returning("*")
    .then((article) => res.json(article[0]))
    .catch((err) => res.status(400).json("Error updating article"));
});

app.delete("/api/articles/:articleId", (req, res) => {
  const { articleId } = req.params;

  db("usersarticles")
    .where({ article_id: articleId })
    .del()
    .then(() => res.json("Article deleted successfully"))
    .catch((err) => res.status(400).json("Error deleting article"));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
