import fs from "fs";
import path from "path";

import { pool, withTransaction } from "../db/pool";
import { recomputeMatches } from "../services/matchingService";
import { hashPassword } from "../utils/password";

const DEMO_PASSWORD = "CareLynk123!";

const ids = {
  caregiverMaria: "10000000-0000-4000-8000-000000000001",
  caregiverJames: "10000000-0000-4000-8000-000000000002",
  caregiverOnboarding: "10000000-0000-4000-8000-000000000003",
  careSeeker: "20000000-0000-4000-8000-000000000001",
  openJob: "30000000-0000-4000-8000-000000000001",
  pendingJob: "30000000-0000-4000-8000-000000000002",
  matchedJob: "30000000-0000-4000-8000-000000000003",
};

const demoEmails = [
  "caregiver.demo@carelynk.test",
  "caregiver.james@carelynk.test",
  "caregiver.new@carelynk.test",
  "seeker.demo@carelynk.test",
];

async function applySchema() {
  const schemaPath = path.resolve(__dirname, "../../sql/schema.sql");
  await pool.query(fs.readFileSync(schemaPath, "utf8"));
}

async function seedCoreData() {
  const passwordHash = hashPassword(DEMO_PASSWORD);

  await withTransaction(async (client) => {
    await client.query(`DELETE FROM users WHERE email = ANY($1::text[])`, [demoEmails]);

    await client.query(
      `
        INSERT INTO users (id, role, email, password_hash, first_name, last_name, phone)
        VALUES
          ($1, 'caregiver', $2, $5, 'Maria', 'Santos', '902-555-0101'),
          ($3, 'caregiver', $4, $5, 'James', 'Wilson', '902-555-0102'),
          ($6, 'caregiver', $7, $5, 'Taylor', 'New', '902-555-0103'),
          ($8, 'care_seeker', $9, $5, 'Alex', 'Morgan', '902-555-0201')
      `,
      [
        ids.caregiverMaria,
        demoEmails[0],
        ids.caregiverJames,
        demoEmails[1],
        passwordHash,
        ids.caregiverOnboarding,
        demoEmails[2],
        ids.careSeeker,
        demoEmails[3],
      ],
    );

    await client.query(
      `
        INSERT INTO caregiver_profiles (
          user_id,
          headline,
          city,
          state,
          zip_code,
          bio,
          years_experience,
          skills,
          certifications,
          accepting_new_jobs
        )
        VALUES
          (
            $1,
            'Compassionate companion and meal support',
            'Halifax',
            'Nova Scotia',
            'B3H 1Y2',
            'Experienced with companionship, meal preparation, mobility support, and daily routines.',
            6,
            ARRAY['Companionship', 'Meal preparation', 'Mobility support'],
            ARRAY['First Aid', 'CPR'],
            TRUE
          ),
          (
            $2,
            'Personal and dementia care specialist',
            'Dartmouth',
            'Nova Scotia',
            'B2Y 1H4',
            'Provides personal care and dementia support with a calm, safety-focused approach.',
            9,
            ARRAY['Personal care', 'Dementia care', 'Medication reminders'],
            ARRAY['First Aid', 'CPR', 'Dementia Care Certificate'],
            TRUE
          ),
          ($3, '', '', '', '', '', 0, '{}', '{}', TRUE)
      `,
      [ids.caregiverMaria, ids.caregiverJames, ids.caregiverOnboarding],
    );

    await client.query(
      `
        INSERT INTO caregiver_availabilities (
          caregiver_user_id,
          weekday,
          start_time,
          end_time
        )
        VALUES
          ($1, 1, '08:00', '16:00'),
          ($1, 3, '08:00', '16:00'),
          ($1, 5, '08:00', '16:00'),
          ($2, 2, '12:00', '18:00'),
          ($2, 4, '12:00', '18:00')
      `,
      [ids.caregiverMaria, ids.caregiverJames],
    );

    await client.query(
      `
        INSERT INTO care_seeker_profiles (
          user_id,
          preferred_contact_method,
          care_recipient_name,
          relationship_to_recipient,
          city,
          state,
          zip_code,
          notes
        )
        VALUES (
          $1,
          'Phone or text',
          'Evelyn Morgan',
          'Parent',
          'Halifax',
          'Nova Scotia',
          'B3H 2Y5',
          'Demo profile for reviewer testing.'
        )
      `,
      [ids.careSeeker],
    );

    await client.query(
      `
        INSERT INTO jobs (
          id,
          care_seeker_user_id,
          title,
          care_type,
          location_city,
          location_state,
          zip_code,
          duration,
          requested_weekdays,
          requested_availabilities,
          required_skills,
          notes,
          status
        )
        VALUES
          (
            $1,
            $4,
            'Morning companionship',
            'Companion care',
            'Halifax',
            'Nova Scotia',
            'B3H 2Y5',
            '4 weeks',
            ARRAY[1, 3],
            $5::jsonb,
            ARRAY['Companionship'],
            'Conversation, light walks, and help preparing lunch.',
            'open'
          ),
          (
            $2,
            $4,
            'Friday meal preparation',
            'Meal support',
            'Halifax',
            'Nova Scotia',
            'B3H 2Y5',
            'Ongoing',
            ARRAY[5],
            $6::jsonb,
            ARRAY['Meal preparation'],
            'Prepare lunch and a few freezer-friendly meals.',
            'open'
          ),
          (
            $3,
            $4,
            'Dementia afternoon support',
            'Dementia care',
            'Dartmouth',
            'Nova Scotia',
            'B2Y 1H4',
            '8 weeks',
            ARRAY[2, 4],
            $7::jsonb,
            ARRAY['Dementia care'],
            'Provide supervision, activities, and medication reminders.',
            'open'
          )
      `,
      [
        ids.openJob,
        ids.pendingJob,
        ids.matchedJob,
        ids.careSeeker,
        JSON.stringify([
          { weekday: 1, startTime: "09:00", endTime: "12:00" },
          { weekday: 3, startTime: "09:00", endTime: "12:00" },
        ]),
        JSON.stringify([{ weekday: 5, startTime: "10:00", endTime: "13:00" }]),
        JSON.stringify([
          { weekday: 2, startTime: "13:00", endTime: "17:00" },
          { weekday: 4, startTime: "13:00", endTime: "17:00" },
        ]),
      ],
    );
  });
}

