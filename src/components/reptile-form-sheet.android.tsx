import {
  Box,
  Button,
  Column,
  DatePickerDialog,
  DropdownMenuItem,
  ExposedDropdownMenu,
  ExposedDropdownMenuBox,
  Host,
  Icon,
  IconButton,
  ListItem,
  OutlinedTextField,
  RNHostView,
  Row,
  Snackbar,
  SnackbarHost,
  Switch,
  Text,
  TextButton,
  useNativeState,
  type SnackbarHostRef,
} from "@expo/ui/jetpack-compose";
import {
  background,
  clickable,
  clip,
  defaultMinSize,
  fillMaxSize,
  fillMaxWidth,
  menuAnchor,
  padding,
  size,
  Shapes,
  toggleable,
  weight,
} from "@expo/ui/jetpack-compose/modifiers";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  describeSchedule,
  SCHEDULE_INHERIT,
  type ScheduleSelection,
} from "@/utils/schedule";
import { FROZEN_TAGS, useReptileForm } from "@/components/use-reptile-form";
import { Radius, Spacing, StackAboveFontScale } from "@/constants/theme";
import { composeTextStyle } from "@/constants/type-font-compose";
import { useColorScheme, useTheme } from "@/hooks/use-theme";
import { SCHEDULE_FREQUENCIES } from "@/state/care-schedule";
import { FEEDING_MEASURES } from "@/state/logging-defaults";
import { DEFECATION_TYPES } from "@/state/defecation";
import { WEIGHT_UNITS } from "@/utils/weight-unit";
import {
  formatAbsoluteDate,
  fromUtcMidnight,
  toCalendarDate,
} from "@/utils/format-date";
import type { Animal } from "@/state/animal";
import type { ReptileSpecies } from "@/constants/reptile-species";

import DROPDOWN_ICON from "@/assets/images/icons/arrow-drop-down.xml";
import CALENDAR_ICON from "@/assets/images/icons/calendar-month.xml";
import CHECK_ICON from "@/assets/images/icons/check.xml";
import CLOSE_ICON from "@/assets/images/icons/close.xml";
import CAMERA_ICON from "@/assets/images/icons/photo-camera.xml";

const TOP_BAR_HEIGHT = 64;
const EDGE_INSET = 4;
const ACTION_ICON_SIZE = 24;
const PHOTO_SIZE = 112;
const LIFT_RANGE = 8;

const TITLE_LARGE = {
  fontFamily: "Solway-Bold",
  fontSize: 22,
  lineHeight: 28,
} as const;

const LABEL_LARGE = {
  fontFamily: "default",
  fontSize: 14,
  fontWeight: "500",
  lineHeight: 20,
  letterSpacing: 0.1,
} as const;

const TITLE_SMALL = {
  fontFamily: "default",
  fontSize: 14,
  fontWeight: "500",
  lineHeight: 20,
  letterSpacing: 0.1,
} as const;

const DATA_STYLE = {
  fontFamily: "SpaceMono-Bold",
  fontSize: 15,
  fontWeight: "700",
} as const;

type ReptileFormSheetProps = {
  animal?: Animal;
};

