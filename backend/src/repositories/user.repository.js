import pool from "../config/database.js";

export async function findUserByEmail(email) {
  const result = await pool.query(
    `
    SELECT id, name, email, password_hash, role, status, created_at
    FROM users
    WHERE email = $1
    LIMIT 1
    `,
    [email]
  );

  return result.rows[0];
}

export async function findUserById(id) {
  const result = await pool.query(
    `
    SELECT id, name, email, role, status, created_at, last_login
    FROM users
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );

  return result.rows[0];
}

export async function updateLastLogin(id) {
  await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [id]);
}

export async function createUser(name, email, passwordHash) {
  const result = await pool.query(
    `
    INSERT INTO users (
      name,
      email,
      password_hash
    )
    VALUES ($1, $2, $3)

    RETURNING
      id,
      name,
      email,
      role,
      created_at
    `,
    [name, email, passwordHash]
  );

  return result.rows[0];
}