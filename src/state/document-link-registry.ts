import { createActivityStore, type ActivityRecord } from "./activity-store";

type MedicalLinkActivity = ActivityRecord;

export const medicalActivityStore = createActivityStore<MedicalLinkActivity>(
  "medical",
  "medical",
);

export function linkedMedicalActivity(
  activityId: string,
): MedicalLinkActivity | undefined {
  return medicalActivityStore.$.peek()[activityId];
}
