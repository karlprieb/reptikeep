import {
  Button,
  ConfirmationDialog,
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
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { File } from "expo-file-system";
import { useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { useFormModifiers } from "@/components/form-sheet";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useBackupRestore } from "@/hooks/use-backup-restore";
import { useTheme } from "@/hooks/use-theme";
import { resetAppData } from "@/state/reset";

const SCRIM_COLOR = "rgba(26, 20, 14, 0.4)";

export default function BackupRestoreScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const formModifiers = useFormModifiers();
  const {
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
    copy,
  } = useBackupRestore();
  const [isAdvancedPresented, setIsAdvancedPresented] = useState(false);
  const [isResetPresented, setIsResetPresented] = useState(false);

  const askRestore = (file: File, message: string) =>
    Alert.alert(t("backup.restoreTitle"), message, [
      { text: t("settings.cancel"), style: "cancel" },
      {
        text: t("backup.restoreConfirm"),
        style: "destructive",
        onPress: () => confirmRestore(file),
      },
    ]);

  const handleReset = () => {
    resetAppData();
    setIsResetPresented(false);
  };

  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: !progress,
      headerLeft: progress ? () => null : undefined,
    });
  }, [navigation, progress]);

  return (
    <>
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
              onPress={() => chooseBackup(askRestore)}
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
                {successMessage(success)}
              </Text>
            </Section>
          )}
          <Section>
            <Button
              label={
                isAdvancedPresented
                  ? t("backup.hideAdvanced")
                  : t("backup.advanced")
              }
              systemImage={isAdvancedPresented ? "chevron.up" : "chevron.down"}
              onPress={() => setIsAdvancedPresented((value) => !value)}
              modifiers={[
                listRowBackground(theme.surface),
                accessibilityHint(t("a11y.advancedSettings.hint")),
              ]}
            />
          </Section>

          {isAdvancedPresented ? (
            <Section
              footer={
                <Text modifiers={[foregroundStyle(theme.textSecondary)]}>
                  {t("settings.resetFooter")}
                </Text>
              }
            >
              <ConfirmationDialog
                title={t("settings.resetTitle")}
                titleVisibility="visible"
                isPresented={isResetPresented}
                onIsPresentedChange={setIsResetPresented}
              >
                <ConfirmationDialog.Trigger>
                  <Button
                    label={t("settings.reset")}
                    systemImage="trash"
                    role="destructive"
                    onPress={() => setIsResetPresented(true)}
                    modifiers={[
                      tint(theme.danger),
                      foregroundStyle(theme.danger),
                      listRowBackground(theme.surface),
                      accessibilityHint(t("a11y.resetData.hint")),
                    ]}
                  />
                </ConfirmationDialog.Trigger>
                <ConfirmationDialog.Actions>
                  <Button
                    label={t("settings.resetConfirm")}
                    role="destructive"
                    onPress={handleReset}
                  />
                  <Button label={t("settings.cancel")} role="cancel" />
                </ConfirmationDialog.Actions>
                <ConfirmationDialog.Message>
                  <Text>{t("settings.resetMessage")}</Text>
                </ConfirmationDialog.Message>
              </ConfirmationDialog>
            </Section>
          ) : null}
        </Form>
      </Host>

      {progress ? (
        <ScrollView
          style={styles.scrim}
          contentContainerStyle={styles.scrimContent}
          accessible
          accessibilityViewIsModal
          accessibilityLabel={`${t(`backup.${copy}Title`)}. ${t(
            `backup.${copy}Message`,
          )}`}
        >
          <View
            style={[styles.progressCard, { backgroundColor: theme.surface }]}
          >
            <ActivityIndicator size="large" color={theme.accentInk} />
            <ThemedText type="heading" style={styles.progressText}>
              {t(`backup.${copy}Title`)}
            </ThemedText>
            <ThemedText
              type="body"
              themeColor="textSecondary"
              style={styles.progressText}
            >
              {t(`backup.${copy}Message`)}
            </ThemedText>
          </View>
        </ScrollView>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  scrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: SCRIM_COLOR,
  },
  scrimContent: {
    flexGrow: 1,
    alignItems: "center",
    padding: Spacing.lg,
  },
  progressCard: {
    width: "100%",
    maxWidth: 300,
    marginVertical: "auto",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    boxShadow: "0px 4px 12px rgba(26, 20, 14, 0.28)",
  },
  progressText: { textAlign: "center" },
});
