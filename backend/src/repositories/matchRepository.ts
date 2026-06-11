import { Queryable, pool } from "../db/pool";
import { MatchResult } from "../types/domain";

interface MatchRow {
  caregiver_user_id: string;
  score: number;
  reasons: string[];
}

export async function replaceMatches(
  jobId: string,
  matches: Array<{ caregiverUserId: string; score: number; reasons: string[] }>,
  db: Queryable = pool,
): Promise<void> {
  await db.query(`DELETE FROM job_matches WHERE job_id = $1`, [jobId]);

  for (const match of matches) {
    await db.query(
      `
        INSERT INTO job_matches (job_id, caregiver_user_id, score, reasons)
        VALUES ($1, $2, $3, $4)
      `,
      [jobId, match.caregiverUserId, match.score, match.reasons],
    );
  }
}

export async function matchExists(
  jobId: string,
  caregiverUserId: string,
  db: Queryable = pool,
): Promise<boolean> {
  const result = await db.query(
    `
      SELECT 1
      FROM job_matches
      WHERE job_id = $1 AND caregiver_user_id = $2
    `,
    [jobId, caregiverUserId],
  );

  return result.rowCount === 1;
}

export async function attachStoredMatches(
  matches: MatchResult[],
  jobId: string,
  db: Queryable = pool,
): Promise<MatchResult[]> {
  const result = await db.query<MatchRow>(
    `
      SELECT caregiver_user_id, score, reasons
      FROM job_matches
      WHERE job_id = $1
      ORDER BY score DESC
    `,
    [jobId],
  );

  const index = new Map(matches.map((match) => [match.caregiverUserId, match]));

  return result.rows
    .map((row) => {
      const match = index.get(row.caregiver_user_id);
      if (!match) {
        return null;
      }

      return {
        ...match,
        score: row.score,
        reasons: row.reasons,
      };
    })
    .filter((value): value is MatchResult => value !== null);
}

