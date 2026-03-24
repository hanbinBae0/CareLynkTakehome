import { Queryable, pool } from "../db/pool";
import { CareSeekerProfile } from "../types/domain";

interface CareSeekerRow {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  preferred_contact_method: string;
  care_recipient_name: string;
  relationship_to_recipient: string;
  city: string;
  state: string;
  zip_code: string;
  notes: string;
}

function mapCareSeeker(row: CareSeekerRow): CareSeekerProfile {
  return {
    userId: row.user_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    preferredContactMethod: row.preferred_contact_method,
    careRecipientName: row.care_recipient_name,
    relationshipToRecipient: row.relationship_to_recipient,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    notes: row.notes,
  };
}

export async function findByUserId(userId: string, db: Queryable = pool): Promise<CareSeekerProfile | null> {
  const result = await db.query<CareSeekerRow>(
    `
      SELECT
        u.id AS user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        csp.preferred_contact_method,
        csp.care_recipient_name,
        csp.relationship_to_recipient,
        csp.city,
        csp.state,
        csp.zip_code,
        csp.notes
      FROM users u
      JOIN care_seeker_profiles csp ON csp.user_id = u.id
      WHERE u.id = $1
    `,
    [userId],
  );

  const row = result.rows[0];
  return row ? mapCareSeeker(row) : null;
}

export async function upsertProfile(
  userId: string,
  input: {
    preferredContactMethod: string;
    careRecipientName: string;
    relationshipToRecipient: string;
    city: string;
    state: string;
    zipCode: string;
    notes: string;
  },
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `
      INSERT INTO care_seeker_profiles (
        user_id,
        preferred_contact_method,
        care_recipient_name,
        relationship_to_recipient,
        city,
        state,
        zip_code,
        notes,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        preferred_contact_method = EXCLUDED.preferred_contact_method,
        care_recipient_name = EXCLUDED.care_recipient_name,
        relationship_to_recipient = EXCLUDED.relationship_to_recipient,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        zip_code = EXCLUDED.zip_code,
        notes = EXCLUDED.notes,
        updated_at = NOW()
    `,
    [
      userId,
      input.preferredContactMethod,
      input.careRecipientName,
      input.relationshipToRecipient,
      input.city,
      input.state,
      input.zipCode,
      input.notes,
    ],
  );
}

