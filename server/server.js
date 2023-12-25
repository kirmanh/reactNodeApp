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

app.post("/register", async (req, res) => {
  const { userName, userEmail, userPassword } = req.body;

  const hashedPassword = await bcrypt.hash(userPassword, 10);

  const client = await pool.connect();
  try {
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
  const { userEmail, userPassword } = req.body;

  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, password FROM usersdata WHERE email = $1",
      [userEmail]
    );

    console.log("User Email:", userEmail);
    console.log("User Password:", userPassword);

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
    const token = jwt.sign({ userId: result.rows[0].id }, "your-secret-key", {
      expiresIn: "300s",
    });

    res.json({ success: true, token });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  } finally {
    client.release();
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