export function ReptileFormSheet({ animal }: ReptileFormSheetProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const form = useReptileForm(animal);
  const { fontScale } = useWindowDimensions();

  const { name, commonName, scientificName } = form;

  const nameText = useNativeState(name);
  const commonNameText = useNativeState(commonName);
  const scientificNameText = useNativeState(scientificName);

  const [nameDirty, setNameDirty] = useState(false);
  const [scrollY] = useState(() => new Animated.Value(0));
  const snackbar = useRef<SnackbarHostRef>(null);

  useEffect(() => {
    if (!form.saveError) return;
    void snackbar.current?.showSnackbar({
      message: form.saveError,
      duration: "long",
      withDismissAction: true,
    });
  }, [form.saveError]);

  const applySpecies = (species: ReptileSpecies) => {
    form.handleSelectSpecies(species);
    commonNameText.set(species.commonNames[form.language]);
    scientificNameText.set(species.scientificName);
  };

  const iconSize = ACTION_ICON_SIZE * Math.min(fontScale, 2);
  const horizontalInset = Spacing.md * Math.min(fontScale, StackAboveFontScale);
  const nameInvalid = nameDirty && name.trim().length === 0;

  const lifted = scrollY.interpolate({
    inputRange: [0, LIFT_RANGE],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
      />

      <Animated.ScrollView
        style={styles.formScroll}
        contentContainerStyle={[
          styles.formScrollContent,
          {
            paddingTop: insets.top + TOP_BAR_HEIGHT * Math.min(fontScale, 1.5),
            paddingBottom: insets.bottom + Spacing["2xl"],
            paddingHorizontal: horizontalInset,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
      >
        <Host
          style={styles.formHost}
          matchContents={{ horizontal: false, vertical: true }}
          seedColor={theme.primary}
        >
          <Column
            verticalArrangement={{ spacedBy: Spacing.xl }}
            horizontalAlignment="start"
            modifiers={[fillMaxWidth()]}
          >
            <PhotoPicker
              photoUri={form.photoUri}
              onPickPhoto={form.handlePickPhoto}
              onRemovePhoto={form.handleRemovePhoto}
            />

            <Section>
              <OutlinedTextField
                value={nameText}
                onValueChange={(value) => {
                  setNameDirty(true);
                  form.setName(value);
                }}
                colors={fieldColors(theme)}
                keyboardOptions={{ capitalization: "words" }}
                isError={nameInvalid}
                singleLine
                modifiers={[fillMaxWidth()]}
              >
                <OutlinedTextField.Label>
                  <Text>{t("reptileForm.name")}</Text>
                </OutlinedTextField.Label>
                {nameInvalid ? (
                  <OutlinedTextField.SupportingText>
                    <Text>{t("reptileForm.nameRequired")}</Text>
                  </OutlinedTextField.SupportingText>
                ) : null}
              </OutlinedTextField>

              <SuggestionField
                value={commonNameText}
                onValueChange={(value) => {
                  form.setCommonName(value);
                  form.setCommonSuggestionsDismissed(false);
                }}
                label={t("reptileForm.commonName")}
                theme={theme}
                suggestions={form.commonSuggestions}
                headlineFor={(species) => species.commonNames[form.language]}
                supportingFor={(species) => species.scientificName}
                onSelect={applySpecies}
              />

              <SuggestionField
                value={scientificNameText}
                onValueChange={(value) => {
                  form.setScientificName(value);
                  form.setScientificSuggestionsDismissed(false);
                }}
                label={t("reptileForm.scientificName")}
                theme={theme}
                suggestions={form.scientificSuggestions}
                headlineFor={(species) => species.scientificName}
                supportingFor={(species) => species.commonNames[form.language]}
                onSelect={applySpecies}
              />

              <MenuField
                label={t("reptileForm.sex")}
                value={form.sexLabels[form.sex]}
                theme={theme}
                iconSize={iconSize}
                items={form.SEX_VALUES.map((value) => ({
                  value,
                  label: form.sexLabels[value],
                  selected: value === form.sex,
                }))}
                onSelect={(value) => form.setSex(value as Animal["sex"])}
              />

              <SwitchRow
                label={t("reptileForm.knownBirthDate")}
                checked={form.knownBirthDate}
                onCheckedChange={form.setKnownBirthDate}
                theme={theme}
              />

              {form.knownBirthDate ? (
                <DateField
                  label={t("reptileForm.birthDate")}
                  date={form.birthDate}
                  onSelect={form.setBirthDate}
                  theme={theme}
                  iconSize={iconSize}
                  confirmLabel={t("newReptile.save")}
                  dismissLabel={t("newReptile.cancel")}
                />
              ) : null}

              <DateField
                label={t("reptileForm.acquired")}
                date={form.acquiredDate}
                onSelect={(value) => {
                  form.setAcquiredDate(value);
                  form.setKnowsAcquired(true);
                }}
                theme={theme}
                iconSize={iconSize}
                confirmLabel={t("newReptile.save")}
                dismissLabel={t("newReptile.cancel")}
              />
            </Section>

            <Section
              title={t("feedingSchedule.section")}
              footer={
                form.feedingValid
                  ? t("feedingSchedule.footer")
                  : t("schedule.invalidDays")
              }
              footerColor={form.feedingValid ? undefined : theme.danger}
            >
              <SwitchRow
                label={t("feedingSchedule.enabled")}
                checked={form.usesFeedingSchedule}
                onCheckedChange={form.setUsesFeedingSchedule}
                theme={theme}
              />
              {form.usesFeedingSchedule ? (
                <ScheduleFields
                  selection={form.feedingSelection}
                  onSelectionChange={form.setFeedingSelection}
                  customDays={form.feedingDays}
                  onCustomDaysChange={form.setFeedingDays}
                  valid={form.feedingValid}
                  theme={theme}
                  iconSize={iconSize}
                  showInherit={false}
                />
              ) : null}
            </Section>

            <Section
              title={t("waterSchedule.section")}
              footer={form.waterFooter}
              footerColor={form.waterValid ? undefined : theme.danger}
            >
              <ScheduleFields
                selection={form.waterSelection}
                onSelectionChange={form.setWaterSelection}
                customDays={form.waterDays}
                onCustomDaysChange={form.setWaterDays}
                valid={form.waterValid}
                theme={theme}
                iconSize={iconSize}
                showInherit
                inheritedLabel={t("defaults.followGlobal", {
                  value: describeSchedule(form.collectionWater, t),
                })}
              />
              {form.waterScheduled ? (
                <SwitchRow
                  label={t("reminders.enabled")}
                  checked={form.waterReminder}
                  onCheckedChange={form.handleWaterReminder}
                  theme={theme}
                />
              ) : null}
            </Section>

            <Section
              title={t("cleaningSchedule.section")}
              footer={form.cleaningFooter}
              footerColor={form.cleaningValid ? undefined : theme.danger}
            >
              <ScheduleFields
                selection={form.cleaningSelection}
                onSelectionChange={form.setCleaningSelection}
                customDays={form.cleaningDays}
                onCustomDaysChange={form.setCleaningDays}
                valid={form.cleaningValid}
                theme={theme}
                iconSize={iconSize}
                showInherit
                inheritedLabel={t("defaults.followGlobal", {
                  value: describeSchedule(form.collectionCleaning, t),
                })}
              />
              {form.cleaningScheduled ? (
                <SwitchRow
                  label={t("reminders.enabled")}
                  checked={form.cleaningReminder}
                  onCheckedChange={form.handleCleaningReminder}
                  theme={theme}
                />
              ) : null}
            </Section>

            <Section
              title={t("defaults.section")}
              footer={
                animal
                  ? t("defaults.animalFooter", { animalName: animal.name })
                  : t("defaults.animalFooterNew")
              }
            >
              <MenuField
                label={t("defaults.mealMeasure")}
                value={
                  form.defaults.mealMeasure === undefined
                    ? t("defaults.followGlobal", {
                        value: t(
                          `feedingForm.measure.${form.globalDefaults.mealMeasure}`,
                        ),
                      })
                    : t(`feedingForm.measure.${form.defaults.mealMeasure}`)
                }
                theme={theme}
                iconSize={iconSize}
                items={[
                  ...(form.globalDefaults.mealMeasure === undefined
                    ? []
                    : [
                        {
                          value: "" as const,
                          label: t("defaults.followGlobal", {
                            value: t(
                              `feedingForm.measure.${form.globalDefaults.mealMeasure}`,
                            ),
                          }),
                          selected: form.defaults.mealMeasure === undefined,
                        },
                      ]),
                  ...FEEDING_MEASURES.map((value) => ({
                    value,
                    label: t(`feedingForm.measure.${value}`),
                    selected: form.defaults.mealMeasure === value,
                  })),
                ]}
                onSelect={(value) =>
                  form.setDefaults((current) => ({
                    ...current,
                    mealMeasure: value === "" ? undefined : value,
                  }))
                }
              />

              <MenuField
                label={t("defaults.frozen")}
                value={
                  form.defaults.frozen === undefined
                    ? t("defaults.followGlobal", {
                        value: frozenLabel(form.globalDefaults.frozen, t),
                      })
                    : frozenLabel(form.defaults.frozen, t)
                }
                theme={theme}
                iconSize={iconSize}
                items={[
                  ...(form.globalDefaults.frozen === undefined
                    ? []
                    : [
                        {
                          value: "" as const,
                          label: t("defaults.followGlobal", {
                            value: frozenLabel(form.globalDefaults.frozen, t),
                          }),
                          selected: form.defaults.frozen === undefined,
                        },
                      ]),
                  ...FROZEN_TAGS.map((tag) => ({
                    value: tag,
                    label: frozenLabel(tag === "true", t),
                    selected:
                      form.defaults.frozen !== undefined &&
                      form.frozenTag(form.defaults.frozen) === tag,
                  })),
                ]}
                onSelect={(value) =>
                  form.setDefaults((current) => ({
                    ...current,
                    frozen: value === "" ? undefined : value === "true",
                  }))
                }
              />

              <MenuField
                label={t("defaults.weightUnit")}
                value={
                  form.defaults.weightUnit === undefined
                    ? t("defaults.followGlobal", {
                        value: t(
                          `feedingForm.units.${form.globalDefaults.weightUnit}`,
                        ),
                      })
                    : t(`feedingForm.units.${form.defaults.weightUnit}`)
                }
                theme={theme}
                iconSize={iconSize}
                items={[
                  ...(form.globalDefaults.weightUnit === undefined
                    ? []
                    : [
                        {
                          value: "" as const,
                          label: t("defaults.followGlobal", {
                            value: t(
                              `feedingForm.units.${form.globalDefaults.weightUnit}`,
                            ),
                          }),
                          selected: form.defaults.weightUnit === undefined,
                        },
                      ]),
                  ...WEIGHT_UNITS.map((value) => ({
                    value,
                    label: t(`feedingForm.units.${value}`),
                    selected: form.defaults.weightUnit === value,
                  })),
                ]}
                onSelect={(value) =>
                  form.setDefaults((current) => ({
                    ...current,
                    weightUnit: value === "" ? undefined : value,
                  }))
                }
              />

              <MenuField
                label={t("defaults.poopType")}
                value={
                  form.defaults.poopType === undefined
                    ? t("defaults.followGlobal", {
                        value: t(
                          `timeline.poop.${form.globalDefaults.poopType}`,
                        ),
                      })
                    : t(`timeline.poop.${form.defaults.poopType}`)
                }
                theme={theme}
                iconSize={iconSize}
                items={[
                  ...(form.globalDefaults.poopType === undefined
                    ? []
                    : [
                        {
                          value: "" as const,
                          label: t("defaults.followGlobal", {
                            value: t(
                              `timeline.poop.${form.globalDefaults.poopType}`,
                            ),
                          }),
                          selected: form.defaults.poopType === undefined,
                        },
                      ]),
                  ...DEFECATION_TYPES.map((value) => ({
                    value,
                    label: t(`timeline.poop.${value}`),
                    selected: form.defaults.poopType === value,
                  })),
                ]}
                onSelect={(value) =>
                  form.setDefaults((current) => ({
                    ...current,
                    poopType: value === "" ? undefined : value,
                  }))
                }
              />
            </Section>
          </Column>
        </Host>
      </Animated.ScrollView>

      <View
        style={[styles.topBar, { paddingTop: insets.top }]}
        pointerEvents="box-none"
      >
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.surface, opacity: lifted },
          ]}
        />
        <Host
          style={styles.topBarHost}
          matchContents={{ horizontal: false, vertical: true }}
          seedColor={theme.primary}
        >
          <Row
            verticalAlignment="center"
            horizontalArrangement={{ spacedBy: Spacing["2xs"] }}
            modifiers={[
              fillMaxWidth(),
              defaultMinSize({ minHeight: TOP_BAR_HEIGHT }),
              padding(EDGE_INSET, Spacing["2xs"], Spacing.md, Spacing["2xs"]),
            ]}
          >
            <IconButton
              onClick={() => router.back()}
              enabled={!form.isSaving}
              colors={{ contentColor: theme.textSecondary }}
            >
              <Icon
                source={CLOSE_ICON}
                tint={theme.textSecondary}
                size={iconSize}
                contentDescription={
                  animal ? t("editReptile.cancel") : t("newReptile.cancel")
                }
              />
            </IconButton>

            <Text
              style={TITLE_LARGE}
              color={theme.text}
              maxLines={1}
              overflow="ellipsis"
              modifiers={[weight(1)]}
            >
              {animal ? t("editReptile.title") : t("newReptile.title")}
            </Text>

            <Button
              onClick={form.handleConfirm}
              enabled={form.canSave}
              colors={{
                containerColor: theme.primary,
                contentColor: theme.onPrimary,
                disabledContainerColor: theme.surfaceSunken,
                disabledContentColor: theme.textMuted,
              }}
            >
              <Text style={LABEL_LARGE}>{t("newReptile.save")}</Text>
            </Button>
          </Row>
        </Host>
      </View>

      <View
        style={[styles.snackbar, { bottom: insets.bottom + Spacing.md }]}
        pointerEvents="box-none"
      >
        <Host matchContents>
          <SnackbarHost ref={snackbar} modifiers={[fillMaxWidth()]}>
            <Snackbar
              containerColor={theme.surfaceSunken}
              contentColor={theme.text}
              actionContentColor={theme.text}
              dismissActionContentColor={theme.textSecondary}
            />
          </SnackbarHost>
        </Host>
      </View>
    </View>
  );
}

function frozenLabel(
  frozen: boolean,
  t: ReturnType<typeof useTranslation>["t"],
) {
  return t(frozen ? "defaults.frozenYes" : "defaults.frozenNo");
}

type FormTheme = ReturnType<typeof useTheme>;

function fieldColors(theme: FormTheme) {
  return {
    focusedTextColor: theme.text,
    unfocusedTextColor: theme.text,
    disabledTextColor: theme.textMuted,
    errorTextColor: theme.text,
    cursorColor: theme.primaryStrong,
    errorCursorColor: theme.danger,
    focusedIndicatorColor: theme.primaryStrong,
    unfocusedIndicatorColor: theme.textMuted,
    disabledIndicatorColor: theme.border,
    errorIndicatorColor: theme.danger,
    focusedLabelColor: theme.text,
    unfocusedLabelColor: theme.textSecondary,
    disabledLabelColor: theme.textMuted,
    errorLabelColor: theme.danger,
    focusedPlaceholderColor: theme.textSecondary,
    unfocusedPlaceholderColor: theme.textSecondary,
    focusedTrailingIconColor: theme.textSecondary,
    unfocusedTrailingIconColor: theme.textSecondary,
    errorTrailingIconColor: theme.danger,
    focusedSupportingTextColor: theme.textSecondary,
    unfocusedSupportingTextColor: theme.textSecondary,
    errorSupportingTextColor: theme.danger,
  };
}

function Section({
  title,
  footer,
  footerColor,
  children,
}: {
  title?: string;
  footer?: string;
  footerColor?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <Column
      horizontalAlignment="start"
      verticalArrangement={{ spacedBy: Spacing.md }}
      modifiers={[fillMaxWidth()]}
    >
      {title ? (
        <Text style={TITLE_SMALL} color={theme.textSecondary}>
          {title}
        </Text>
      ) : null}
      {children}
      {footer ? (
        <Text
          style={composeTextStyle("bodyS")}
          color={footerColor ?? theme.textSecondary}
        >
          {footer}
        </Text>
      ) : null}
    </Column>
  );
}

function PhotoPicker({
  photoUri,
  onPickPhoto,
  onRemovePhoto,
}: {
  photoUri?: string;
  onPickPhoto: () => void;
  onRemovePhoto: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Column
      verticalArrangement={{ spacedBy: Spacing["2xs"] }}
      horizontalAlignment="center"
      modifiers={[fillMaxWidth(), padding(0, Spacing.lg, 0, 0)]}
    >
      <Box
        modifiers={[
          size(PHOTO_SIZE, PHOTO_SIZE),
          clip(Shapes.Circle),
          background(theme.surfaceSunken),
          clickable(onPickPhoto),
        ]}
      >
        {photoUri ? (
          <RNHostView modifiers={[fillMaxSize()]}>
            <Image
              accessible
              accessibilityLabel={t("reptileForm.changePhoto")}
              source={{ uri: photoUri }}
              style={styles.photo}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          </RNHostView>
        ) : (
          <Column
            horizontalAlignment="center"
            verticalArrangement="center"
            modifiers={[fillMaxSize()]}
          >
            <Icon
              source={CAMERA_ICON}
              tint={theme.textSecondary}
              size={32}
              contentDescription={t("reptileForm.addPhoto")}
            />
          </Column>
        )}
      </Box>
      <TextButton onClick={onPickPhoto} colors={{ contentColor: theme.text }}>
        <Text style={LABEL_LARGE}>
          {photoUri ? t("reptileForm.changePhoto") : t("reptileForm.addPhoto")}
        </Text>
      </TextButton>
      {photoUri ? (
        <TextButton
          onClick={onRemovePhoto}
          colors={{ contentColor: theme.danger }}
        >
          <Text style={LABEL_LARGE}>{t("reptileForm.removePhoto")}</Text>
        </TextButton>
      ) : null}
    </Column>
  );
}

function MenuField<T extends string>({
  label,
  value,
  theme,
  iconSize,
  items,
  onSelect,
}: {
  label: string;
  value: string;
  theme: FormTheme;
  iconSize: number;
  items: { value: T; label: string; selected: boolean }[];
  onSelect: (value: T) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const text = useNativeState(value);

  useEffect(() => {
    text.set(value);
  }, [text, value]);

  return (
    <ExposedDropdownMenuBox
      expanded={expanded}
      onExpandedChange={setExpanded}
      modifiers={[fillMaxWidth()]}
    >
      <OutlinedTextField
        value={text}
        readOnly
        singleLine
        colors={fieldColors(theme)}
        modifiers={[menuAnchor(), fillMaxWidth()]}
      >
        <OutlinedTextField.Label>
          <Text>{label}</Text>
        </OutlinedTextField.Label>
        <OutlinedTextField.TrailingIcon>
          <Icon
            source={DROPDOWN_ICON}
            tint={theme.textSecondary}
            size={iconSize}
          />
        </OutlinedTextField.TrailingIcon>
      </OutlinedTextField>
      <ExposedDropdownMenu
        expanded={expanded}
        onDismissRequest={() => setExpanded(false)}
        containerColor={theme.surface}
      >
        {items.map((item) => (
          <DropdownMenuItem
            key={item.value}
            onClick={() => {
              onSelect(item.value);
              setExpanded(false);
            }}
          >
            <DropdownMenuItem.Text>
              <Text style={composeTextStyle("body")} color={theme.text}>
                {item.label}
              </Text>
            </DropdownMenuItem.Text>
            {item.selected ? (
              <DropdownMenuItem.TrailingIcon>
                <Icon
                  source={CHECK_ICON}
                  tint={theme.primaryStrong}
                  size={iconSize}
                />
              </DropdownMenuItem.TrailingIcon>
            ) : null}
          </DropdownMenuItem>
        ))}
      </ExposedDropdownMenu>
    </ExposedDropdownMenuBox>
  );
}

function SwitchRow({
  label,
  checked,
  onCheckedChange,
  theme,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  theme: FormTheme;
}) {
  return (
    <Box
      modifiers={[
        fillMaxWidth(),
        clip(Shapes.RoundedCorner(Radius.md)),
        toggleable(checked, () => onCheckedChange(!checked), {
          role: "switch",
        }),
      ]}
    >
      <ListItem
        colors={{ containerColor: theme.bg, contentColor: theme.text }}
        modifiers={[fillMaxWidth()]}
      >
        <ListItem.HeadlineContent>
          <Text style={composeTextStyle("body")} color={theme.text}>
            {label}
          </Text>
        </ListItem.HeadlineContent>
        <ListItem.TrailingContent>
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
        </ListItem.TrailingContent>
      </ListItem>
    </Box>
  );
}

function DateField({
  label,
  date,
  onSelect,
  theme,
  iconSize,
  confirmLabel,
  dismissLabel,
}: {
  label: string;
  date: Date;
  onSelect: (date: Date) => void;
  theme: FormTheme;
  iconSize: number;
  confirmLabel: string;
  dismissLabel: string;
}) {
  const { t } = useTranslation();
  const [showDialog, setShowDialog] = useState(false);
  const value = toCalendarDate(date);
  const text = useNativeState(formatAbsoluteDate(value));

  useEffect(() => {
    text.set(formatAbsoluteDate(value));
  }, [text, value]);

  return (
    <Box modifiers={[fillMaxWidth()]}>
      <OutlinedTextField
        value={text}
        readOnly
        singleLine
        colors={fieldColors(theme)}
        textStyle={DATA_STYLE}
        modifiers={[fillMaxWidth()]}
      >
        <OutlinedTextField.Label>
          <Text>{label}</Text>
        </OutlinedTextField.Label>
        <OutlinedTextField.TrailingIcon>
          <IconButton
            onClick={() => setShowDialog(true)}
            colors={{ contentColor: theme.textSecondary }}
          >
            <Icon
              source={CALENDAR_ICON}
              tint={theme.textSecondary}
              size={iconSize}
              contentDescription={`${label}: ${t("reptileForm.selectDate")}`}
            />
          </IconButton>
        </OutlinedTextField.TrailingIcon>
      </OutlinedTextField>
      {showDialog ? (
        <DatePickerDialog
          initialDate={value}
          onDateSelected={(next) => {
            onSelect(fromUtcMidnight(next));
            setShowDialog(false);
          }}
          onDismissRequest={() => setShowDialog(false)}
          color={theme.primary}
          confirmButtonLabel={confirmLabel}
          dismissButtonLabel={dismissLabel}
        />
      ) : null}
    </Box>
  );
}

function SuggestionField({
  value,
  onValueChange,
  label,
  theme,
  suggestions,
  headlineFor,
  supportingFor,
  onSelect,
}: {
  value: ReturnType<typeof useNativeState<string>>;
  onValueChange: (value: string) => void;
  label: string;
  theme: FormTheme;
  suggestions: ReptileSpecies[];
  headlineFor: (species: ReptileSpecies) => string;
  supportingFor: (species: ReptileSpecies) => string;
  onSelect: (species: ReptileSpecies) => void;
}) {
  return (
    <Column
      verticalArrangement="top"
      horizontalAlignment="start"
      modifiers={[fillMaxWidth()]}
    >
      <OutlinedTextField
        value={value}
        onValueChange={onValueChange}
        colors={fieldColors(theme)}
        keyboardOptions={{ capitalization: "words" }}
        singleLine
        modifiers={[fillMaxWidth()]}
      >
        <OutlinedTextField.Label>
          <Text>{label}</Text>
        </OutlinedTextField.Label>
      </OutlinedTextField>

      {suggestions.length > 0 ? (
        <Column
          verticalArrangement="top"
          modifiers={[
            fillMaxWidth(),
            padding(0, Spacing["2xs"], 0, 0),
            clip(Shapes.RoundedCorner(Radius.md)),
            background(theme.surface),
          ]}
        >
          {suggestions.map((species) => (
            <Box
              key={species.scientificName}
              modifiers={[fillMaxWidth(), clickable(() => onSelect(species))]}
            >
              <ListItem
                colors={{
                  containerColor: theme.surface,
                  contentColor: theme.text,
                  supportingContentColor: theme.textSecondary,
                }}
                modifiers={[fillMaxWidth()]}
              >
                <ListItem.HeadlineContent>
                  <Text style={composeTextStyle("body")} color={theme.text}>
                    {headlineFor(species)}
                  </Text>
                </ListItem.HeadlineContent>
                <ListItem.SupportingContent>
                  <Text
                    style={composeTextStyle("bodyS")}
                    color={theme.textSecondary}
                  >
                    {supportingFor(species)}
                  </Text>
                </ListItem.SupportingContent>
              </ListItem>
            </Box>
          ))}
        </Column>
      ) : null}
    </Column>
  );
}

function ScheduleFields({
  selection,
  onSelectionChange,
  customDays,
  onCustomDaysChange,
  valid,
  theme,
  iconSize,
  showInherit,
  inheritedLabel,
}: {
  selection: ScheduleSelection;
  onSelectionChange: (value: ScheduleSelection) => void;
  customDays: string;
  onCustomDaysChange: (value: string) => void;
  valid: boolean;
  theme: FormTheme;
  iconSize: number;
  showInherit?: boolean;
  inheritedLabel?: string;
}) {
  const { t } = useTranslation();
  const customDaysState = useNativeState(customDays);

  const rows: { value: ScheduleSelection; label: string }[] = [
    ...(showInherit && inheritedLabel
      ? [
          {
            value: SCHEDULE_INHERIT as ScheduleSelection,
            label: inheritedLabel,
          },
        ]
      : []),
    ...(showInherit
      ? [{ value: "off" as const, label: t("schedule.off") }]
      : []),
    ...SCHEDULE_FREQUENCIES.map((value) => ({
      value: value as ScheduleSelection,
      label: t(`schedule.frequency.${value}`),
    })),
  ];

  return (
    <Column
      verticalArrangement={{ spacedBy: Spacing.md }}
      horizontalAlignment="start"
      modifiers={[fillMaxWidth()]}
    >
      <MenuField
        label={t("schedule.frequency.label")}
        value={rows.find((row) => row.value === selection)?.label ?? ""}
        theme={theme}
        iconSize={iconSize}
        items={rows.map((row) => ({
          value: row.value,
          label: row.label,
          selected: row.value === selection,
        }))}
        onSelect={onSelectionChange}
      />
      {selection === "custom" ? (
        <OutlinedTextField
          value={customDaysState}
          onValueChange={onCustomDaysChange}
          colors={fieldColors(theme)}
          keyboardOptions={{ keyboardType: "number" }}
          textStyle={DATA_STYLE}
          isError={!valid}
          singleLine
          modifiers={[fillMaxWidth()]}
        >
          <OutlinedTextField.Label>
            <Text>{t("schedule.customDays")}</Text>
          </OutlinedTextField.Label>
        </OutlinedTextField>
      ) : null}
    </Column>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  topBarHost: {
    width: "100%",
  },
  formScroll: {
    flex: 1,
    width: "100%",
  },
  formScrollContent: {
    flexGrow: 1,
  },
  formHost: {
    width: "100%",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  snackbar: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
  },
});
