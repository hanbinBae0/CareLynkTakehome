import * as caregiverRepository from "../repositories/caregiverRepository";
import * as jobRepository from "../repositories/jobRepository";
import * as matchRepository from "../repositories/matchRepository";
import { MatchResult } from "../types/domain";
import { AppError } from "../utils/errors";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function weekdayOverlap(jobDays: number[], caregiverDays: number[]) {
  return jobDays.filter((day) => caregiverDays.includes(day));
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function timeRangesOverlap(
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string,
): boolean {
  return toMinutes(leftStart) < toMinutes(rightEnd) && toMinutes(rightStart) < toMinutes(leftEnd);
}

export async function recomputeMatches(jobId: string, careSeekerUserId: string): Promise<MatchResult[]> {
  const job = await jobRepository.findById(jobId, careSeekerUserId);

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  const caregivers = await caregiverRepository.listMatchableCaregivers();

  const matches = caregivers
    .map<MatchResult | null>((caregiver) => {
      let score = 0;
      const reasons: string[] = [];

      const sameState = normalize(caregiver.state) === normalize(job.locationState);
      const sameCity = normalize(caregiver.city) === normalize(job.locationCity);

      if (sameState && sameCity) {
        score += 40;
        reasons.push("Same city and state");
      } else if (sameState) {
        score += 20;
        reasons.push("Same state");
      }

      const jobSkills = new Set(job.requiredSkills.map(normalize));
      const sharedSkills = caregiver.skills.filter((skill) => jobSkills.has(normalize(skill)));

      if (sharedSkills.length > 0) {
        score += Math.min(sharedSkills.length * 15, 30);
        reasons.push(`Shared skills: ${sharedSkills.join(", ")}`);
      }

      const caregiverDays = caregiver.availabilities.map((slot) => slot.weekday);
      const sharedDays = weekdayOverlap(job.requestedWeekdays, caregiverDays);
      const hasTimeWindow = Boolean(job.preferredStartTime && job.preferredEndTime);
      const overlappingAvailability = caregiver.availabilities.filter((slot) => {
        const matchesDay = job.requestedWeekdays.length === 0 || job.requestedWeekdays.includes(slot.weekday);
        const matchesTime =
          !hasTimeWindow ||
          timeRangesOverlap(slot.startTime, slot.endTime, job.preferredStartTime!, job.preferredEndTime!);

        return matchesDay && matchesTime;
      });

      if (job.requestedWeekdays.length === 0 && !hasTimeWindow) {
        score += 10;
        reasons.push("Flexible requested schedule");
      } else if (overlappingAvailability.length > 0) {
        score += 25;
        reasons.push(
          hasTimeWindow
            ? "Availability overlaps requested days and preferred time window"
            : "Availability overlaps requested weekdays",
        );
      } else if (sharedDays.length > 0) {
        reasons.push("Available on the right days, but outside the preferred time window");
      }

      if (caregiver.yearsExperience >= 2) {
        score += 5;
        reasons.push("Has prior care experience");
      }

      if (score < 35) {
        return null;
      }

      return {
        caregiverUserId: caregiver.userId,
        score,
        reasons,
        caregiver,
      };
    })
    .filter((value): value is MatchResult => value !== null)
    .sort((left, right) => right.score - left.score);

  await matchRepository.replaceMatches(
    jobId,
    matches.map((match) => ({
      caregiverUserId: match.caregiverUserId,
      score: match.score,
      reasons: match.reasons,
    })),
  );

  await jobRepository.updateStatus(jobId, matches.length > 0 ? "matched" : "open");

  return matches;
}
