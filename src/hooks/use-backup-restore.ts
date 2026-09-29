import { useValue } from "@legendapp/state/react";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useTranslation } from "react-i18next";

import { animals$ } from "@/state/animal";
import {
  cleanupBackupArchive,
  createBackup,
  parseBackup,
  restoreBackup,
  shareBackup,
  type RestoredBackup,
} from "@/utils/backup";

type Progress = "export" | "inspect" | "restore";

const activityTables = [
  "feedings",
  "weights",
  "sheds",
  "defecations",
  "habitats",
  "medical",
] as const;

const PROGRESS_COPY: Record<Progress, string> = {
  export: "exporting",
  inspect: "inspecting",
  restore: "restoring",
};

function withDocuments(
  sentence: string,
  documentSentence: string,
  documents: number,
): string {
  return documents > 0 ? `${sentence} ${documentSentence}` : sentence;
}

function summarizeBackup(parsed: Awaited<ReturnType<typeof parseBackup>>) {
  return {
    scopes: parsed.manifest.scopes,
    animals: Object.keys(parsed.data.animals ?? {}).length,
    records: activityTables.reduce(
      (count, table) => count + Object.keys(parsed.data[table] ?? {}).length,
      0,
    ),
    documents: Object.keys(parsed.data.documents ?? {}).length,
  };
}

function logBackupError(operation: string, error: unknown) {
  if (__DEV__) console.error(`Backup ${operation} failed`, error);
}

export function useBackupRestore() {
  const { t } = useTranslation();
  const animals = Object.values(useValue(animals$));
  const [exportAll, setExportAll] = useState(true);
  const [animalIds, setAnimalIds] = useState<string[]>([]);
  const [includePreferences, setIncludePreferences] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress>();
  const [success, setSuccess] = useState<RestoredBackup>();
  const [error, setError] = useState<string>();

  const selectedIds = new Set(animalIds);
  const selectedAnimals = animals.filter((animal) =>
    selectedIds.has(animal.id),
  );
  const customSelection = selectedAnimals.length > 0 || includePreferences;

  const animalSelectionLabel = (() => {
    if (selectedAnimals.length === 0) return t("backup.animalsNone");
    if (selectedAnimals.length === 1) {
      return t("backup.animalsOne", { animalName: selectedAnimals[0].name });
    }
    return t("backup.animalsSelected", { count: selectedAnimals.length });
  })();

  const successMessage = (restored: RestoredBackup) =>
    withDocuments(
      t("backup.success", { ...restored, count: restored.animals }),
      t("backup.documentsRestored", { count: restored.documents }),
      restored.documents,
    );

  const exportBackup = async () => {
    setBusy(true);
    setError(undefined);
    setSuccess(undefined);
    setProgress("export");
    AccessibilityInfo.announceForAccessibility(t("backup.exportingTitle"));
    const options = exportAll
      ? undefined
      : {
          animalIds: selectedAnimals.map((animal) => animal.id),
          includePreferences,
        };
    let archive: File | undefined;
    try {
      archive = await createBackup(options);
      setProgress(undefined);
      await shareBackup(archive);
    } catch (error) {
      logBackupError("export", error);
      setError(t("backup.error"));
    }
    setProgress(undefined);
    setBusy(false);
    if (archive) cleanupBackupArchive(archive);
  };

  const confirmRestore = async (candidate: File) => {
    setBusy(true);
    setError(undefined);
    setProgress("restore");
    AccessibilityInfo.announceForAccessibility(t("backup.restoringTitle"));
    try {
      const restored = await restoreBackup(candidate);
      setSuccess(restored);
      AccessibilityInfo.announceForAccessibility(successMessage(restored));
    } catch (error) {
      logBackupError("restore", error);
      setError(t("backup.restoreError"));
    }
    setProgress(undefined);
    setBusy(false);
  };

  const chooseBackup = async (
    onInspected: (file: File, message: string) => void,
  ) => {
    setError(undefined);
    setSuccess(undefined);
    try {
      setBusy(true);
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
        type: "application/zip",
      });
      if (!result.canceled) {
        const file = new File(result.assets[0].uri);
        setProgress("inspect");
        AccessibilityInfo.announceForAccessibility(t("backup.inspectingTitle"));
        const summary = summarizeBackup(await parseBackup(file));
        setProgress(undefined);
        onInspected(
          file,
          withDocuments(
            t("backup.restoreMessage", { ...summary, count: summary.animals }),
            t("backup.documentsIncluded", { count: summary.documents }),
            summary.documents,
          ),
        );
      }
    } catch {
      setError(t("backup.error"));
    }
    setProgress(undefined);
    setBusy(false);
  };

  return {
    animals,
    exportAll,
    setExportAll,
    animalIds,
    setAnimalIds,
    includePreferences,
    setIncludePreferences,
    busy,
    progress,
    success,
    error,
    customSelection,
    animalSelectionLabel,
    successMessage,
    exportBackup,
    confirmRestore,
    chooseBackup,
    copy: progress ? PROGRESS_COPY[progress] : PROGRESS_COPY.restore,
  };
}
