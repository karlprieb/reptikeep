import { observable } from "@legendapp/state";
import { syncObservable } from "@legendapp/state/sync";
import { randomUUID } from "expo-crypto";

import {
  clearManagedAnimalDocuments,
  deleteManagedAnimalDocument,
  type DocumentExtension,
} from "@/utils/animal-document-storage";

import { persistedAsWritten, persistPlugin } from "./persist";

export const DOCUMENT_KINDS = [
  "invoice",
  "authenticity",
  "origin",
  "permit",
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
}

export const documents$ = observable<Record<string, AnimalDocument>>({});

export function newDocumentId(): string {
  return randomUUID();
}

export function addDocument(document: AnimalDocument): void {
  documents$.set({ ...documents$.peek(), [document.id]: document });
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

  for (const document of removed) deleteManagedAnimalDocument(document.file);
}

export function clearDocuments(): void {
  documents$.set({});
  clearManagedAnimalDocuments();
}

function sortKey(document: AnimalDocument): string {
  return document.issuedDate ?? document.createdAt.slice(0, 10);
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
