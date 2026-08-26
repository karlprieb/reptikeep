import {
  AlertDialog,
  Button,
  Column,
  DropdownMenu,
  DropdownMenuItem,
  Host,
  Icon,
  OutlinedButton,
  Row,
  Text,
  TextButton,
  Switch,
} from "@expo/ui/jetpack-compose";
import {
  clickable,
  defaultMinSize,
  fillMaxWidth,
  padding,
  semantics,
  toggleable,
  weight,
} from "@expo/ui/jetpack-compose/modifiers";
import { useValue } from "@legendapp/state/react";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useState } from "react";
import { AccessibilityInfo, ScrollView, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Spacing, type Theme } from "@/constants/theme";
import { composeTextStyle, SECTION_LABEL } from "@/constants/type-font-compose";
import { useTheme } from "@/hooks/use-theme";
import { animals$ } from "@/state/animal";
import { resetAppData } from "@/state/reset";
import {
  parseBackup,
  restoreBackup,
  shareBackup,
  type RestoredBackup,
} from "@/utils/backup";

import CHECK_ICON from "@/assets/images/icons/check.xml";

const ROW_MIN_HEIGHT = 64;
const ACTION_ICON_SIZE = 24;

const activityTables = [
  "feedings",
  "weights",
  "sheds",
  "defecations",
  "habitats",
  "medical",
] as const;

function withDocuments(
  sentence: string,
  documentSentence: string,
  documents: number,
): string {
  return documents > 0 ? `${sentence} ${documentSentence}` : sentence;
}

