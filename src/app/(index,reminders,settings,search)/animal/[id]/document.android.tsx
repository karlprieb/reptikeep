import {
  Box,
  Column,
  DropdownMenu,
  DropdownMenuItem,
  Host,
  Icon,
  OutlinedTextField,
  Text,
  useNativeState,
} from "@expo/ui/jetpack-compose";
import {
  background,
  clickable,
  clip,
  fillMaxWidth,
  height,
  Shapes,
} from "@expo/ui/jetpack-compose/modifiers";
import { useValue } from "@legendapp/state/react";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Animated, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import {
  ACTION_ICON_SIZE,
  DateField,
  fieldColors,
  FormSheetTopBar,
  formSheetAndroidStyles as styles,
  MenuField,
  Section,
  SwitchRow,
  TOP_BAR_HEIGHT,
  useScrollLift,
} from "@/components/form-sheet";
import { Radius, Spacing, StackAboveFontScale } from "@/constants/theme";
import { composeTextStyle } from "@/constants/type-font-compose";
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

import ADD_ICON from "@/assets/images/icons/add.xml";
import DESCRIPTION_ICON from "@/assets/images/icons/description.xml";
import FOLDER_ICON from "@/assets/images/icons/folder.xml";
import PHOTO_CAMERA_ICON from "@/assets/images/icons/photo-camera.xml";
import PHOTO_ICON from "@/assets/images/icons/photo.xml";

const FILE_WELL_HEIGHT = 140;

