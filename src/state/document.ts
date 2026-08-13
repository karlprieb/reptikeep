import { observable } from "@legendapp/state";
import { syncObservable } from "@legendapp/state/sync";
import { randomUUID } from "expo-crypto";

import {
  clearManagedAnimalDocuments,
  deleteManagedAnimalDocument,
  type DocumentExtension,
} from "@/utils/animal-document-storage";
import { clampTextFields } from "@/utils/text-limits";

import { linkedMedicalActivity } from "./document-link-registry";
import { persistedAsWritten, persistPlugin } from "./persist";

export const DOCUMENT_KINDS = [
  "invoice",
  "authenticity",
  "origin",
  "permit",
  "medical",
  "other",
] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export interface AnimalDocument {
  id: string;
  animalId: string;
  /** An instant: full UTC ISO, `YYYY-MM-DDTHH:MM:SS.sssZ`. */
  createdAt: string;
  title: string;
  kind: DocumentKind;
  /** A calendar date: bare `YYYY-MM-DD`, no time and no zone. */
  issuedDate?: string;
  file: string;
  extension: DocumentExtension;
  size: number;
  activityType?: "medical";
  activityId?: string;
}

export const documents$ = observable<Record<string, AnimalDocument>>({});

export function newDocumentId(): string {
  return randomUUID();
}

export function assertValidDocumentLink(document: AnimalDocument): void {
  const hasType = document.activityType !== undefined;
  const hasId = document.activityId !== undefined;
  if (hasType !== hasId)
    throw new Error("Document activity link is incomplete.");
  if (!hasType || !hasId) return;
  if (document.kind !== "medical")
    throw new Error("Linked medical documents must have medical kind.");

  const activity = linkedMedicalActivity(document.activityId!);
  if (!activity || activity.animalId !== document.animalId)
    throw new Error("Document activity link is invalid.");
}

export function addDocument(document: AnimalDocument): void {
  assertValidDocumentLink(document);
  const clamped = clampTextFields(document);
  documents$.set({ ...documents$.peek(), [clamped.id]: clamped });
}

export function removeDocument(id: string): void {
  const { [id]: removed, ...rest } = documents$.peek();
  if (!removed) return;

  documents$.set(rest);
  deleteManagedAnimalDocument(removed.file);
}

export function removeDocumentsForAnimal(animalId: string): void {
  const current = documents$.peek();
  const removed = Object.values(current).filter(
    (document) => document.animalId === animalId,
  );
  if (!removed.length) return;

  documents$.set(
    Object.fromEntries(
      Object.entries(current).filter(
        ([, document]) => document.animalId !== animalId,
      ),
    ),
  );

  for (const document of removed) {
    try {
      deleteManagedAnimalDocument(document.file);
    } catch {}
  }
}

export function clearDocuments(): void {
  documents$.set({});
  clearManagedAnimalDocuments();
}

function sortKey(document: AnimalDocument): string {
  return document.issuedDate ?? document.createdAt.slice(0, 10);
}

export function documentsForActivity(
  activityType: NonNullable<AnimalDocument["activityType"]>,
  activityId: string,
  documents: Record<string, AnimalDocument>,
): AnimalDocument[] {
  return Object.values(documents).filter(
    (document) =>
      document.activityType === activityType &&
      document.activityId === activityId,
  );
}

export function removeDocumentsForActivity(
  activityType: NonNullable<AnimalDocument["activityType"]>,
  activityId: string,
): AnimalDocument[] {
  const current = documents$.peek();
  const removed = documentsForActivity(activityType, activityId, current);
  if (!removed.length) return [];

  documents$.set(
    Object.fromEntries(
      Object.entries(current).filter(
        ([, document]) =>
          document.activityType !== activityType ||
          document.activityId !== activityId,
      ),
    ),
  );
  return removed;
}

export function documentsForAnimal(
  animalId: string,
  documents: Record<string, AnimalDocument>,
): AnimalDocument[] {
  return Object.values(documents)
    .filter((document) => document.animalId === animalId)
    .sort(
      (a, b) =>
        sortKey(b).localeCompare(sortKey(a)) ||
        b.createdAt.localeCompare(a.createdAt),
    );
}

syncObservable(documents$, {
  persist: {
    name: "documents",
    plugin: persistPlugin,
    transform: persistedAsWritten(),
  },
});
