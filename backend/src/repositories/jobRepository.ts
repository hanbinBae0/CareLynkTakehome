import { Queryable, pool } from "../db/pool";
import { Job } from "../types/domain";

interface JobRow {
  id: string;
  care_seeker_user_id: string;
  title: string;
  care_type: string;
  location_city: string;
  location_state: string;
  zip_code: string;
  schedule_summary: string;
  frequency: string;
  duration: string;
  requested_weekdays: number[];
  preferred_start_time: string | null;
  preferred_end_time: string | null;
  required_skills: string[];
  notes: string;
  status: "open" | "matched" | "closed";
  created_at: string | Date;
}

function mapJob(row: JobRow): Job {
  return {
    id: row.id,
    careSeekerUserId: row.care_seeker_user_id,
    title: row.title,
    careType: row.care_type,
    locationCity: row.location_city,
    locationState: row.location_state,
    zipCode: row.zip_code,
    scheduleSummary: row.schedule_summary,
    frequency: row.frequency,
    duration: row.duration,
    requestedWeekdays: row.requested_weekdays ?? [],
    preferredStartTime: row.preferred_start_time,
    preferredEndTime: row.preferred_end_time,
    requiredSkills: row.required_skills ?? [],
    notes: row.notes,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function createJob(
  userId: string,
  input: {
    title: string;
    careType: string;
    locationCity: string;
    locationState: string;
    zipCode: string;
    scheduleSummary: string;
    frequency: string;
    duration: string;
    requestedWeekdays: number[];
    preferredStartTime: string | null;
    preferredEndTime: string | null;
    requiredSkills: string[];
    notes: string;
  },
  db: Queryable = pool,
): Promise<Job> {
  const result = await db.query<JobRow>(
    `
      INSERT INTO jobs (
        care_seeker_user_id,
        title,
        care_type,
        location_city,
        location_state,
        zip_code,
        schedule_summary,
        frequency,
        duration,
        requested_weekdays,
        preferred_start_time,
        preferred_end_time,
        required_skills,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `,
    [
      userId,
      input.title,
      input.careType,
      input.locationCity,
      input.locationState,
      input.zipCode,
      input.scheduleSummary,
      input.frequency,
      input.duration,
      input.requestedWeekdays,
      input.preferredStartTime,
      input.preferredEndTime,
      input.requiredSkills,
      input.notes,
    ],
  );

  return mapJob(result.rows[0]);
}

export async function listByCareSeeker(userId: string, db: Queryable = pool): Promise<Job[]> {
  const result = await db.query<JobRow>(
    `
      SELECT *
      FROM jobs
      WHERE care_seeker_user_id = $1
      ORDER BY created_at DESC
    `,
    [userId],
  );

  return result.rows.map(mapJob);
}

export async function findById(jobId: string, careSeekerUserId: string, db: Queryable = pool): Promise<Job | null> {
  const result = await db.query<JobRow>(
    `
      SELECT *
      FROM jobs
      WHERE id = $1 AND care_seeker_user_id = $2
    `,
    [jobId, careSeekerUserId],
  );

  const row = result.rows[0];
  return row ? mapJob(row) : null;
}

export async function updateStatus(jobId: string, status: "open" | "matched" | "closed", db: Queryable = pool): Promise<void> {
  await db.query(
    `
      UPDATE jobs
      SET status = $2,
          updated_at = NOW()
      WHERE id = $1
    `,
    [jobId, status],
  );
}
