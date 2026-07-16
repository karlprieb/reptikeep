import { Directory, File, Paths } from "expo-file-system";

export interface AnimalPhotoSource {
  uri: string;
}

const MANAGED_DIRECTORY_NAME = "animal-photos";
const FALLBACK_EXTENSION = ".jpg";

function getManagedDirectory(): Directory {
  return new Directory(Paths.document, MANAGED_DIRECTORY_NAME);
}

function getPhotoExtension(source: AnimalPhotoSource): string {
  return Paths.extname(source.uri).toLowerCase() || FALLBACK_EXTENSION;
}

function getSafeAnimalId(animalId: string): string {
  const safeAnimalId = animalId.replace(/[^a-z0-9_-]/gi, "");
  if (!safeAnimalId) throw new Error("Animal id cannot be used as a file name");
  return safeAnimalId;
}

export async function importAnimalPhoto(
  source: AnimalPhotoSource,
  animalId: string,
): Promise<string> {
  const directory = getManagedDirectory();
  directory.create({ idempotent: true, intermediates: true });

  const destination = new File(
    directory,
    `${getSafeAnimalId(animalId)}${getPhotoExtension(source)}`,
  );

  try {
    await new File(source.uri).copy(destination, { overwrite: true });
  } catch (error) {
    if (destination.exists) destination.delete();
    throw error;
  }

  return destination.uri;
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
