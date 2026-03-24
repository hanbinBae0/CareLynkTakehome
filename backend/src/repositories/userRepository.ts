import { Queryable, pool } from "../db/pool";
import { AuthUser, UserRole } from "../types/domain";

interface UserRow {
  id: string;
  role: UserRole;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string;
}

function mapUser(row: Omit<UserRow, "password_hash">): AuthUser {
  return {
    id: row.id,
    role: row.role,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
  };
}

export function mapUserWithPassword(row: UserRow) {
  return {
    user: mapUser(row),
    passwordHash: row.password_hash,
  };
}

export async function findUserRowByEmail(email: string, db: Queryable = pool): Promise<UserRow | null> {
  const result = await db.query<UserRow>(
    `
      SELECT id, role, email, password_hash, first_name, last_name, phone
      FROM users
      WHERE LOWER(email) = LOWER($1)
    `,
    [email],
  );

  return result.rows[0] ?? null;
}

export async function findUserById(id: string, db: Queryable = pool): Promise<AuthUser | null> {
  const result = await db.query<Omit<UserRow, "password_hash">>(
    `
      SELECT id, role, email, first_name, last_name, phone
      FROM users
      WHERE id = $1
    `,
    [id],
  );

  const row = result.rows[0];
  return row ? mapUser(row) : null;
}

export async function createUser(
  input: {
    role: UserRole;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone: string;
  },
  db: Queryable = pool,
): Promise<AuthUser> {
  const result = await db.query<Omit<UserRow, "password_hash">>(
    `
      INSERT INTO users (role, email, password_hash, first_name, last_name, phone)
      VALUES ($1, LOWER($2), $3, $4, $5, $6)
      RETURNING id, role, email, first_name, last_name, phone
    `,
    [input.role, input.email, input.passwordHash, input.firstName, input.lastName, input.phone],
  );

  return mapUser(result.rows[0]);
}

export async function createEmptyRoleProfile(userId: string, role: UserRole, db: Queryable = pool): Promise<void> {
  if (role === "caregiver") {
    await db.query(
      `
        INSERT INTO caregiver_profiles (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `,
      [userId],
    );
    return;
  }

  await db.query(
    `
      INSERT INTO care_seeker_profiles (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `,
    [userId],
  );
}

export async function updateUserBasics(
  userId: string,
  input: { firstName: string; lastName: string; phone: string },
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `
      UPDATE users
      SET first_name = $2,
          last_name = $3,
          phone = $4,
          updated_at = NOW()
      WHERE id = $1
    `,
    [userId, input.firstName, input.lastName, input.phone],
  );
}
