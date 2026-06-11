import { Queryable, pool } from "../db/pool";
import { AvailabilitySlot, Job } from "../types/domain";

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
  requested_availabilities: AvailabilitySlot[] | null;
  required_skills: string[];
  notes: string;
  status: "open" | "matched" | "closed";
  created_at: string | Date;
}

function mapJob(row: JobRow): Job {
  const requestedAvailabilities =
    row.requested_availabilities && row.requested_availabilities.length > 0
      ? row.requested_availabilities
      : (row.requested_weekdays ?? []).flatMap((weekday) =>
          row.preferred_start_time && row.preferred_end_time
            ? [
                {
                  weekday,
                  startTime: row.preferred_start_time,
                  endTime: row.preferred_end_time,
                },
              ]
            : [],
        );

  return {
    id: row.id,
    careSeekerUserId: row.care_seeker_user_id,
    title: row.title,
    careType: row.care_type,
    locationCity: row.location_city,
    locationState: row.location_state,
    zipCode: row.zip_code,
    duration: row.duration,
    requestedWeekdays: row.requested_weekdays ?? [],
    preferredStartTime: row.preferred_start_time,
    preferredEndTime: row.preferred_end_time,
    requestedAvailabilities,
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
    duration: string;
    requestedWeekdays: number[];
    preferredStartTime: string | null;
    preferredEndTime: string | null;
    requestedAvailabilities: AvailabilitySlot[];
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
        requested_availabilities,
        required_skills,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, '', '', $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `,
    [
      userId,
      input.title,
      input.careType,
      input.locationCity,
      input.locationState,
      input.zipCode,
      input.duration,
      input.requestedWeekdays,
      input.preferredStartTime,
      input.preferredEndTime,
      JSON.stringify(input.requestedAvailabilities),
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

export async function lockById(
  jobId: string,
  careSeekerUserId: string,
  db: Queryable,
): Promise<Job | null> {
  const result = await db.query<JobRow>(
    `
      SELECT *
      FROM jobs
      WHERE id = $1 AND care_seeker_user_id = $2
      FOR UPDATE
    `,
    [jobId, careSeekerUserId],
  );

  const row = result.rows[0];
  return row ? mapJob(row) : null;
}

export async function updateJob(
  jobId: string,
  userId: string,
  input: {
    title: string;
    careType: string;
    locationCity: string;
    locationState: string;
    zipCode: string;
    duration: string;
    requestedWeekdays: number[];
    preferredStartTime: string | null;
    preferredEndTime: string | null;
    requestedAvailabilities: AvailabilitySlot[];
    requiredSkills: string[];
    notes: string;
  },
  db: Queryable = pool,
): Promise<Job | null> {
  const result = await db.query<JobRow>(
    `
      UPDATE jobs
      SET title = $3,
          care_type = $4,
          location_city = $5,
          location_state = $6,
          zip_code = $7,
          schedule_summary = '',
          frequency = '',
          duration = $8,
          requested_weekdays = $9,
          preferred_start_time = $10,
          preferred_end_time = $11,
          requested_availabilities = $12,
          required_skills = $13,
          notes = $14,
          updated_at = NOW()
      WHERE id = $1 AND care_seeker_user_id = $2
      RETURNING *
    `,
    [
      jobId,
      userId,
      input.title,
      input.careType,
      input.locationCity,
      input.locationState,
      input.zipCode,
      input.duration,
      input.requestedWeekdays,
      input.preferredStartTime,
      input.preferredEndTime,
      JSON.stringify(input.requestedAvailabilities),
      input.requiredSkills,
      input.notes,
    ],
  );

  const row = result.rows[0];
  return row ? mapJob(row) : null;
}

export async function deleteJob(
  jobId: string,
  careSeekerUserId: string,
  db: Queryable = pool,
): Promise<boolean> {
  const result = await db.query(
    `
      DELETE FROM jobs
      WHERE id = $1 AND care_seeker_user_id = $2
    `,
    [jobId, careSeekerUserId],
  );

  return result.rowCount === 1;
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
