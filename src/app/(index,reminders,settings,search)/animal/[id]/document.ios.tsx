import {
  Button,
  DatePicker,
  Form,
  Host,
  Image,
  Menu,
  Picker,
  Section,
  Text,
  TextField,
  Toggle,
  VStack,
  useNativeState,
} from "@expo/ui/swift-ui";
import {
  accessibilityHint,
  accessibilityLabel,
  datePickerStyle,
  font,
  foregroundStyle,
  frame,
  listRowBackground,
  listRowInsets,
  pickerStyle,
  tag,
  textInputAutocapitalization,
} from "@expo/ui/swift-ui/modifiers";
import { useValue } from "@legendapp/state/react";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import {
  FormSectionFooter,
  FormSectionHeader,
  FormSheetChrome,
  useFormModifiers,
} from "@/components/form-sheet";
import { ThemedText } from "@/components/themed-text";
import { Spacing, type SFSymbolName } from "@/constants/theme";
import { typeFont } from "@/constants/type-font";
import { useTheme } from "@/hooks/use-theme";
import {
  addDocument,
  DOCUMENT_KINDS,
  documents$,
  newDocumentId,
  type AnimalDocument,
  type DocumentKind,
} from "@/state/document";
import {
  deleteManagedAnimalDocument,
  DocumentTooLargeError,
  getAnimalDocumentUri,
  importAnimalDocument,
  inspectDocumentSource,
  MAX_DOCUMENT_BYTES,
  readAnimalDocumentBytes,
  writeAnimalDocument,
  type DocumentExtension,
} from "@/utils/animal-document-storage";
import { fromCalendarDate, toCalendarDate } from "@/utils/format-date";
import { formatFileSize } from "@/utils/format-number";

const FILE_WELL_HEIGHT = 140;

const EXTENSION_SYMBOLS: Record<DocumentExtension, SFSymbolName> = {
  pdf: "doc.text",
  jpg: "photo",
  png: "photo",
  heic: "photo",
};

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

type DocumentFormSheetProps = {
  animalId: string;
  animalName: string;
  document?: AnimalDocument;
};

