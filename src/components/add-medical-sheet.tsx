import { Host } from "@expo/ui";
import {
  Button,
  DatePicker,
  Form,
  Section,
  Text,
  TextField,
  useNativeState,
} from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  datePickerStyle,
  foregroundStyle,
  lineLimit,
  textInputAutocapitalization,
} from "@expo/ui/swift-ui/modifiers";
import { useValue } from "@legendapp/state/react";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";

import {
  asEditOf,
  FormSectionFooter,
  FormSectionHeader,
  FormSheetChrome,
  formSheetStyles as styles,
  optionalText,
  useDraft,
  useFormModifiers,
} from "@/components/form-sheet";
import { useTheme } from "@/hooks/use-theme";
import {
  createMedicalActivity,
  saveMedicalActivity,
  type MedicalActivity,
  type PendingMedicalDocument,
} from "@/state/medical";
import { documents$, documentsForActivity } from "@/state/document";
import {
  DocumentTooLargeError,
  inspectDocumentSource,
  MAX_DOCUMENT_BYTES,
} from "@/utils/animal-document-storage";
import { formatFileSize } from "@/utils/format-number";

type AddMedicalSheetProps = {
  animalId: string;
  animalName: string;
  activity?: MedicalActivity;
};

type MedicalDraft = { occurredAt: Date; summary: string; notes: string };

function initialDraft(activity?: MedicalActivity): MedicalDraft {
  return {
    occurredAt: activity ? new Date(activity.occurredAt) : new Date(),
    summary: activity?.summary ?? "",
    notes: activity?.notes ?? "",
  };
}

