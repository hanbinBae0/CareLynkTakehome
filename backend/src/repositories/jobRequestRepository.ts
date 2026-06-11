import { Queryable, pool } from "../db/pool";
import {
  CaregiverJobRequest,
  CareSeekerJobRequest,
  JobRequestStatus,
} from "../types/domain";

interface CareSeekerRequestRow {
  id: string;
  job_id: string;
  caregiver_user_id: string;
  status: JobRequestStatus;
  message: string;
  created_at: string | Date;
  responded_at: string | Date | null;
  caregiver_first_name: string;
  caregiver_last_name: string;
  caregiver_headline: string;
}

interface CaregiverRequestRow {
  id: string;
  job_id: string;
  caregiver_user_id: string;
  status: JobRequestStatus;
  message: string;
  created_at: string | Date;
  responded_at: string | Date | null;
  care_seeker_user_id: string;
  title: string;
  care_type: string;
  location_city: string;
  location_state: string;
  zip_code: string;
  duration: string;
  requested_weekdays: number[];
  preferred_start_time: string | null;
  preferred_end_time: string | null;
  requested_availabilities: Array<{ weekday: number; startTime: string; endTime: string }> | null;
  required_skills: string[];
  notes: string;
  job_status: "open" | "matched" | "closed";
  job_created_at: string | Date;
  care_seeker_email: string;
  care_seeker_first_name: string;
  care_seeker_last_name: string;
  care_seeker_phone: string;
  preferred_contact_method: string;
  care_recipient_name: string;
  relationship_to_recipient: string;
}

export interface LockedJobRequest {
  id: string;
  jobId: string;
  status: JobRequestStatus;
  jobStatus: "open" | "matched" | "closed";
}

function toIsoString(value: string | Date): string {
  return new Date(value).toISOString();
}

function mapCareSeekerRequest(row: CareSeekerRequestRow): CareSeekerJobRequest {
  return {
    id: row.id,
    jobId: row.job_id,
    caregiverUserId: row.caregiver_user_id,
    status: row.status,
    message: row.message,
    createdAt: toIsoString(row.created_at),
    respondedAt: row.responded_at ? toIsoString(row.responded_at) : null,
    caregiver: {
      firstName: row.caregiver_first_name,
      lastName: row.caregiver_last_name,
      headline: row.caregiver_headline,
    },
  };
}

function mapCaregiverRequest(row: CaregiverRequestRow): CaregiverJobRequest {
  return {
    id: row.id,
    jobId: row.job_id,
    caregiverUserId: row.caregiver_user_id,
    status: row.status,
    message: row.message,
    createdAt: toIsoString(row.created_at),
    respondedAt: row.responded_at ? toIsoString(row.responded_at) : null,
    job: {
      id: row.job_id,
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
      requestedAvailabilities: row.requested_availabilities ?? [],
      requiredSkills: row.required_skills ?? [],
      notes: row.notes,
      status: row.job_status,
      createdAt: toIsoString(row.job_created_at),
    },
    careSeeker: {
      userId: row.care_seeker_user_id,
      email: row.care_seeker_email,
      firstName: row.care_seeker_first_name,
      lastName: row.care_seeker_last_name,
      phone: row.care_seeker_phone,
      preferredContactMethod: row.preferred_contact_method,
      careRecipientName: row.care_recipient_name,
      relationshipToRecipient: row.relationship_to_recipient,
    },
  };
}

export async function create(
  jobId: string,
  caregiverUserId: string,
  message: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `
      INSERT INTO job_requests (job_id, caregiver_user_id, message)
      VALUES ($1, $2, $3)
    `,
    [jobId, caregiverUserId, message],
  );
}

export async function listForJob(
  jobId: string,
  careSeekerUserId: string,
  db: Queryable = pool,
): Promise<CareSeekerJobRequest[]> {
  const result = await db.query<CareSeekerRequestRow>(
    `
      SELECT
        jr.id,
        jr.job_id,
        jr.caregiver_user_id,
        jr.status,
        jr.message,
        jr.created_at,
        jr.responded_at,
        u.first_name AS caregiver_first_name,
        u.last_name AS caregiver_last_name,
        cp.headline AS caregiver_headline
      FROM job_requests jr
      JOIN jobs j ON j.id = jr.job_id
      JOIN users u ON u.id = jr.caregiver_user_id
      JOIN caregiver_profiles cp ON cp.user_id = jr.caregiver_user_id
      WHERE jr.job_id = $1 AND j.care_seeker_user_id = $2
      ORDER BY jr.created_at DESC
    `,
    [jobId, careSeekerUserId],
  );

  return result.rows.map(mapCareSeekerRequest);
}

