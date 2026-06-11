import * as caregiverRepository from "../repositories/caregiverRepository";
import * as jobRepository from "../repositories/jobRepository";
import * as matchRepository from "../repositories/matchRepository";
import { Job, MatchResult } from "../types/domain";
import { AppError } from "../utils/errors";

function normalize(value: string) {
  return value.trim().toLowerCase();
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

function locationMatches(caregiverState: string, jobState: string): boolean {
  return normalize(caregiverState) === normalize(jobState);
}

function availabilityMatches(
  caregiver: MatchResult["caregiver"],
  job: Job,
): boolean {
  if (job.requestedAvailabilities.length > 0) {
    return job.requestedAvailabilities.every((requestedSlot) =>
      caregiver.availabilities.some(
        (caregiverSlot) =>
          caregiverSlot.weekday === requestedSlot.weekday &&
          timeRangesOverlap(
            caregiverSlot.startTime,
            caregiverSlot.endTime,
            requestedSlot.startTime,
            requestedSlot.endTime,
          ),
      ),
    );
  }

  const hasRequestedDays = job.requestedWeekdays.length > 0;
  const hasTimeWindow = Boolean(job.preferredStartTime && job.preferredEndTime);

  if (!hasRequestedDays && !hasTimeWindow) {
    return true;
  }

  return caregiver.availabilities.some((slot) => {
    const matchesDay = !hasRequestedDays || job.requestedWeekdays.includes(slot.weekday);
    const matchesTime =
      !hasTimeWindow ||
      timeRangesOverlap(slot.startTime, slot.endTime, job.preferredStartTime!, job.preferredEndTime!);

    return matchesDay && matchesTime;
  });
}

function requirementMatchesText(requirement: string, value: string): boolean {
  const normalizedRequirement = normalize(requirement);
  const normalizedValue = normalize(value);

  return (
    normalizedValue === normalizedRequirement ||
    normalizedValue.includes(normalizedRequirement) ||
    normalizedRequirement.includes(normalizedValue)
  );
}

function requiredSkillsMatch(caregiver: MatchResult["caregiver"], requiredSkills: string[]): string[] | null {
  if (requiredSkills.length === 0) {
    return [];
  }

  const experienceText = [caregiver.headline, caregiver.bio].join(" ");
  const matchedRequirements = requiredSkills.filter((requiredSkill) => {
    return (
      caregiver.skills.some((skill) => requirementMatchesText(requiredSkill, skill)) ||
      requirementMatchesText(requiredSkill, experienceText)
    );
  });

  return matchedRequirements.length === requiredSkills.length ? matchedRequirements : null;
}

export async function recomputeMatches(jobId: string, careSeekerUserId: string): Promise<MatchResult[]> {
  const job = await jobRepository.findById(jobId, careSeekerUserId);

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  const caregivers = await caregiverRepository.listMatchableCaregivers();

  const matches = caregivers
    .map<MatchResult | null>((caregiver) => {
      const reasons: string[] = [];
      const matchesLocation = locationMatches(caregiver.state, job.locationState);
      const matchesAvailability = availabilityMatches(caregiver, job);
      const matchedSkills = requiredSkillsMatch(caregiver, job.requiredSkills);

      if (!matchesLocation || !matchesAvailability || matchedSkills === null) {
        return null;
      }

      reasons.push("Same state");

      if (
        job.requestedAvailabilities.length === 0 &&
        job.requestedWeekdays.length === 0 &&
        !job.preferredStartTime &&
        !job.preferredEndTime
      ) {
        reasons.push("Flexible requested schedule");
      } else {
        reasons.push("Availability overlaps requested schedule");
      }

      if (matchedSkills.length > 0) {
        reasons.push(`Meets required skills: ${matchedSkills.join(", ")}`);
      } else {
        reasons.push("No required skills specified");
      }

      return {
        caregiverUserId: caregiver.userId,
        score: 1,
        reasons,
        caregiver,
      };
    })
    .filter((value): value is MatchResult => value !== null)
    .sort((left, right) => {
      const byLastName = left.caregiver.lastName.localeCompare(right.caregiver.lastName);
      if (byLastName !== 0) {
        return byLastName;
      }

      const byFirstName = left.caregiver.firstName.localeCompare(right.caregiver.firstName);
      if (byFirstName !== 0) {
        return byFirstName;
      }

      return left.caregiverUserId.localeCompare(right.caregiverUserId);
    });

  await matchRepository.replaceMatches(
    jobId,
    matches.map((match) => ({
      caregiverUserId: match.caregiverUserId,
      score: match.score,
      reasons: match.reasons,
    })),
  );

  return matches;
}
