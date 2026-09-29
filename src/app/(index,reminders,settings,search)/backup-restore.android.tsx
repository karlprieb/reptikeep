import {
  AlertDialog,
  Button,
  CircularProgressIndicator,
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
import { File } from "expo-file-system";
import { useState, type Dispatch, type SetStateAction } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Spacing, type Theme } from "@/constants/theme";
import { composeTextStyle, SECTION_LABEL } from "@/constants/type-font-compose";
import { useBackupRestore } from "@/hooks/use-backup-restore";
import { useTheme } from "@/hooks/use-theme";
import { resetAppData } from "@/state/reset";

import CHECK_ICON from "@/assets/images/icons/check.xml";

const ROW_MIN_HEIGHT = 64;
const ACTION_ICON_SIZE = 24;

function ProgressDialog({ theme, copy }: { theme: Theme; copy: string }) {
  const { t } = useTranslation();

  return (
    <View style={styles.dialogHost} pointerEvents="box-none">
      <Host matchContents seedColor={theme.primary}>
        <AlertDialog
          colors={{
            containerColor: theme.surface,
            iconContentColor: theme.accentInk,
            titleContentColor: theme.text,
            textContentColor: theme.textSecondary,
          }}
          properties={{
            dismissOnBackPress: false,
            dismissOnClickOutside: false,
          }}
        >
          <AlertDialog.Icon>
            <CircularProgressIndicator
              color={theme.accentInk}
              trackColor={theme.surfaceSunken}
            />
          </AlertDialog.Icon>
          <AlertDialog.Title>
            <Text style={SECTION_LABEL} color={theme.text}>
              {t(`backup.${copy}Title`)}
            </Text>
          </AlertDialog.Title>
          <AlertDialog.Text>
            <Text style={composeTextStyle("body")} color={theme.textSecondary}>
              {t(`backup.${copy}Message`)}
            </Text>
          </AlertDialog.Text>
        </AlertDialog>
      </Host>
    </View>
  );
}

type RestoreConfirmDialogProps = {
  theme: Theme;
  pending: { file: File; summary: string };
  onConfirm: () => void;
  onDismiss: () => void;
};

function RestoreConfirmDialog({
  theme,
  pending,
  onConfirm,
  onDismiss,
}: RestoreConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.dialogHost} pointerEvents="box-none">
      <Host matchContents seedColor={theme.primary}>
        <AlertDialog
          colors={{
            containerColor: theme.surface,
            titleContentColor: theme.text,
            textContentColor: theme.textSecondary,
          }}
          onDismissRequest={onDismiss}
        >
          <AlertDialog.Title>
            <Text style={SECTION_LABEL} color={theme.text}>
              {t("backup.restoreTitle")}
            </Text>
          </AlertDialog.Title>
          <AlertDialog.Text>
            <Text style={composeTextStyle("body")} color={theme.textSecondary}>
              {pending.summary}
            </Text>
          </AlertDialog.Text>
          <AlertDialog.ConfirmButton>
            <TextButton
              onClick={onConfirm}
              colors={{ contentColor: theme.danger }}
            >
              <Text style={composeTextStyle("body")}>
                {t("backup.restoreConfirm")}
              </Text>
            </TextButton>
          </AlertDialog.ConfirmButton>
          <AlertDialog.DismissButton>
            <TextButton
              onClick={onDismiss}
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
  );
}

type ExportOptionsProps = {
  theme: Theme;
  exportAll: boolean;
  animals: { id: string; name: string }[];
  animalLabel: string;
  animalIds: string[];
  onAnimalIdsChange: Dispatch<SetStateAction<string[]>>;
  includePreferences: boolean;
  onIncludePreferencesChange: (value: boolean) => void;
};

function ExportOptions({
  theme,
  exportAll,
  animals,
  animalLabel,
  animalIds,
  onAnimalIdsChange,
  includePreferences,
  onIncludePreferencesChange,
}: ExportOptionsProps) {
  const { t } = useTranslation();
  if (exportAll) return null;

  return (
    <>
      {!exportAll && animals.length > 0 ? (
        <AnimalMenu
          theme={theme}
          label={animalLabel}
          hint={t("a11y.backup.animals")}
          animals={animals.map((animal) => ({
            id: animal.id,
            name: animal.name,
          }))}
          selectedIds={animalIds}
          onToggle={(id, on) =>
            onAnimalIdsChange((current) =>
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
          onCheckedChange={onIncludePreferencesChange}
        />
      ) : null}
    </>
  );
}

export default function BackupRestoreScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const {
    animals,
    exportAll,
    setExportAll,
    animalIds,
    setAnimalIds,
    includePreferences,
    setIncludePreferences,
    busy,
    success,
    error,
    customSelection,
    animalSelectionLabel,
    successMessage,
    exportBackup,
    confirmRestore,
    chooseBackup,
    copy,
    progress,
  } = useBackupRestore();
  const [isAdvancedPresented, setIsAdvancedPresented] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<{
    file: File;
    summary: string;
  }>();
  const [showReset, setShowReset] = useState(false);

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

            <ExportOptions
              theme={theme}
              exportAll={exportAll}
              animals={animals}
              animalLabel={animalSelectionLabel}
              animalIds={animalIds}
              onAnimalIdsChange={setAnimalIds}
              includePreferences={includePreferences}
              onIncludePreferencesChange={setIncludePreferences}
            />

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
                onClick={() =>
                  chooseBackup((file, summary) =>
                    setPendingRestore({ file, summary }),
                  )
                }
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

      {progress ? <ProgressDialog theme={theme} copy={copy} /> : null}

      {pendingRestore ? (
        <RestoreConfirmDialog
          theme={theme}
          pending={pendingRestore}
          onConfirm={() => {
            confirmRestore(pendingRestore.file);
            setPendingRestore(undefined);
          }}
          onDismiss={() => setPendingRestore(undefined)}
        />
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
                    tint={theme.accentInk}
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