export default function BackupRestoreScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const animals = Object.values(useValue(animals$));
  const [exportAll, setExportAll] = useState(true);
  const [animalIds, setAnimalIds] = useState<string[]>([]);
  const [includePreferences, setIncludePreferences] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<RestoredBackup>();
  const [error, setError] = useState<string>();
  const [isAdvancedPresented, setIsAdvancedPresented] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<{
    file: File;
    summary: string;
  }>();
  const [showReset, setShowReset] = useState(false);

  const selectedAnimalIds = animalIds.filter((id) =>
    animals.some((animal) => animal.id === id),
  );
  const customSelection = selectedAnimalIds.length > 0 || includePreferences;
  const animalSelectionLabel =
    selectedAnimalIds.length === 0
      ? t("backup.animalsNone")
      : selectedAnimalIds.length === 1
        ? t("backup.animalsOne", {
            animalName: animals.find(
              (animal) => animal.id === selectedAnimalIds[0],
            )!.name,
          })
        : t("backup.animalsSelected", { count: selectedAnimalIds.length });

  const logBackupError = (operation: string, error: unknown) => {
    if (__DEV__) console.error(`Backup ${operation} failed`, error);
  };
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
    try {
      await shareBackup(
        exportAll
          ? undefined
          : { animalIds: selectedAnimalIds, includePreferences },
      );
    } catch (error) {
      logBackupError("export", error);
      setError(t("backup.error"));
    } finally {
      setBusy(false);
    }
  };

  const confirmRestore = async (candidate: File) => {
    setBusy(true);
    setError(undefined);
    try {
      const restored = await restoreBackup(candidate);
      setSuccess(restored);
      AccessibilityInfo.announceForAccessibility(successMessage(restored));
    } catch (error) {
      logBackupError("restore", error);
      setError(t("backup.restoreError"));
    } finally {
      setBusy(false);
    }
  };

  const chooseBackup = async () => {
    setError(undefined);
    setSuccess(undefined);
    try {
      setBusy(true);
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
        type: "application/zip",
      });
      if (result.canceled) return;
      const file = new File(result.assets[0].uri);
      const parsed = await parseBackup(file);
      const summary = {
        scopes: parsed.manifest.scopes,
        animals: Object.keys(parsed.data.animals ?? {}).length,
        records: activityTables.reduce(
          (count, table) =>
            count + Object.keys(parsed.data[table] ?? {}).length,
          0,
        ),
        documents: Object.keys(parsed.data.documents ?? {}).length,
      };
      setBusy(false);
      setPendingRestore({
        file,
        summary: withDocuments(
          t("backup.restoreMessage", { ...summary, count: summary.animals }),
          t("backup.documentsIncluded", { count: summary.documents }),
          summary.documents,
        ),
      });
    } catch {
      setError(t("backup.error"));
    } finally {
      setBusy(false);
    }
  };

  const askReset = () => setShowReset(true);

  const exportDisabled = busy || (!exportAll && !customSelection);

  return (
    <>
      <ScrollView
        style={[styles.scroll, { backgroundColor: theme.bg }]}
        contentContainerStyle={styles.content}
      >
        <Host
          style={styles.host}
          matchContents={{ horizontal: false, vertical: true }}
          seedColor={theme.primary}
        >
          <Column modifiers={[fillMaxWidth()]}>
            <SectionHeader theme={theme} title={t("backup.exportSection")} />
            <ToggleRow
              theme={theme}
              title={t("backup.exportAll")}
              hint={t("a11y.backup.exportAll")}
              checked={exportAll}
              onCheckedChange={setExportAll}
            />

            {!exportAll && animals.length > 0 ? (
              <AnimalMenu
                theme={theme}
                label={animalSelectionLabel}
                hint={t("a11y.backup.animals")}
                animals={animals.map((animal) => ({
                  id: animal.id,
                  name: animal.name,
                }))}
                selectedIds={animalIds}
                onToggle={(id, on) =>
                  setAnimalIds((current) =>
                    on
                      ? [...new Set([...current, id])]
                      : current.filter((value) => value !== id),
                  )
                }
              />
            ) : null}

            {!exportAll && animals.length === 0 ? (
              <SectionFooter theme={theme} text={t("backup.animalsEmpty")} />
            ) : null}

            {!exportAll ? (
              <ToggleRow
                theme={theme}
                title={t("backup.includePreferences")}
                hint={t("a11y.backup.preferences")}
                checked={includePreferences}
                onCheckedChange={setIncludePreferences}
              />
            ) : null}

            <Column
              modifiers={[
                fillMaxWidth(),
                padding(Spacing.lg, Spacing.sm, Spacing.lg, 0),
              ]}
            >
              <Button
                onClick={exportBackup}
                enabled={!exportDisabled}
                colors={{
                  containerColor: theme.primary,
                  contentColor: theme.onPrimary,
                  disabledContainerColor: theme.surfaceSunken,
                  disabledContentColor: theme.textMuted,
                }}
              >
                <Text style={composeTextStyle("body")}>
                  {busy ? t("backup.working") : t("backup.export")}
                </Text>
              </Button>
            </Column>
            <SectionFooter theme={theme} text={t("backup.exportFooter")} />

            <SectionHeader theme={theme} title={t("backup.restoreSection")} />
            <Column
              modifiers={[
                fillMaxWidth(),
                padding(Spacing.lg, Spacing.xs, Spacing.lg, 0),
              ]}
            >
              <OutlinedButton
                onClick={chooseBackup}
                enabled={!busy}
                colors={{
                  contentColor: theme.text,
                  disabledContentColor: theme.textMuted,
                }}
              >
                <Text style={composeTextStyle("body")}>
                  {busy ? t("backup.restoring") : t("backup.restore")}
                </Text>
              </OutlinedButton>
            </Column>
            <SectionFooter theme={theme} text={t("backup.restoreFooter")} />

            {error ? (
              <SectionFooter theme={theme} text={error} color={theme.danger} />
            ) : null}
            {success ? (
              <SectionFooter theme={theme} text={successMessage(success)} />
            ) : null}

            <ActionRow
              theme={theme}
              title={
                isAdvancedPresented
                  ? t("backup.hideAdvanced")
                  : t("backup.advanced")
              }
              hint={t("a11y.advancedSettings.hint")}
              onClick={() => setIsAdvancedPresented((value) => !value)}
            />

            {isAdvancedPresented ? (
              <>
                <ActionRow
                  theme={theme}
                  title={t("settings.reset")}
                  hint={t("a11y.resetData.hint")}
                  color={theme.danger}
                  onClick={askReset}
                />
                <SectionFooter theme={theme} text={t("settings.resetFooter")} />
              </>
            ) : null}
          </Column>
        </Host>
      </ScrollView>

      {pendingRestore ? (
        <View style={styles.dialogHost} pointerEvents="box-none">
          <Host matchContents seedColor={theme.primary}>
            <AlertDialog
              colors={{
                containerColor: theme.surface,
                titleContentColor: theme.text,
                textContentColor: theme.textSecondary,
              }}
              onDismissRequest={() => setPendingRestore(undefined)}
            >
              <AlertDialog.Title>
                <Text style={SECTION_LABEL} color={theme.text}>
                  {t("backup.restoreTitle")}
                </Text>
              </AlertDialog.Title>
              <AlertDialog.Text>
                <Text
                  style={composeTextStyle("body")}
                  color={theme.textSecondary}
                >
                  {pendingRestore.summary}
                </Text>
              </AlertDialog.Text>
              <AlertDialog.ConfirmButton>
                <TextButton
                  onClick={() => {
                    confirmRestore(pendingRestore.file);
                    setPendingRestore(undefined);
                  }}
                  colors={{ contentColor: theme.danger }}
                >
                  <Text style={composeTextStyle("body")}>
                    {t("backup.restoreConfirm")}
                  </Text>
                </TextButton>
              </AlertDialog.ConfirmButton>
              <AlertDialog.DismissButton>
                <TextButton
                  onClick={() => setPendingRestore(undefined)}
                  colors={{ contentColor: theme.textSecondary }}
                >
                  <Text style={composeTextStyle("body")}>
                    {t("settings.cancel")}
                  </Text>
                </TextButton>
              </AlertDialog.DismissButton>
            </AlertDialog>
          </Host>
        </View>
      ) : null}

      {showReset ? (
        <View style={styles.dialogHost} pointerEvents="box-none">
          <Host matchContents seedColor={theme.primary}>
            <AlertDialog
              colors={{
                containerColor: theme.surface,
                titleContentColor: theme.text,
                textContentColor: theme.textSecondary,
              }}
              onDismissRequest={() => setShowReset(false)}
            >
              <AlertDialog.Title>
                <Text style={SECTION_LABEL} color={theme.text}>
                  {t("settings.resetTitle")}
                </Text>
              </AlertDialog.Title>
              <AlertDialog.Text>
                <Text
                  style={composeTextStyle("body")}
                  color={theme.textSecondary}
                >
                  {t("settings.resetMessage")}
                </Text>
              </AlertDialog.Text>
              <AlertDialog.ConfirmButton>
                <TextButton
                  onClick={() => {
                    resetAppData();
                    setShowReset(false);
                  }}
                  colors={{ contentColor: theme.danger }}
                >
                  <Text style={composeTextStyle("body")}>
                    {t("settings.resetConfirm")}
                  </Text>
                </TextButton>
              </AlertDialog.ConfirmButton>
              <AlertDialog.DismissButton>
                <TextButton
                  onClick={() => setShowReset(false)}
                  colors={{ contentColor: theme.textSecondary }}
                >
                  <Text style={composeTextStyle("body")}>
                    {t("settings.cancel")}
                  </Text>
                </TextButton>
              </AlertDialog.DismissButton>
            </AlertDialog>
          </Host>
        </View>
      ) : null}
    </>
  );
}