export async function listForCaregiver(
  caregiverUserId: string,
  db: Queryable = pool,
): Promise<CaregiverJobRequest[]> {
  const result = await db.query<CaregiverRequestRow>(
    `
      SELECT
        jr.id,
        jr.job_id,
        jr.caregiver_user_id,
        jr.status,
        jr.message,
        jr.created_at,
        jr.responded_at,
        j.care_seeker_user_id,
        j.title,
        j.care_type,
        j.location_city,
        j.location_state,
        j.zip_code,
        j.duration,
        j.requested_weekdays,
        to_char(j.preferred_start_time, 'HH24:MI') AS preferred_start_time,
        to_char(j.preferred_end_time, 'HH24:MI') AS preferred_end_time,
        j.requested_availabilities,
        j.required_skills,
        j.notes,
        j.status AS job_status,
        j.created_at AS job_created_at,
        u.email AS care_seeker_email,
        u.first_name AS care_seeker_first_name,
        u.last_name AS care_seeker_last_name,
        u.phone AS care_seeker_phone,
        csp.preferred_contact_method,
        csp.care_recipient_name,
        csp.relationship_to_recipient
      FROM job_requests jr
      JOIN jobs j ON j.id = jr.job_id
      JOIN users u ON u.id = j.care_seeker_user_id
      JOIN care_seeker_profiles csp ON csp.user_id = j.care_seeker_user_id
      WHERE jr.caregiver_user_id = $1
      ORDER BY
        CASE jr.status
          WHEN 'pending' THEN 0
          WHEN 'accepted' THEN 1
          WHEN 'declined' THEN 2
          ELSE 3
        END,
        jr.created_at DESC
    `,
    [caregiverUserId],
  );

  return result.rows.map(mapCaregiverRequest);
}

export async function lockForCaregiver(
  requestId: string,
  caregiverUserId: string,
  db: Queryable,
): Promise<LockedJobRequest | null> {
  const result = await db.query<{
    id: string;
    job_id: string;
    status: JobRequestStatus;
    job_status: "open" | "matched" | "closed";
  }>(
    `
      SELECT
        jr.id,
        jr.job_id,
        jr.status,
        j.status AS job_status
      FROM job_requests jr
      JOIN jobs j ON j.id = jr.job_id
      WHERE jr.id = $1 AND jr.caregiver_user_id = $2
      FOR UPDATE OF j, jr
    `,
    [requestId, caregiverUserId],
  );

  const row = result.rows[0];
  return row
    ? {
        id: row.id,
        jobId: row.job_id,
        status: row.status,
        jobStatus: row.job_status,
      }
    : null;
}

export async function updateStatus(
  requestId: string,
  status: JobRequestStatus,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `
      UPDATE job_requests
      SET status = $2,
          responded_at = NOW()
      WHERE id = $1
    `,
    [requestId, status],
  );
}

export async function cancelOtherPending(
  jobId: string,
  acceptedRequestId: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `
      UPDATE job_requests
      SET status = 'cancelled',
          responded_at = NOW()
      WHERE job_id = $1
        AND id <> $2
        AND status = 'pending'
    `,
    [jobId, acceptedRequestId],
  );
}

export async function cancelPendingForJob(
  jobId: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `
      UPDATE job_requests
      SET status = 'cancelled',
          responded_at = NOW()
      WHERE job_id = $1 AND status = 'pending'
    `,
    [jobId],
  );
}

export async function cancelPendingForCareSeeker(
  requestId: string,
  jobId: string,
  careSeekerUserId: string,
  db: Queryable = pool,
): Promise<boolean> {
  const result = await db.query(
    `
      UPDATE job_requests jr
      SET status = 'cancelled',
          responded_at = NOW()
      FROM jobs j
      WHERE jr.id = $1
        AND jr.job_id = $2
        AND jr.job_id = j.id
        AND j.care_seeker_user_id = $3
        AND jr.status = 'pending'
    `,
    [requestId, jobId, careSeekerUserId],
  );

  return result.rowCount === 1;
}
