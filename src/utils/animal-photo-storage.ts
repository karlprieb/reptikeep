import { Directory, File, Paths } from "expo-file-system";

import { processAnimalPhoto } from "@/utils/image-processing";

export interface AnimalPhotoSource {
  uri: string;
}

const MANAGED_DIRECTORY_NAME = "animal-photos";
const MANAGED_EXTENSION = ".webp";
const STAGING_SUFFIX = ".staging";

function getManagedDirectory(): Directory {
  return new Directory(Paths.document, MANAGED_DIRECTORY_NAME);
}

export function managedAnimalPhotoUri(animalId: string): string {
  return new File(
    getManagedDirectory(),
    `${getSafeAnimalId(animalId)}${MANAGED_EXTENSION}`,
  ).uri;
}

function getSafeAnimalId(animalId: string): string {
  const safeAnimalId = animalId.replace(/[^a-z0-9_-]/gi, "");
  if (!safeAnimalId) throw new Error("Animal id cannot be used as a file name");
  return safeAnimalId;
}

function deleteCacheFile(uri: string): void {
  try {
    new File(uri).delete();
  } catch {}
}

export async function importAnimalPhoto(
  source: AnimalPhotoSource,
  animalId: string,
): Promise<string> {
  const processedUri = await processAnimalPhoto(source.uri);
  const directory = getManagedDirectory();
  directory.create({ idempotent: true, intermediates: true });

  const filename = `${getSafeAnimalId(animalId)}${MANAGED_EXTENSION}`;
  const stagingFile = new File(directory, `${filename}${STAGING_SUFFIX}`);
  const destination = new File(directory, filename);

  try {
    await new File(processedUri).copy(stagingFile, { overwrite: true });
    stagingFile.rename(filename);
    return destination.uri;
  } catch (error) {
    if (stagingFile.exists) stagingFile.delete();
    throw error;
  } finally {
    deleteCacheFile(processedUri);
  }
}

export function getAnimalPhotoUri(photo: string): string {
  const fileName = photo.split("/").pop();
  return fileName ? new File(getManagedDirectory(), fileName).uri : photo;
}

export function isManagedAnimalPhoto(uri: string): boolean {
  const directoryUri = getManagedDirectory().uri.replace(/\/$/, "");
  if (!uri.startsWith(`${directoryUri}/`)) return false;

  const name = uri.slice(directoryUri.length + 1);
  return name.length > 0 && !name.includes("/");
}

export function deleteManagedAnimalPhoto(uri?: string): void {
  if (!uri || !isManagedAnimalPhoto(uri)) return;

  const photo = new File(uri);
  if (photo.exists) photo.delete();
}

export function clearManagedAnimalPhotos(): void {
  const directory = getManagedDirectory();
  if (directory.exists) directory.delete();
}
