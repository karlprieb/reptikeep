import { batch } from "@legendapp/state";
import { randomUUID } from "expo-crypto";

import {
  deleteManagedAnimalDocument,
  importAnimalDocument,
  inspectDocumentSource,
  type DocumentExtension,
} from "@/utils/animal-document-storage";
import { toCalendarDate } from "@/utils/format-date";
import { clampTextFields } from "@/utils/text-limits";

import {
  type ActivityRecord,
  type createActivityStore,
} from "./activity-store";
import {
  addDocument,
  documents$,
  newDocumentId,
  type AnimalDocument,
} from "./document";
import { medicalActivityStore } from "./document-link-registry";

export interface MedicalActivity extends ActivityRecord {
  summary: string;
  notes?: string;
}

export type CreateMedicalInput = Omit<
  MedicalActivity,
  "id" | "createdAt" | "occurredAt"
> & {
  occurredAt?: string;
};

function validMedicalActivity(record: MedicalActivity): MedicalActivity {
  const clamped = clampTextFields(record);
  if (!clamped.summary) throw new Error("Medical summary is required.");
  return clamped;
}

export function createMedicalActivity(
  input: CreateMedicalInput,
): MedicalActivity {
  return validMedicalActivity({
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  });
}

const typedMedicalActivityStore = medicalActivityStore as ReturnType<
  typeof createActivityStore<MedicalActivity>
>;

export const medicalStore = {
  get $() {
    return typedMedicalActivityStore.$;
  },
  hydrate: typedMedicalActivityStore.hydrate,
  add(record: MedicalActivity): void {
    typedMedicalActivityStore.add(validMedicalActivity(record));
  },
  remove: typedMedicalActivityStore.remove,
  removeForAnimal: typedMedicalActivityStore.removeForAnimal,
  clear: typedMedicalActivityStore.clear,
  resummarize: typedMedicalActivityStore.resummarize,
};

export type PendingMedicalDocument = {
  uri: string;
  title: string;
  extension?: DocumentExtension;
};

function cleanupDocuments(documents: AnimalDocument[]): void {
  for (const document of documents) {
    try {
      deleteManagedAnimalDocument(document.file);
    } catch {}
  }
}

export async function saveMedicalActivity(
  record: MedicalActivity,
  pending: PendingMedicalDocument[],
  removedDocumentIds: string[] = [],
): Promise<void> {
  const savedRecord = validMedicalActivity(record);
  const previousActivity = medicalStore.$.peek()[savedRecord.id];
  const previousDocuments = documents$.peek();
  const removed = removedDocumentIds
    .map((id) => previousDocuments[id])
    .filter(
      (document): document is AnimalDocument =>
        document?.activityType === "medical" &&
        document.activityId === savedRecord.id,
    );
  const imported: AnimalDocument[] = [];

  try {
    for (const source of pending) {
      const inspected = inspectDocumentSource(source.uri);
      if (source.extension && source.extension !== inspected.extension)
        throw new Error("Document type changed before import.");

      const id = newDocumentId();
      const file = await importAnimalDocument(
        source.uri,
        id,
        inspected.extension,
      );
      imported.push({
        id,
        animalId: savedRecord.animalId,
        createdAt: new Date().toISOString(),
        title: source.title.trim(),
        kind: "medical",
        issuedDate: toCalendarDate(new Date(savedRecord.occurredAt)),
        file: file.uri,
        extension: inspected.extension,
        size: file.size,
        activityType: "medical",
        activityId: savedRecord.id,
      });
    }

    batch(() => {
      medicalStore.add(savedRecord);
      for (const document of imported) addDocument(document);
      for (const document of removed) {
        const { [document.id]: _, ...rest } = documents$.peek();
        documents$.set(rest);
      }
    });
  } catch (error) {
    batch(() => {
      if (previousActivity) medicalStore.add(previousActivity);
      else medicalStore.remove(savedRecord.id);
      documents$.set(previousDocuments);
    });
    cleanupDocuments(imported);
    throw error;
  }

  cleanupDocuments(removed);
}