function SectionHeader({ theme, title }: { theme: Theme; title: string }) {
  return (
    <Text
      style={SECTION_LABEL}
      color={theme.textSecondary}
      modifiers={[padding(Spacing.lg, Spacing.lg, Spacing.lg, Spacing.xs)]}
    >
      {title}
    </Text>
  );
}

function SectionFooter({
  theme,
  text,
  color,
}: {
  theme: Theme;
  text: string;
  color?: string;
}) {
  return (
    <Text
      style={composeTextStyle("bodyS")}
      color={color ?? theme.textSecondary}
      modifiers={[padding(Spacing.lg, Spacing.xs, Spacing.lg, 0)]}
    >
      {text}
    </Text>
  );
}

function ToggleRow({
  theme,
  title,
  hint,
  checked,
  onCheckedChange,
}: {
  theme: Theme;
  title: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <Row
      verticalAlignment="center"
      modifiers={[
        fillMaxWidth(),
        defaultMinSize({ minHeight: ROW_MIN_HEIGHT }),
        toggleable(checked, () => onCheckedChange(!checked), {
          role: "switch",
        }),
        semantics({
          contentDescription: [title, hint].filter(Boolean).join(", "),
          mergeDescendants: true,
        }),
        padding(Spacing.lg, Spacing.sm, Spacing.lg, Spacing.sm),
      ]}
    >
      <Column horizontalAlignment="start" modifiers={[weight(1)]}>
        <Text style={composeTextStyle("bodyL")} color={theme.text}>
          {title}
        </Text>
      </Column>
      <Switch
        value={checked}
        onCheckedChange={onCheckedChange}
        colors={{
          checkedThumbColor: theme.onPrimary,
          checkedTrackColor: theme.primary,
          uncheckedThumbColor: theme.textMuted,
          uncheckedTrackColor: theme.surfaceSunken,
          uncheckedBorderColor: theme.textMuted,
        }}
      />
    </Row>
  );
}

