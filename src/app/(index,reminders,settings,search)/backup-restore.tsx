import {
  Button,
  Form,
  Host,
  Menu,
  Section,
  Text,
  Toggle,
} from "@expo/ui/swift-ui";
import {
  accessibilityHint,
  disabled,
  foregroundStyle,
  listRowBackground,
  menuActionDismissBehavior,
} from "@expo/ui/swift-ui/modifiers";
import { useValue } from "@legendapp/state/react";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useState } from "react";
import { AccessibilityInfo, Alert, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import { useFormModifiers } from "@/components/form-sheet";
import { useTheme } from "@/hooks/use-theme";
import { animals$ } from "@/state/animal";
import {
  parseBackup,
  restoreBackup,
  shareBackup,
  type RestoredBackup,
} from "@/utils/backup";

const activityTables = [
  "feedings",
  "weights",
  "sheds",
  "defecations",
  "habitats",
] as const;

export default function BackupRestoreScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const formModifiers = useFormModifiers();
  const animals = Object.values(useValue(animals$));
  const [exportAll, setExportAll] = useState(true);
  const [animalIds, setAnimalIds] = useState<string[]>([]);
  const [includePreferences, setIncludePreferences] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<RestoredBackup>();
  const [error, setError] = useState<string>();
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
      };
      setBusy(false);
      Alert.alert(
        t("backup.restoreTitle"),
        t("backup.restoreMessage", {
          ...summary,
          count: summary.animals,
        }),
        [
          { text: t("settings.cancel"), style: "cancel" },
          {
            text: t("backup.restoreConfirm"),
            style: "destructive",
            onPress: () => confirmRestore(file),
          },
        ],
      );
    } catch (error) {
      logBackupError("parse", error);
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
      AccessibilityInfo.announceForAccessibility(
        t("backup.success", { ...restored, count: restored.animals }),
      );
    } catch (error) {
      logBackupError("restore", error);
      setError(t("backup.restoreError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Host style={styles.host} useViewportSizeMeasurement>
      <Form modifiers={formModifiers.form}>
        <Section
          header={
            <Text modifiers={[foregroundStyle(theme.textSecondary)]}>
              {t("backup.exportSection")}
            </Text>
          }
          footer={
            <Text modifiers={[foregroundStyle(theme.textSecondary)]}>
              {t("backup.exportFooter")}
            </Text>
          }
        >
          <Toggle
            label={t("backup.exportAll")}
            isOn={exportAll}
            onIsOnChange={setExportAll}
            modifiers={[
              listRowBackground(theme.surface),
              accessibilityHint(t("a11y.backup.exportAll")),
            ]}
          />
          {!exportAll &&
            (animals.length ? (
              <Menu
                label={animalSelectionLabel}
                systemImage="checklist"
                modifiers={[
                  listRowBackground(theme.surface),
                  menuActionDismissBehavior("disabled"),
                  accessibilityHint(t("a11y.backup.animals")),
                ]}
              >
                {animals.map((animal) => (
                  <Toggle
                    key={animal.id}
                    label={animal.name}
                    isOn={animalIds.includes(animal.id)}
                    onIsOnChange={(on) =>
                      setAnimalIds((current) =>
                        on
                          ? [...new Set([...current, animal.id])]
                          : current.filter((id) => id !== animal.id),
                      )
                    }
                    modifiers={[
                      accessibilityHint(
                        t("a11y.backup.animal", { animalName: animal.name }),
                      ),
                    ]}
                  />
                ))}
              </Menu>
            ) : (
              <Text
                modifiers={[
                  foregroundStyle(theme.textSecondary),
                  listRowBackground(theme.surface),
                ]}
              >
                {t("backup.animalsEmpty")}
              </Text>
            ))}
          {!exportAll && (
            <Toggle
              label={t("backup.includePreferences")}
              isOn={includePreferences}
              onIsOnChange={setIncludePreferences}
              modifiers={[
                listRowBackground(theme.surface),
                accessibilityHint(t("a11y.backup.preferences")),
              ]}
            />
          )}
          <Button
            label={busy ? t("backup.working") : t("backup.export")}
            systemImage="square.and.arrow.up"
            onPress={exportBackup}
            modifiers={[
              listRowBackground(theme.surface),
              disabled(busy || (!exportAll && !customSelection)),
              accessibilityHint(t("a11y.backup.export")),
            ]}
          />
        </Section>
        <Section
          header={
            <Text modifiers={[foregroundStyle(theme.textSecondary)]}>
              {t("backup.restoreSection")}
            </Text>
          }
          footer={
            <Text modifiers={[foregroundStyle(theme.textSecondary)]}>
              {t("backup.restoreFooter")}
            </Text>
          }
        >
          <Button
            label={busy ? t("backup.restoring") : t("backup.restore")}
            systemImage="square.and.arrow.down"
            onPress={chooseBackup}
            modifiers={[
              listRowBackground(theme.surface),
              disabled(busy),
              accessibilityHint(t("a11y.backup.restore")),
            ]}
          />
        </Section>
        {error && (
          <Section>
            <Text modifiers={[foregroundStyle(theme.danger)]}>{error}</Text>
          </Section>
        )}
        {success && (
          <Section>
            <Text modifiers={[foregroundStyle(theme.textSecondary)]}>
              {t("backup.success", { ...success, count: success.animals })}
            </Text>
          </Section>
        )}
      </Form>
    </Host>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });
