import { Queryable, pool } from "../db/pool";
import { CaregiverProfile } from "../types/domain";

interface CaregiverRow {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  headline: string;
  city: string;
  state: string;
  zip_code: string;
  bio: string;
  years_experience: number;
  skills: string[];
  certifications: string[];
  accepting_new_jobs: boolean;
  availabilities: Array<{ weekday: number; startTime: string; endTime: string }> | null;
}

type AvailabilitySlotInput = { weekday: number; startTime: string; endTime: string };

function availabilityKey(slot: AvailabilitySlotInput): string {
  return `${slot.weekday}:${slot.startTime}:${slot.endTime}`;
}

function dedupeAvailabilities(slots: AvailabilitySlotInput[]): AvailabilitySlotInput[] {
  const seen = new Set<string>();

  return [...slots]
    .sort(
      (left, right) =>
        left.weekday - right.weekday ||
        left.startTime.localeCompare(right.startTime) ||
        left.endTime.localeCompare(right.endTime),
    )
    .filter((slot) => {
      const key = availabilityKey(slot);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function mapCaregiver(row: CaregiverRow): CaregiverProfile {
  return {
    userId: row.user_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    headline: row.headline,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    bio: row.bio,
    yearsExperience: row.years_experience,
    skills: row.skills ?? [],
    certifications: row.certifications ?? [],
    acceptingNewJobs: row.accepting_new_jobs,
    availabilities: row.availabilities ?? [],
  };
}

const caregiverSelect = `
  SELECT
    u.id AS user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.phone,
    cp.headline,
    cp.city,
    cp.state,
    cp.zip_code,
    cp.bio,
    cp.years_experience,
    cp.skills,
    cp.certifications,
    cp.accepting_new_jobs,
    COALESCE(
      json_agg(
        json_build_object(
          'weekday', ca.weekday,
          'startTime', to_char(ca.start_time, 'HH24:MI'),
          'endTime', to_char(ca.end_time, 'HH24:MI')
        )
        ORDER BY ca.weekday, ca.start_time
      ) FILTER (WHERE ca.id IS NOT NULL),
      '[]'::json
    ) AS availabilities
  FROM users u
  JOIN caregiver_profiles cp ON cp.user_id = u.id
  LEFT JOIN caregiver_availabilities ca ON ca.caregiver_user_id = cp.user_id
`;

export async function findByUserId(userId: string, db: Queryable = pool): Promise<CaregiverProfile | null> {
  const result = await db.query<CaregiverRow>(
    `
      ${caregiverSelect}
      WHERE u.id = $1
      GROUP BY u.id, cp.user_id
    `,
    [userId],
  );

  const row = result.rows[0];
  return row ? mapCaregiver(row) : null;
}

export async function listMatchableCaregivers(db: Queryable = pool): Promise<CaregiverProfile[]> {
  const result = await db.query<CaregiverRow>(
    `
      ${caregiverSelect}
      WHERE u.role = 'caregiver' AND cp.accepting_new_jobs = TRUE
      GROUP BY u.id, cp.user_id
    `,
  );

  return result.rows.map(mapCaregiver);
}

export async function upsertProfile(
  userId: string,
  input: {
    headline: string;
    city: string;
    state: string;
    zipCode: string;
    bio: string;
    yearsExperience: number;
    skills: string[];
    certifications: string[];
    acceptingNewJobs: boolean;
    availabilities: Array<{ weekday: number; startTime: string; endTime: string }>;
  },
  db: Queryable = pool,
): Promise<void> {
  const availabilities = dedupeAvailabilities(input.availabilities);

  await db.query(
    `
      INSERT INTO caregiver_profiles (
        user_id, headline, city, state, zip_code, bio, years_experience, skills, certifications, accepting_new_jobs, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        headline = EXCLUDED.headline,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        zip_code = EXCLUDED.zip_code,
        bio = EXCLUDED.bio,
        years_experience = EXCLUDED.years_experience,
        skills = EXCLUDED.skills,
        certifications = EXCLUDED.certifications,
        accepting_new_jobs = EXCLUDED.accepting_new_jobs,
        updated_at = NOW()
    `,
    [
      userId,
      input.headline,
      input.city,
      input.state,
      input.zipCode,
      input.bio,
      input.yearsExperience,
      input.skills,
      input.certifications,
      input.acceptingNewJobs,
    ],
  );

  await db.query(`DELETE FROM caregiver_availabilities WHERE caregiver_user_id = $1`, [userId]);

  if (availabilities.length === 0) {
    return;
  }

  const values = [userId, ...availabilities.flatMap((slot) => [slot.weekday, slot.startTime, slot.endTime])];
  const placeholders = availabilities
    .map(
      (_slot, index) => `($1, $${index * 3 + 2}, $${index * 3 + 3}, $${index * 3 + 4})`,
    )
    .join(", ");

  await db.query(
    `
      INSERT INTO caregiver_availabilities (caregiver_user_id, weekday, start_time, end_time)
      VALUES ${placeholders}
      ON CONFLICT (caregiver_user_id, weekday, start_time, end_time) DO NOTHING
    `,
    values,
  );
}
