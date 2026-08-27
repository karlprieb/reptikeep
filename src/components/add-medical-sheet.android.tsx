import { useSelector as useValue } from "@legendapp/state/react";
import {
  Column,
  Host,
  Icon,
  IconButton,
  OutlinedTextField,
  Row,
  Text,
  TextButton,
  useNativeState,
} from "@expo/ui/jetpack-compose";
import { fillMaxWidth, weight } from "@expo/ui/jetpack-compose/modifiers";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Animated, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ACTION_ICON_SIZE,
  asEditOf,
  DateTimeField,
  fieldColors,
  FormSheetTopBar,
  formSheetAndroidStyles as styles,
  LABEL_LARGE,
  optionalText,
  Section,
  TOP_BAR_HEIGHT,
  useDraft,
  useScrollLift,
} from "@/components/form-sheet";
import { Spacing, StackAboveFontScale } from "@/constants/theme";
import { composeTextStyle } from "@/constants/type-font-compose";
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

import ATTACH_FILE_ICON from "@/assets/images/icons/attach-file.xml";
import DELETE_ICON from "@/assets/images/icons/delete.xml";

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
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
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
  const { lifted, onScroll } = useScrollLift();
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

  const iconSize = ACTION_ICON_SIZE * Math.min(fontScale, 2);
  const horizontalInset = Spacing.md * Math.min(fontScale, StackAboveFontScale);
  const visibleLinked = linked.filter(
    (document) => !removedIds.includes(document.id),
  );

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
            <Section
              title={t("medicalForm.timing")}
              footer={t("medicalForm.timingHint", { animalName })}
            >
              <DateTimeField
                label={t("medicalForm.when")}
                date={draft.occurredAt}
                onSelect={(occurredAt) => updateDraft({ occurredAt })}
                theme={theme}
                iconSize={iconSize}
                confirmLabel={t("newReptile.save")}
                dismissLabel={t("newReptile.cancel")}
                maxDate={new Date()}
              />
            </Section>

            <Section title={t("medicalForm.summary")}>
              <OutlinedTextField
                value={summaryText}
                onValueChange={(summary) => updateDraft({ summary })}
                colors={fieldColors(theme)}
                keyboardOptions={{ capitalization: "sentences" }}
                singleLine
                modifiers={[fillMaxWidth()]}
              >
                <OutlinedTextField.Label>
                  <Text>{t("medicalForm.summaryPlaceholder")}</Text>
                </OutlinedTextField.Label>
              </OutlinedTextField>
            </Section>

            <Section title={t("medicalForm.notes")}>
              <OutlinedTextField
                value={notesText}
                onValueChange={(notes) => updateDraft({ notes })}
                colors={fieldColors(theme)}
                keyboardOptions={{ capitalization: "sentences" }}
                singleLine={false}
                minLines={3}
                maxLines={4}
                modifiers={[fillMaxWidth()]}
              >
                <OutlinedTextField.Label>
                  <Text>{t("medicalForm.notesPlaceholder")}</Text>
                </OutlinedTextField.Label>
              </OutlinedTextField>
            </Section>

            <Section title={t("medicalForm.documents")}>
              {visibleLinked.map((document) => (
                <Row
                  key={document.id}
                  verticalAlignment="center"
                  horizontalArrangement="spaceBetween"
                  modifiers={[fillMaxWidth()]}
                >
                  <Text
                    style={composeTextStyle("body")}
                    color={theme.text}
                    modifiers={[weight(1)]}
                    maxLines={1}
                    overflow="ellipsis"
                  >
                    {document.title}
                  </Text>
                  <IconButton
                    onClick={() =>
                      confirmRemoveLinkedDocument(document.id, document.title)
                    }
                    colors={{ contentColor: theme.danger }}
                  >
                    <Icon
                      source={DELETE_ICON}
                      tint={theme.danger}
                      size={iconSize}
                      contentDescription={`${document.title}, ${t("medicalForm.removeDocument")}`}
                    />
                  </IconButton>
                </Row>
              ))}
              {pending.map((document, index) => (
                <Row
                  key={`${document.uri}-${index}`}
                  verticalAlignment="center"
                  horizontalArrangement="spaceBetween"
                  modifiers={[fillMaxWidth()]}
                >
                  <Text
                    style={composeTextStyle("body")}
                    color={theme.text}
                    modifiers={[weight(1)]}
                    maxLines={1}
                    overflow="ellipsis"
                  >
                    {document.title}
                  </Text>
                  <IconButton
                    onClick={() =>
                      setPending((items) =>
                        items.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    colors={{ contentColor: theme.danger }}
                  >
                    <Icon
                      source={DELETE_ICON}
                      tint={theme.danger}
                      size={iconSize}
                      contentDescription={`${document.title}, ${t("medicalForm.removeDocument")}`}
                    />
                  </IconButton>
                </Row>
              ))}
              {documentError || saveError ? (
                <Text style={composeTextStyle("body")} color={theme.danger}>
                  {documentError ?? saveError}
                </Text>
              ) : null}
              <TextButton
                onClick={handlePickFiles}
                colors={{ contentColor: theme.primary }}
              >
                <Row
                  verticalAlignment="center"
                  horizontalArrangement={{ spacedBy: Spacing["2xs"] }}
                >
                  <Icon
                    source={ATTACH_FILE_ICON}
                    tint={theme.primary}
                    size={iconSize}
                  />
                  <Text style={LABEL_LARGE}>
                    {t("medicalForm.addDocument")}
                  </Text>
                </Row>
              </TextButton>
            </Section>
          </Column>
        </Host>
      </Animated.ScrollView>

      <FormSheetTopBar
        namespace="medicalForm"
        editing={Boolean(activity)}
        saveDisabled={!canSave}
        onCancel={() => router.back()}
        onSave={() => void handleSave()}
        lifted={lifted}
        insetsTop={insets.top}
        iconSize={iconSize}
      />
    </View>
  );
}