const EXTENSION_ICONS: Record<DocumentExtension, typeof DESCRIPTION_ICON> = {
  pdf: DESCRIPTION_ICON,
  jpg: PHOTO_ICON,
  png: PHOTO_ICON,
  heic: PHOTO_ICON,
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

function DocumentFormSheet({ animalId, document }: DocumentFormSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const { lifted, onScroll } = useScrollLift();

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
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
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
    setSourceMenuOpen(false);
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    handlePicked(result.assets[0].uri, result.assets[0].name);
  };

  const handlePickPhotos = async () => {
    setSourceMenuOpen(false);
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
    setSourceMenuOpen(false);
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

  const wellLabel = fileDisplay
    ? `${fileDisplay.name}, ${formatFileSize(fileDisplay.size)}`
    : t("documents.form.chooseFile");

  const iconSize = ACTION_ICON_SIZE * Math.min(fontScale, 2);
  const horizontalInset = Spacing.md * Math.min(fontScale, StackAboveFontScale);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + TOP_BAR_HEIGHT * Math.min(fontScale, 1.5),
          paddingBottom: insets.bottom + Spacing["2xl"],
          paddingHorizontal: horizontalInset,
        }}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        <Host
          style={styles.host}
          matchContents={{ horizontal: false, vertical: true }}
          seedColor={theme.primary}
        >
          <Column
            verticalArrangement={{ spacedBy: Spacing.xl }}
            horizontalAlignment="start"
            modifiers={[fillMaxWidth()]}
          >
            <Section footerColor={theme.danger} footer={fileError}>
              <DropdownMenu
                expanded={sourceMenuOpen}
                onDismissRequest={() => setSourceMenuOpen(false)}
                color={theme.surface}
              >
                <DropdownMenu.Trigger>
                  <Box
                    modifiers={[
                      fillMaxWidth(),
                      height(FILE_WELL_HEIGHT),
                      clip(Shapes.RoundedCorner(Radius.lg)),
                      background(theme.surfaceSunken),
                      clickable(() => setSourceMenuOpen(true)),
                    ]}
                  >
                    <Column
                      horizontalAlignment="center"
                      verticalArrangement={{ spacedBy: Spacing["2xs"] }}
                    >
                      <Icon
                        source={
                          fileDisplay
                            ? EXTENSION_ICONS[fileDisplay.extension]
                            : ADD_ICON
                        }
                        tint={theme.textSecondary}
                        size={28}
                        contentDescription={wellLabel}
                      />
                      {fileDisplay ? (
                        <>
                          <Text
                            style={composeTextStyle("body")}
                            color={theme.text}
                            maxLines={1}
                            overflow="ellipsis"
                          >
                            {fileDisplay.name}
                          </Text>
                          <Text
                            style={composeTextStyle("data")}
                            color={theme.textMuted}
                          >
                            {formatFileSize(fileDisplay.size)}
                          </Text>
                        </>
                      ) : (
                        <Text
                          style={composeTextStyle("bodyS")}
                          color={theme.textSecondary}
                        >
                          {t("documents.form.chooseFile")}
                        </Text>
                      )}
                    </Column>
                  </Box>
                </DropdownMenu.Trigger>
                <DropdownMenu.Items>
                  <DropdownMenuItem onClick={() => void handlePickFiles()}>
                    <DropdownMenuItem.Text>
                      <Text style={composeTextStyle("body")} color={theme.text}>
                        {t("documents.form.source.files")}
                      </Text>
                    </DropdownMenuItem.Text>
                    <DropdownMenuItem.LeadingIcon>
                      <Icon
                        source={FOLDER_ICON}
                        tint={theme.text}
                        size={iconSize}
                      />
                    </DropdownMenuItem.LeadingIcon>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handlePickPhotos()}>
                    <DropdownMenuItem.Text>
                      <Text style={composeTextStyle("body")} color={theme.text}>
                        {t("documents.form.source.photos")}
                      </Text>
                    </DropdownMenuItem.Text>
                    <DropdownMenuItem.LeadingIcon>
                      <Icon
                        source={PHOTO_ICON}
                        tint={theme.text}
                        size={iconSize}
                      />
                    </DropdownMenuItem.LeadingIcon>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handlePickCamera()}>
                    <DropdownMenuItem.Text>
                      <Text style={composeTextStyle("body")} color={theme.text}>
                        {t("documents.form.source.camera")}
                      </Text>
                    </DropdownMenuItem.Text>
                    <DropdownMenuItem.LeadingIcon>
                      <Icon
                        source={PHOTO_CAMERA_ICON}
                        tint={theme.text}
                        size={iconSize}
                      />
                    </DropdownMenuItem.LeadingIcon>
                  </DropdownMenuItem>
                </DropdownMenu.Items>
              </DropdownMenu>
            </Section>

            <Section title={t("documents.form.details")}>
              <OutlinedTextField
                value={titleText}
                onValueChange={(value) => setTitle(value)}
                colors={fieldColors(theme)}
                keyboardOptions={{ capitalization: "sentences" }}
                singleLine
                modifiers={[fillMaxWidth()]}
              >
                <OutlinedTextField.Label>
                  <Text>{t("documents.form.titleField")}</Text>
                </OutlinedTextField.Label>
              </OutlinedTextField>

              {linkedToMedical ? (
                <Text style={composeTextStyle("body")} color={theme.text}>
                  {t("documents.form.linkedMedicalKind")}
                </Text>
              ) : (
                <MenuField
                  label={t("documents.form.kindField")}
                  value={t(`documents.kind.${kind}`)}
                  theme={theme}
                  iconSize={iconSize}
                  items={DOCUMENT_KINDS.map((value) => ({
                    value,
                    label: t(`documents.kind.${value}`),
                    selected: value === kind,
                  }))}
                  onSelect={setKind}
                />
              )}

              <SwitchRow
                label={t("documents.form.knownIssueDate")}
                checked={knownIssueDate}
                onCheckedChange={setKnownIssueDate}
                theme={theme}
              />

              {knownIssueDate ? (
                <DateField
                  label={t("documents.form.issueDate")}
                  date={issueDate}
                  onSelect={setIssueDate}
                  theme={theme}
                  iconSize={iconSize}
                  confirmLabel={t("newReptile.save")}
                  dismissLabel={t("newReptile.cancel")}
                />
              ) : null}
            </Section>
          </Column>
        </Host>
      </Animated.ScrollView>

      <FormSheetTopBar
        namespace="documents.form"
        editing={Boolean(document)}
        saveDisabled={!canSave}
        onCancel={() => router.back()}
        onSave={() => void handleConfirm()}
        lifted={lifted}
        insetsTop={insets.top}
        iconSize={iconSize}
      />

      {saveError ? (
        <View
          style={[
            documentFormStyles.saveError,
            { borderTopColor: theme.border, bottom: insets.bottom },
          ]}
        >
          <Text style={composeTextStyle("bodyS")} color={theme.danger}>
            {saveError}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function DocumentFormScreen() {
  const { animal } = useAnimalRoute();
  const { documentId } = useLocalSearchParams<{ documentId?: string }>();
  const documents = useValue(documents$);
  const candidate = documentId ? documents[documentId] : undefined;
  const document = candidate?.animalId === animal?.id ? candidate : undefined;

  if (!animal || (documentId && !document)) return <AnimalNotFound />;

  return (
    <DocumentFormSheet
      animalId={animal.id}
      animalName={animal.name}
      document={document}
    />
  );
}

const documentFormStyles = {
  saveError: {
    position: "absolute" as const,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
};