async function seedMatchesAndRequests() {
  await recomputeMatches(ids.openJob, ids.careSeeker);
  await recomputeMatches(ids.pendingJob, ids.careSeeker);
  await recomputeMatches(ids.matchedJob, ids.careSeeker);

  await withTransaction(async (client) => {
    await client.query(
      `
        INSERT INTO job_requests (job_id, caregiver_user_id, status, message)
        VALUES (
          $1,
          $2,
          'pending',
          'Would you be available to help with Friday meal preparation?'
        )
      `,
      [ids.pendingJob, ids.caregiverMaria],
    );

    await client.query(
      `
        INSERT INTO job_requests (
          job_id,
          caregiver_user_id,
          status,
          message,
          responded_at
        )
        VALUES (
          $1,
          $2,
          'accepted',
          'We would like to request afternoon dementia support.',
          NOW()
        )
      `,
      [ids.matchedJob, ids.caregiverJames],
    );

    await client.query(
      `UPDATE jobs SET status = 'matched', updated_at = NOW() WHERE id = $1`,
      [ids.matchedJob],
    );
  });
}

async function printSummary() {
  const accounts = await pool.query<{
    email: string;
    role: string;
  }>(
    `
      SELECT u.email, u.role
      FROM users u
      WHERE u.email = ANY($1::text[])
      ORDER BY u.role, u.email
    `,
    [demoEmails],
  );
  const jobIds = [ids.openJob, ids.pendingJob, ids.matchedJob];
  const totals = await pool.query<{
    jobs: string;
    matches: string;
    requests: string;
  }>(
    `
      SELECT
        (SELECT COUNT(*)::text FROM jobs WHERE id = ANY($1::uuid[])) AS jobs,
        (SELECT COUNT(*)::text FROM job_matches WHERE job_id = ANY($1::uuid[])) AS matches,
        (SELECT COUNT(*)::text FROM job_requests WHERE job_id = ANY($1::uuid[])) AS requests
    `,
    [jobIds],
  );

  console.log("Seed complete.");
  console.log(`Password for all demo accounts: ${DEMO_PASSWORD}`);
  for (const row of accounts.rows) {
    console.log(`- ${row.email} (${row.role})`);
  }
  const total = totals.rows[0];
  console.log(
    `Demo totals: ${total.jobs} jobs, ${total.matches} matches, ${total.requests} requests.`,
  );
}

async function main() {
  try {
    await applySchema();
    await seedCoreData();
    await seedMatchesAndRequests();
    await printSummary();
  } finally {
    await pool.end();
  }
}

void main().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