function DocumentFormSheet({
  animalId,
  animalName,
  document,
}: DocumentFormSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const modifiers = useFormModifiers();

  const existingName = document
    ? `${document.title || t("documents.form.chooseFile")}.${document.extension}`
    : undefined;

  const titleText = useNativeState(document?.title ?? "");
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
    try {
      const { extension, size } = inspectDocumentSource(uri);
      const displayName = name ?? uri.split("/").pop() ?? "";
      setPickedFile({ uri, name: displayName, extension, size });
      if (title.trim().length === 0) {
        const derived = stripExtension(displayName);
        if (derived) {
          setTitle(derived);
          titleText.set(derived);
        }
      }
    } catch (error) {
      if (error instanceof DocumentTooLargeError) {
        setFileError(
          t("documents.form.tooLarge", {
            limit: formatFileSize(MAX_DOCUMENT_BYTES),
            size: formatFileSize(error.size),
          }),
        );
      } else {
        setFileError(t("documents.form.unsupportedType"));
      }
    }
  };

  const handlePickFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    handlePicked(result.assets[0].uri, result.assets[0].name);
  };

  const handlePickPhotos = async () => {
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

    try {
      const id = document?.id ?? newDocumentId();
      let fileUri: string;
      let extension: DocumentExtension;
      let size: number;

      const previousUri = document
        ? getAnimalDocumentUri(document.file)
        : undefined;
      const previousBytes =
        pickedFile && document
          ? await readAnimalDocumentBytes(document.file)
          : undefined;
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
        return;
      }

      const record: AnimalDocument = {
        id,
        animalId,
        createdAt: document?.createdAt ?? new Date().toISOString(),
        title: title.trim(),
        kind: linkedToMedical ? "medical" : kind,
        issuedDate: knownIssueDate ? toCalendarDate(issueDate) : undefined,
        file: fileUri,
        extension,
        size,
        activityType: document?.activityType,
        activityId: document?.activityId,
      };

      try {
        addDocument(record);
      } catch (error) {
        if (pickedFile && previousUri === fileUri && previousBytes)
          writeAnimalDocument(document!.id, document!.extension, previousBytes);
        else if (pickedFile) deleteManagedAnimalDocument(fileUri);
        throw error;
      }

      if (pickedFile && previousUri && previousUri !== fileUri) {
        deleteManagedAnimalDocument(previousUri);
      }

      router.back();
    } catch {
      setSaveError(t("documents.form.saveError"));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const kindLabels: Record<DocumentKind, string> = Object.fromEntries(
    DOCUMENT_KINDS.map((value) => [value, t(`documents.kind.${value}`)]),
  ) as Record<DocumentKind, string>;

  const wellLabel = fileDisplay
    ? `${fileDisplay.name}, ${formatFileSize(fileDisplay.size)}`
    : t("documents.form.chooseFile");

  return (
    <>
      <FormSheetChrome
        namespace="documents.form"
        animalName={animalName}
        editing={Boolean(document)}
        saveDisabled={!canSave}
        onSave={handleConfirm}
      />

      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Host
          style={styles.host}
          useViewportSizeMeasurement
          seedColor={theme.primary}
        >
          <Form modifiers={modifiers.form}>
            <Section
              footer={
                fileError ? (
                  <FormSectionFooter color={theme.danger}>
                    {fileError}
                  </FormSectionFooter>
                ) : undefined
              }
            >
              <Menu
                label={
                  fileDisplay ? (
                    <VStack spacing={Spacing["2xs"]}>
                      <Image
                        systemName={EXTENSION_SYMBOLS[fileDisplay.extension]}
                        modifiers={[
                          font({ size: 28 }),
                          foregroundStyle(theme.textSecondary),
                        ]}
                      />
                      <Text
                        modifiers={[
                          typeFont("body"),
                          foregroundStyle(theme.text),
                        ]}
                      >
                        {fileDisplay.name}
                      </Text>
                      <Text
                        modifiers={[
                          typeFont("data"),
                          foregroundStyle(theme.textMuted),
                        ]}
                      >
                        {formatFileSize(fileDisplay.size)}
                      </Text>
                    </VStack>
                  ) : (
                    <VStack spacing={Spacing["2xs"]}>
                      <Image
                        systemName="doc.badge.plus"
                        modifiers={[
                          font({ size: 28 }),
                          foregroundStyle(theme.textSecondary),
                        ]}
                      />
                      <Text
                        modifiers={[
                          typeFont("bodyS"),
                          foregroundStyle(theme.textSecondary),
                        ]}
                      >
                        {t("documents.form.chooseFile")}
                      </Text>
                    </VStack>
                  )
                }
                modifiers={[
                  listRowBackground(theme.surfaceSunken),
                  listRowInsets({
                    top: 0,
                    leading: 0,
                    bottom: 0,
                    trailing: 0,
                  }),
                  frame({
                    maxWidth: Infinity,
                    minHeight: FILE_WELL_HEIGHT,
                    maxHeight: FILE_WELL_HEIGHT,
                    alignment: "center",
                  }),
                  accessibilityLabel(wellLabel),
                  accessibilityHint(t("a11y.documents.fileWell.hint")),
                ]}
              >
                <Button
                  label={t("documents.form.source.files")}
                  systemImage="folder"
                  onPress={handlePickFiles}
                  modifiers={[
                    accessibilityHint(t("a11y.documents.source.files.hint")),
                  ]}
                />
                <Button
                  label={t("documents.form.source.photos")}
                  systemImage="photo"
                  onPress={handlePickPhotos}
                  modifiers={[
                    accessibilityHint(t("a11y.documents.source.photos.hint")),
                  ]}
                />
                <Button
                  label={t("documents.form.source.camera")}
                  systemImage="camera"
                  onPress={handlePickCamera}
                  modifiers={[
                    accessibilityHint(t("a11y.documents.source.camera.hint")),
                  ]}
                />
              </Menu>
            </Section>

            <Section
              header={
                <FormSectionHeader>
                  {t("documents.form.details")}
                </FormSectionHeader>
              }
              modifiers={modifiers.row}
            >
              <TextField
                text={titleText}
                placeholder={t("documents.form.titleField")}
                onTextChange={setTitle}
                modifiers={[
                  accessibilityLabel(t("documents.form.titleField")),
                  textInputAutocapitalization("sentences"),
                ]}
              />
              {linkedToMedical ? (
                <Text>{t("documents.form.linkedMedicalKind")}</Text>
              ) : (
                <Picker
                  label={t("documents.form.kindField")}
                  selection={kind}
                  onSelectionChange={(value) => setKind(value as DocumentKind)}
                  modifiers={[
                    pickerStyle("menu"),
                    accessibilityHint(t("a11y.documents.kindPicker.hint")),
                  ]}
                >
                  {DOCUMENT_KINDS.map((value) => (
                    <Text key={value} modifiers={[tag(value)]}>
                      {kindLabels[value]}
                    </Text>
                  ))}
                </Picker>
              )}
              <Toggle
                label={t("documents.form.knownIssueDate")}
                isOn={knownIssueDate}
                onIsOnChange={setKnownIssueDate}
                modifiers={[
                  accessibilityHint(t("a11y.documents.issueDateToggle.hint")),
                ]}
              />
              {knownIssueDate ? (
                <DatePicker
                  title={t("documents.form.issueDate")}
                  selection={issueDate}
                  displayedComponents={["date"]}
                  onDateChange={setIssueDate}
                  modifiers={[datePickerStyle("compact")]}
                />
              ) : null}
            </Section>
          </Form>
        </Host>

        {saveError ? (
          <View style={[styles.saveError, { borderTopColor: theme.border }]}>
            <ThemedText
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              selectable
              type="bodyS"
              themeColor="danger"
            >
              {saveError}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </>
  );
}

export default function DocumentFormScreen() {
  const { animal } = useAnimalRoute();
  const { documentId } = useLocalSearchParams<{ documentId?: string }>();
  const documents = useValue(documents$);
  const candidate = documentId ? documents[documentId] : undefined;
  const document = candidate?.animalId === animal?.id ? candidate : undefined;

  if (!animal) return <AnimalNotFound />;

  return (
    <DocumentFormSheet
      animalId={animal.id}
      animalName={animal.name}
      document={document}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  host: {
    flex: 1,
  },
  saveError: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing["2xs"],
  },
});
