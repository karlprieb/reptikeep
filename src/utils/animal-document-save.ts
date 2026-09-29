import {
  addDocument,
  newDocumentId,
  type AnimalDocument,
  type DocumentKind,
} from "@/state/document";
import {
  deleteManagedAnimalDocument,
  getAnimalDocumentUri,
  importAnimalDocument,
  inspectDocumentSource,
  readAnimalDocumentBytes,
  writeAnimalDocument,
  type DocumentExtension,
} from "@/utils/animal-document-storage";

export type SaveAnimalDocumentInput = {
  animalId: string;
  document?: AnimalDocument;
  pickedFile?: { uri: string; extension: DocumentExtension };
  title: string;
  kind: DocumentKind;
  issuedDate?: string;
};

export async function saveAnimalDocument({
  animalId,
  document,
  pickedFile,
  title,
  kind,
  issuedDate,
}: SaveAnimalDocumentInput): Promise<void> {
  const id = document?.id ?? newDocumentId();
  const previousUri = document
    ? getAnimalDocumentUri(document.file)
    : undefined;
  const previousBytes =
    pickedFile && document
      ? await readAnimalDocumentBytes(document.file)
      : undefined;

  let fileUri: string;
  let extension: DocumentExtension;
  let size: number;
  if (pickedFile) {
    const imported = await importAnimalDocument(
      pickedFile.uri,
      id,
      pickedFile.extension,
    );
    fileUri = imported.uri;
    size = imported.size;
    extension = pickedFile.extension;
  } else if (document) {
    fileUri = document.file;
    size = document.size;
    extension = document.extension;
  } else {
    throw new Error("No file to save");
  }

  try {
    addDocument({
      id,
      animalId,
      createdAt: document?.createdAt ?? new Date().toISOString(),
      title,
      kind,
      issuedDate,
      file: fileUri,
      extension,
      size,
      activityType: document?.activityType,
      activityId: document?.activityId,
    });
  } catch (error) {
    if (pickedFile && document && previousUri === fileUri && previousBytes) {
      writeAnimalDocument(document.id, document.extension, previousBytes);
    } else if (pickedFile) {
      deleteManagedAnimalDocument(fileUri);
    }
    throw error;
  }

  if (pickedFile && previousUri && previousUri !== fileUri) {
    deleteManagedAnimalDocument(previousUri);
  }
}

export function tryInspectDocumentSource(uri: string) {
  try {
    return { source: inspectDocumentSource(uri) };
  } catch (error) {
    return { error };
  }
}
