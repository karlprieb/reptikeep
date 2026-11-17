import { Host } from "@expo/ui";
import {
  Button,
  DatePicker,
  Form,
  Picker,
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
  pickerStyle,
  tag,
  textInputAutocapitalization,
} from "@expo/ui/swift-ui/modifiers";
import { useValue } from "@legendapp/state/react";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";

import {
  FormSectionFooter,
  FormSectionHeader,
  FormSheetChrome,
  useFormModifiers,
} from "@/components/form-sheet";
import { formSheetStyles as styles } from "@/constants/form-sheet-ios";
import { asEditOf, optionalText, useDraft } from "@/utils/form-sheet-shared";
import { useFeedingLink } from "@/hooks/use-feeding-link";
import { REGURGITATION_WINDOW_DAYS } from "@/utils/regurgitation";
import { useTheme } from "@/hooks/use-theme";
import {
  createMedicalActivity,
  type MedicalKind,
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
  kind?: MedicalKind;
  feedingId?: string;
};

type MedicalDraft = { occurredAt: Date; summary: string; notes: string };

function initialDraft(
  initialSummary: string,
  activity?: MedicalActivity,
): MedicalDraft {
  return {
    occurredAt: activity ? new Date(activity.occurredAt) : new Date(),
    summary: initialSummary,
    notes: activity?.notes ?? "",
  };
}

export function AddMedicalSheet({
  animalId,
  animalName,
  activity,
  kind = "general",
  feedingId,
}: AddMedicalSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const modifiers = useFormModifiers();
  const initialSummary =
    activity?.summary ??
    (kind === "regurgitation" ? t("medicalForm.kind.regurgitation") : "");
  const [draft, updateDraft] = useDraft(() =>
    initialDraft(initialSummary, activity),
  );
  const feeding = useFeedingLink(
    animalId,
    draft.occurredAt,
    feedingId,
    !activity && kind === "regurgitation",
    activity?.id,
  );
  const summaryText = useNativeState(initialSummary);
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
    const record = createMedicalActivity({
      animalId,
      occurredAt: draft.occurredAt.toISOString(),
      summary: draft.summary,
      notes: optionalText(draft.notes),
      kind,
      feedingId: feeding.feedingId,
    });
    savingRef.current = true;
    setSaving(true);
    setSaveError(undefined);
    const saved = saveMedicalActivity(
      activity ? asEditOf(record, activity) : record,
      pending,
      removedIds,
    );
    try {
      await saved;
      router.back();
    } catch {
      setSaveError(t("medicalForm.saveError"));
    }
    savingRef.current = false;
    setSaving(false);
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
            {kind === "regurgitation" ? (
              <Section
                header={
                  <FormSectionHeader>
                    {t("medicalForm.feeding")}
                  </FormSectionHeader>
                }
                footer={
                  <FormSectionFooter>
                    {t("medicalForm.feedingHint", {
                      days: REGURGITATION_WINDOW_DAYS,
                    })}
                  </FormSectionFooter>
                }
                modifiers={modifiers.row}
              >
                <Picker
                  label={t("medicalForm.feedingLabel")}
                  selection={feeding.selected}
                  onSelectionChange={(value) =>
                    feeding.setSelected(value as string)
                  }
                  modifiers={[
                    pickerStyle("menu"),
                    accessibilityLabel(t("medicalForm.feedingLabel")),
                  ]}
                >
                  {feeding.choices.map((choice) => (
                    <Text key={choice.value} modifiers={[tag(choice.value)]}>
                      {choice.label}
                    </Text>
                  ))}
                </Picker>
              </Section>
            ) : null}
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
                  key={document.uri}
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