export function AddMedicalSheet({
  animalId,
  animalName,
  activity,
}: AddMedicalSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const modifiers = useFormModifiers();
  const [draft, updateDraft] = useDraft(() => initialDraft(activity));
  const summaryText = useNativeState(activity?.summary ?? "");
  const notesText = useNativeState(activity?.notes ?? "");
  const allDocuments = useValue(documents$);
  const linked = activity
    ? documentsForActivity("medical", activity.id, allDocuments)
    : [];
  const [pending, setPending] = useState<PendingMedicalDocument[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [documentError, setDocumentError] = useState<string>();
  const [saveError, setSaveError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const canSave = draft.summary.trim().length > 0 && !saving;

  const handlePickFiles = async () => {
    setDocumentError(undefined);
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled) return;

    try {
      const additions = result.assets.map((asset) => {
        const inspected = inspectDocumentSource(asset.uri);
        return {
          uri: asset.uri,
          title: asset.name.replace(/\.[^./]+$/, ""),
          extension: inspected.extension,
        };
      });
      setPending((current) => [...current, ...additions]);
    } catch (error) {
      setDocumentError(
        error instanceof DocumentTooLargeError
          ? t("medicalForm.documentTooLarge", {
              limit: formatFileSize(MAX_DOCUMENT_BYTES),
              size: formatFileSize(error.size),
            })
          : t("medicalForm.unsupportedDocument"),
      );
    }
  };

  const handleSave = async () => {
    if (!canSave || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(undefined);
    try {
      const record = createMedicalActivity({
        animalId,
        occurredAt: draft.occurredAt.toISOString(),
        summary: draft.summary,
        notes: optionalText(draft.notes),
      });
      await saveMedicalActivity(
        activity ? asEditOf(record, activity) : record,
        pending,
        removedIds,
      );
      router.back();
    } catch {
      setSaveError(t("medicalForm.saveError"));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const confirmRemoveLinkedDocument = (id: string, title: string) =>
    Alert.alert(
      t("medicalForm.removeDocumentTitle", { title }),
      t("medicalForm.removeDocumentMessage"),
      [
        { text: t("medicalForm.cancel"), style: "cancel" },
        {
          text: t("medicalForm.removeDocumentConfirm"),
          style: "destructive",
          onPress: () => setRemovedIds((ids) => [...ids, id]),
        },
      ],
    );

  return (
    <>
      <FormSheetChrome
        namespace="medicalForm"
        animalName={animalName}
        editing={Boolean(activity)}
        saveDisabled={!canSave}
        onSave={handleSave}
      />
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Host
          style={styles.host}
          useViewportSizeMeasurement
          seedColor={theme.primary}
        >
          <Form modifiers={modifiers.form}>
            <Section
              header={
                <FormSectionHeader>{t("medicalForm.timing")}</FormSectionHeader>
              }
              footer={
                <FormSectionFooter>
                  {t("medicalForm.timingHint", { animalName })}
                </FormSectionFooter>
              }
              modifiers={modifiers.row}
            >
              <DatePicker
                title={t("medicalForm.when")}
                selection={draft.occurredAt}
                range={{ end: new Date() }}
                displayedComponents={["date", "hourAndMinute"]}
                onDateChange={(occurredAt) => updateDraft({ occurredAt })}
                modifiers={[datePickerStyle("compact")]}
              />
            </Section>
            <Section
              header={
                <FormSectionHeader>
                  {t("medicalForm.summary")}
                </FormSectionHeader>
              }
              modifiers={modifiers.row}
            >
              <TextField
                text={summaryText}
                placeholder={t("medicalForm.summaryPlaceholder")}
                onTextChange={(summary) => updateDraft({ summary })}
                modifiers={[
                  accessibilityLabel(t("medicalForm.summary")),
                  textInputAutocapitalization("sentences"),
                ]}
              />
            </Section>
            <Section
              header={
                <FormSectionHeader>{t("medicalForm.notes")}</FormSectionHeader>
              }
              modifiers={modifiers.row}
            >
              <TextField
                text={notesText}
                placeholder={t("medicalForm.notesPlaceholder")}
                axis="vertical"
                onTextChange={(notes) => updateDraft({ notes })}
                modifiers={[
                  accessibilityLabel(t("medicalForm.notes")),
                  lineLimit(4, { reservesSpace: true }),
                  textInputAutocapitalization("sentences"),
                ]}
              />
            </Section>
            <Section
              header={
                <FormSectionHeader>
                  {t("medicalForm.documents")}
                </FormSectionHeader>
              }
              modifiers={modifiers.row}
            >
              {linked
                .filter((document) => !removedIds.includes(document.id))
                .map((document) => (
                  <Button
                    key={document.id}
                    onPress={() =>
                      confirmRemoveLinkedDocument(document.id, document.title)
                    }
                    modifiers={[
                      accessibilityLabel(
                        `${document.title}, ${t("medicalForm.removeDocument")}`,
                      ),
                    ]}
                  >
                    <Text>{document.title}</Text>
                    <Text modifiers={[foregroundStyle(theme.danger)]}>
                      {t("medicalForm.removeDocument")}
                    </Text>
                  </Button>
                ))}
              {pending.map((document, index) => (
                <Button
                  key={`${document.uri}-${index}`}
                  onPress={() =>
                    setPending((items) =>
                      items.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  modifiers={[
                    accessibilityLabel(
                      `${document.title}, ${t("medicalForm.removeDocument")}`,
                    ),
                  ]}
                >
                  <Text>{document.title}</Text>
                  <Text modifiers={[foregroundStyle(theme.danger)]}>
                    {t("medicalForm.removeDocument")}
                  </Text>
                </Button>
              ))}
              {documentError || saveError ? (
                <Text modifiers={[foregroundStyle(theme.danger)]}>
                  {documentError ?? saveError}
                </Text>
              ) : null}
              <Button
                onPress={handlePickFiles}
                modifiers={[accessibilityLabel(t("medicalForm.addDocument"))]}
              >
                <Text>{t("medicalForm.addDocument")}</Text>
              </Button>
            </Section>
          </Form>
        </Host>
      </View>
    </>
  );
}