function ActionRow({
  theme,
  title,
  hint,
  color,
  onClick,
}: {
  theme: Theme;
  title: string;
  hint?: string;
  color?: string;
  onClick: () => void;
}) {
  return (
    <Row
      verticalAlignment="center"
      modifiers={[
        fillMaxWidth(),
        defaultMinSize({ minHeight: ROW_MIN_HEIGHT }),
        clickable(onClick),
        semantics({
          contentDescription: [title, hint].filter(Boolean).join(", "),
          role: "button",
          mergeDescendants: true,
        }),
        padding(Spacing.lg, Spacing.sm, Spacing.lg, Spacing.sm),
      ]}
    >
      <Text style={composeTextStyle("bodyL")} color={color ?? theme.text}>
        {title}
      </Text>
    </Row>
  );
}

function AnimalMenu({
  theme,
  label,
  hint,
  animals,
  selectedIds,
  onToggle,
}: {
  theme: Theme;
  label: string;
  hint: string;
  animals: { id: string; name: string }[];
  selectedIds: string[];
  onToggle: (id: string, on: boolean) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <DropdownMenu
      expanded={expanded}
      onDismissRequest={() => setExpanded(false)}
      color={theme.surface}
    >
      <DropdownMenu.Trigger>
        <Row
          verticalAlignment="center"
          modifiers={[
            fillMaxWidth(),
            defaultMinSize({ minHeight: ROW_MIN_HEIGHT }),
            clickable(() => setExpanded(true)),
            semantics({
              contentDescription: `${label}, ${hint}`,
              role: "dropdownList",
              mergeDescendants: true,
            }),
            padding(Spacing.lg, Spacing.sm, Spacing.lg, Spacing.sm),
          ]}
        >
          <Text style={composeTextStyle("bodyL")} color={theme.text}>
            {label}
          </Text>
        </Row>
      </DropdownMenu.Trigger>
      <DropdownMenu.Items>
        {animals.map((animal) => {
          const on = selectedIds.includes(animal.id);
          return (
            <DropdownMenuItem
              key={animal.id}
              onClick={() => onToggle(animal.id, !on)}
            >
              <DropdownMenuItem.Text>
                <Text style={SECTION_LABEL} color={theme.text}>
                  {animal.name}
                </Text>
              </DropdownMenuItem.Text>
              {on ? (
                <DropdownMenuItem.TrailingIcon>
                  <Icon
                    source={CHECK_ICON}
                    tint={theme.primary}
                    size={ACTION_ICON_SIZE}
                    contentDescription={t("a11y.selected")}
                  />
                </DropdownMenuItem.TrailingIcon>
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenu.Items>
    </DropdownMenu>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    width: "100%",
  },
  content: {
    paddingBottom: Spacing["2xl"],
  },
  host: {
    width: "100%",
  },
  dialogHost: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  },
});
