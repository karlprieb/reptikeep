import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { type AnimalDocument, type DocumentKind } from "@/state/document";
import {
  DocumentTooLargeError,
  MAX_DOCUMENT_BYTES,
  type DocumentExtension,
} from "@/utils/animal-document-storage";
import {
  saveAnimalDocument,
  tryInspectDocumentSource,
} from "@/utils/animal-document-save";
import { fromCalendarDate, toCalendarDate } from "@/utils/format-date";
import { formatFileSize } from "@/utils/format-number";

type PickedFile = {
  uri: string;
  name: string;
  extension: DocumentExtension;
  size: number;
};

function toDate(stored?: string): Date {
  return (stored ? fromCalendarDate(stored) : null) ?? new Date();
}

function stripExtension(name: string): string {
  return name.replace(/\.[^./]+$/, "");
}

type UseDocumentFormOptions = {
  animalId: string;
  document?: AnimalDocument;
  onTitleDerived: (title: string) => void;
  onPickStart?: () => void;
};

export function useDocumentForm({
  animalId,
  document,
  onTitleDerived,
  onPickStart,
}: UseDocumentFormOptions) {
  const { t } = useTranslation();

  const existingName = document
    ? `${document.title || t("documents.form.chooseFile")}.${document.extension}`
    : undefined;

  const [title, setTitle] = useState(document?.title ?? "");
  const linkedToMedical = document?.activityType === "medical";
  const [kind, setKind] = useState<DocumentKind>(
    linkedToMedical ? "medical" : (document?.kind ?? "invoice"),
  );
  const [knownIssueDate, setKnownIssueDate] = useState(
    Boolean(document?.issuedDate),
  );
  const [issueDate, setIssueDate] = useState(() =>
    toDate(document?.issuedDate),
  );
  const [pickedFile, setPickedFile] = useState<PickedFile>();
  const [fileError, setFileError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const savingRef = useRef(false);

  const fileDisplay = pickedFile
    ? {
        name: pickedFile.name,
        size: pickedFile.size,
        extension: pickedFile.extension,
      }
    : document
      ? {
          name: existingName!,
          size: document.size,
          extension: document.extension,
        }
      : undefined;

  const hasFile = Boolean(fileDisplay);
  const canSave = hasFile && title.trim().length > 0 && !fileError && !isSaving;

  const handlePicked = (uri: string, name?: string) => {
    setFileError(undefined);
    const inspected = tryInspectDocumentSource(uri);
    if ("error" in inspected) {
      const failure = inspected.error;
      if (failure instanceof DocumentTooLargeError) {
        setFileError(
          t("documents.form.tooLarge", {
            limit: formatFileSize(MAX_DOCUMENT_BYTES),
            size: formatFileSize(failure.size),
          }),
        );
      } else {
        setFileError(t("documents.form.unsupportedType"));
      }
      return;
    }
    const { extension, size } = inspected.source;
    const displayName = name ?? uri.split("/").pop() ?? "";
    setPickedFile({ uri, name: displayName, extension, size });
    if (title.trim().length === 0) {
      const derived = stripExtension(displayName);
      if (derived) {
        setTitle(derived);
        onTitleDerived(derived);
      }
    }
  };

  const handlePickFiles = async () => {
    onPickStart?.();
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    handlePicked(result.assets[0].uri, result.assets[0].name);
  };

  const handlePickPhotos = async () => {
    onPickStart?.();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (asset) handlePicked(asset.uri, asset.fileName ?? undefined);
  };

  const handlePickCamera = async () => {
    onPickStart?.();
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (asset) handlePicked(asset.uri, asset.fileName ?? undefined);
  };

  const handleConfirm = async () => {
    if (!canSave || savingRef.current) return;

    savingRef.current = true;
    setIsSaving(true);
    setSaveError(undefined);

    const saved = saveAnimalDocument({
      animalId,
      document,
      pickedFile,
      title: title.trim(),
      kind: linkedToMedical ? "medical" : kind,
      issuedDate: knownIssueDate ? toCalendarDate(issueDate) : undefined,
    });
    try {
      await saved;
      router.back();
    } catch {
      setSaveError(t("documents.form.saveError"));
    }
    savingRef.current = false;
    setIsSaving(false);
  };

  const wellLabel = fileDisplay
    ? `${fileDisplay.name}, ${formatFileSize(fileDisplay.size)}`
    : t("documents.form.chooseFile");

  return {
    title,
    setTitle,
    kind,
    setKind,
    knownIssueDate,
    setKnownIssueDate,
    issueDate,
    setIssueDate,
    fileError,
    fileDisplay,
    wellLabel,
    canSave,
    isSaving,
    saveError,
    linkedToMedical,
    handlePickFiles,
    handlePickPhotos,
    handlePickCamera,
    handleConfirm,
  };
}
