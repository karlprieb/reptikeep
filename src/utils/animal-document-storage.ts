import { Directory, File, Paths } from "expo-file-system";

export const DOCUMENT_EXTENSIONS = ["pdf", "jpg", "png", "heic"] as const;
export type DocumentExtension = (typeof DOCUMENT_EXTENSIONS)[number];

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export interface DocumentSource {
  extension: DocumentExtension;
  size: number;
}

const MANAGED_DIRECTORY_NAME = "animal-documents";
const STAGING_SUFFIX = ".staging";

const ALIASES: Record<string, DocumentExtension> = {
  jpeg: "jpg",
  heif: "heic",
};

const MIME_TYPES: Record<DocumentExtension, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
};

const UTIS: Record<DocumentExtension, string> = {
  pdf: "com.adobe.pdf",
  jpg: "public.jpeg",
  png: "public.png",
  heic: "public.heic",
};

export class UnsupportedDocumentError extends Error {}

export class DocumentTooLargeError extends Error {
  constructor(readonly size: number) {
    super("Document exceeds the maximum size");
  }
}

function getManagedDirectory(): Directory {
  return new Directory(Paths.document, MANAGED_DIRECTORY_NAME);
}

function getSafeDocumentId(documentId: string): string {
  const safeDocumentId = documentId.replace(/[^a-z0-9_-]/gi, "");
  if (!safeDocumentId)
    throw new Error("Document id cannot be used as a file name");
  return safeDocumentId;
}

export function managedAnimalDocumentUri(
  documentId: string,
  extension: DocumentExtension,
): string {
  return new File(
    getManagedDirectory(),
    `${getSafeDocumentId(documentId)}.${extension}`,
  ).uri;
}

export function documentExtension(
  nameOrUri: string,
): DocumentExtension | undefined {
  const name = nameOrUri.split(/[?#]/)[0].split("/").pop() ?? "";
  const suffix = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  const extension = ALIASES[suffix] ?? suffix;

  return DOCUMENT_EXTENSIONS.includes(extension as DocumentExtension)
    ? (extension as DocumentExtension)
    : undefined;
}

export function documentMimeType(extension: DocumentExtension): string {
  return MIME_TYPES[extension];
}

export function documentUti(extension: DocumentExtension): string {
  return UTIS[extension];
}

function measureSource(uri: string): number {
  const source = new File(uri);
  if (!source.exists) throw new Error("Document file is unreadable");

  const size = source.size ?? 0;
  if (size > MAX_DOCUMENT_BYTES) throw new DocumentTooLargeError(size);

  return size;
}

export function inspectDocumentSource(
  uri: string,
  name?: string,
): DocumentSource {
  const extension = documentExtension(name ?? uri) ?? documentExtension(uri);
  if (!extension) throw new UnsupportedDocumentError("Unsupported file type");

  return { extension, size: measureSource(uri) };
}

export async function importAnimalDocument(
  sourceUri: string,
  documentId: string,
  extension: DocumentExtension,
): Promise<{ uri: string; size: number }> {
  const size = measureSource(sourceUri);
  const directory = getManagedDirectory();
  directory.create({ idempotent: true, intermediates: true });

  const filename = `${getSafeDocumentId(documentId)}.${extension}`;
  const stagingFile = new File(directory, `${filename}${STAGING_SUFFIX}`);
  const destination = new File(directory, filename);

  try {
    await new File(sourceUri).copy(stagingFile, { overwrite: true });
    stagingFile.rename(filename);
    return { uri: destination.uri, size };
  } catch (error) {
    if (stagingFile.exists) stagingFile.delete();
    throw error;
  }
}

export function writeAnimalDocument(
  documentId: string,
  extension: DocumentExtension,
  bytes: Uint8Array,
): string {
  const directory = getManagedDirectory();
  directory.create({ idempotent: true, intermediates: true });

  const destination = new File(
    directory,
    `${getSafeDocumentId(documentId)}.${extension}`,
  );
  destination.write(bytes);

  return destination.uri;
}

export function getAnimalDocumentUri(document: string): string {
  const fileName = document.split("/").pop();
  return fileName ? new File(getManagedDirectory(), fileName).uri : document;
}

export function isManagedAnimalDocument(uri: string): boolean {
  const directoryUri = getManagedDirectory().uri.replace(/\/$/, "");
  if (!uri.startsWith(`${directoryUri}/`)) return false;

  const name = uri.slice(directoryUri.length + 1);
  return name.length > 0 && !name.includes("/");
}

export function readAnimalDocumentBytes(
  document: string,
): Promise<Uint8Array> | undefined {
  const file = new File(getAnimalDocumentUri(document));
  return file.exists ? file.bytes() : undefined;
}

export function deleteManagedAnimalDocument(document?: string): void {
  if (!document) return;

  const uri = getAnimalDocumentUri(document);
  if (!isManagedAnimalDocument(uri)) return;

  const file = new File(uri);
  if (file.exists) file.delete();
}

export function clearManagedAnimalDocuments(): void {
  const directory = getManagedDirectory();
  if (directory.exists) directory.delete();
}
