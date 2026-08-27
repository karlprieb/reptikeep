import { useSelector as useValue } from "@legendapp/state/react";
import {
  Box,
  Column,
  DropdownMenu,
  DropdownMenuItem,
  Host,
  Icon,
  IconButton,
  Row,
  Text,
} from "@expo/ui/jetpack-compose";
import {
  background,
  clickable,
  clip,
  fillMaxWidth,
  padding,
  Shapes,
  size,
  weight,
} from "@expo/ui/jetpack-compose/modifiers";
import type { TFunction } from "i18next";
import { router } from "expo-router";
import { useState } from "react";
import {
  Animated,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ACTION_ICON_SIZE,
  DATA_STYLE,
  formSheetAndroidStyles as styles,
  LabeledRow,
  Section,
  TITLE_LARGE,
  TOP_BAR_HEIGHT,
  useScrollLift,
} from "@/components/form-sheet";
import { ActivityIcons } from "@/constants/activity-icons";
import { CategoryColors, Spacing } from "@/constants/theme";
import { composeTextStyle } from "@/constants/type-font-compose";
import { useColorScheme, useTheme } from "@/hooks/use-theme";
import { removeActivity } from "@/state/activity-stores";
import { documents$, documentsForActivity } from "@/state/document";
import { feedingStore, type FeedingActivity } from "@/state/feeding";
import { useAnimalDefaults } from "@/state/logging-defaults";
import { weightStore, type WeightActivity } from "@/state/weight";
import type { AnimalActivity } from "@/utils/animal-activity";
import { confirmDeleteActivity } from "@/utils/confirm-delete-activity";
import {
  daysSince,
  formatAbsoluteDate,
  formatAbsoluteTime,
} from "@/utils/format-date";
import {
  formatSignedPercent,
  formatWeight,
  formatWeightDelta,
} from "@/utils/format-number";
import { relativeLine } from "@/utils/relative-date";
import { previousRecord, weightChange } from "@/utils/weight-change";
import type { WeightUnit } from "@/utils/weight-unit";

import ARROW_BACK_ICON from "@/assets/images/icons/arrow-back.xml";
import DELETE_ICON from "@/assets/images/icons/delete.xml";
import DESCRIPTION_ICON from "@/assets/images/icons/description.xml";
import MODE_EDIT_ICON from "@/assets/images/icons/mode-edit.xml";
import MORE_VERT_ICON from "@/assets/images/icons/more-vert.xml";

const BADGE_DIAMETER = 52;
const BADGE_SYMBOL_RATIO = 0.55;
const BADGE_MAX_SCALE = 1.6;

type DetailRow = {
  key: string;
  label: string;
  value: string;
  mono?: boolean;
  flagged?: boolean;
};

type Detail = { header: string; rows: DetailRow[] };

function yesNo(t: TFunction, value: boolean): string {
  return t(value ? "activityDetail.yes" : "activityDetail.no");
}

function feedDetail(
  entry: Extract<AnimalActivity, { type: "feed" }>,
  t: TFunction,
  feedings: Record<string, FeedingActivity>,
  unit: WeightUnit,
): Detail {
  const {
    foodType,
    amount,
    weight: recordWeight,
    frozen,
    refused,
  } = entry.record;

  const previous = previousRecord(
    entry.record.animalId,
    feedings,
    entry.occurredAt,
  );
  const interval = previous
    ? daysSince(previous.occurredAt, new Date(entry.occurredAt))
    : null;

  return {
    header: t("activityDetail.meal"),
    rows: [
      ...(foodType
        ? [
            {
              key: "foodType",
              label: t("feedingForm.foodType"),
              value: foodType,
            },
          ]
        : []),
      ...(amount
        ? [
            {
              key: "amount",
              label: t("feedingForm.measure.amount"),
              value: amount,
              mono: true,
            },
          ]
        : []),
      ...(recordWeight != null
        ? [
            {
              key: "weight",
              label: t("feedingForm.feederWeight"),
              value: formatWeight(recordWeight, unit),
              mono: true,
            },
          ]
        : []),
      {
        key: "frozen",
        label: t("feedingForm.frozen"),
        value: yesNo(t, frozen),
      },
      {
        key: "refused",
        label: t("feedingForm.refused"),
        value: yesNo(t, refused),
        flagged: refused,
      },
      ...(interval != null
        ? [
            {
              key: "interval",
              label: t("activityDetail.sincePrevious"),
              value: t("activityDetail.dayInterval", { count: interval }),
              mono: true,
            },
          ]
        : []),
    ],
  };
}

function weightDetail(
  entry: Extract<AnimalActivity, { type: "weight" }>,
  t: TFunction,
  weights: Record<string, WeightActivity>,
  unit: WeightUnit,
): Detail {
  const previous = previousRecord(
    entry.record.animalId,
    weights,
    entry.occurredAt,
  );
  const change = previous
    ? weightChange(previous.weight, entry.record.weight)
    : undefined;

  return {
    header: t("weightForm.weighIn"),
    rows: [
      {
        key: "weight",
        label: t("weightForm.weight"),
        value: formatWeight(entry.record.weight, unit),
        mono: true,
      },
      ...(previous
        ? [
            {
              key: "previous",
              label: t("weightForm.previous"),
              value: `${formatWeight(previous.weight, unit)} · ${formatAbsoluteDate(previous.occurredAt)}`,
              mono: true,
            },
          ]
        : []),
      ...(change
        ? [
            {
              key: "change",
              label: t("weightForm.change"),
              value: `${formatWeightDelta(change.deltaGrams, unit)} (${formatSignedPercent(change.percent)})`,
              mono: true,
              flagged: change.implausible,
            },
          ]
        : []),
    ],
  };
}

function habitatDetail(
  entry: Extract<AnimalActivity, { type: "habitat" }>,
  t: TFunction,
): Detail {
  return {
    header: t("habitatForm.upkeep"),
    rows: [
      {
        key: "water",
        label: t("habitatForm.water"),
        value: yesNo(t, entry.record.water),
      },
      ...(entry.record.cleaning === undefined
        ? []
        : [
            {
              key: "cleaning",
              label: t("habitatForm.cleaning"),
              value: yesNo(t, entry.record.cleaning),
            },
          ]),
    ],
  };
}

function medicalDetail(
  entry: Extract<AnimalActivity, { type: "medical" }>,
): Detail {
  return {
    header: entry.record.summary,
    rows: [],
  };
}

function observationDetail(
  entry: Extract<AnimalActivity, { type: "shed" | "poop" }>,
  t: TFunction,
): Detail {
  if (entry.type === "shed") {
    return {
      header: t("shedForm.observation"),
      rows: [
        {
          key: "issues",
          label: t("shedForm.issues"),
          value: yesNo(t, entry.record.issues),
          flagged: entry.record.issues,
        },
      ],
    };
  }

  return {
    header: t("defecationForm.observation"),
    rows: [
      {
        key: "type",
        label: t("defecationForm.type"),
        value: t(`timeline.poop.${entry.record.type}`),
      },
      {
        key: "issues",
        label: t("defecationForm.issues"),
        value: yesNo(t, entry.record.issues),
        flagged: entry.record.issues,
      },
    ],
  };
}

export type ActivityDetailSheetProps = {
  entry: AnimalActivity;
  animalName: string;
};

export function ActivityDetailSheet({
  entry,
  animalName,
}: ActivityDetailSheetProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const { lifted, onScroll } = useScrollLift();
  const [menuOpen, setMenuOpen] = useState(false);

  const feedings = useValue(feedingStore.$);
  const weights = useValue(weightStore.$);
  const documents = useValue(documents$);

  const typeName = t(`activity.type.${entry.type}`);
  const animalId = entry.record.animalId;
  const { weightUnit } = useAnimalDefaults(animalId);

  const detail =
    entry.type === "feed"
      ? feedDetail(entry, t, feedings, weightUnit)
      : entry.type === "weight"
        ? weightDetail(entry, t, weights, weightUnit)
        : entry.type === "habitat"
          ? habitatDetail(entry, t)
          : entry.type === "medical"
            ? medicalDetail(entry)
            : observationDetail(entry, t);

  const notes = entry.type === "poop" ? entry.record.note : entry.record.notes;
  const linkedDocuments =
    entry.type === "medical"
      ? documentsForActivity("medical", entry.id, documents)
      : [];
  const occurredDate = formatAbsoluteDate(entry.occurredAt);
  const occurredTime = formatAbsoluteTime(entry.occurredAt);
  const recordedDate = formatAbsoluteDate(entry.record.createdAt);
  const backdated = recordedDate !== occurredDate;

  const badgeSize = Math.round(
    BADGE_DIAMETER * Math.min(fontScale, BADGE_MAX_SCALE),
  );
  const iconSize = ACTION_ICON_SIZE * Math.min(fontScale, 2);
  const horizontalInset = Spacing.md * Math.min(fontScale, 1.6);

  const handleEdit = () => {
    setMenuOpen(false);
    router.replace(`/animal/${animalId}/${entry.type}?activityId=${entry.id}`);
  };

  const handleDelete = () => {
    setMenuOpen(false);
    confirmDeleteActivity(
      t,
      typeName,
      () => {
        removeActivity(entry.type, entry.id);
        router.back();
      },
      entry.type === "medical",
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + TOP_BAR_HEIGHT * Math.min(fontScale, 1.5),
          paddingBottom: insets.bottom + Spacing["2xl"],
          paddingHorizontal: horizontalInset,
        }}
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
              footer={
                backdated
                  ? t("activityDetail.recordedOn", { date: recordedDate })
                  : t("activityDetail.loggedFor", { animalName })
              }
            >
              <Row
                verticalAlignment="center"
                horizontalArrangement={{ spacedBy: Spacing.md }}
                modifiers={[fillMaxWidth()]}
              >
                <Box
                  contentAlignment="center"
                  modifiers={[
                    size(badgeSize, badgeSize),
                    clip(Shapes.Circle),
                    background(CategoryColors[entry.type]),
                  ]}
                >
                  <Icon
                    source={ActivityIcons[entry.type]}
                    tint={theme.onPrimary}
                    size={Math.round(badgeSize * BADGE_SYMBOL_RATIO)}
                    contentDescription={typeName}
                  />
                </Box>

                <Column
                  horizontalAlignment="start"
                  verticalArrangement={{ spacedBy: Spacing["2xs"] }}
                  modifiers={[weight(1)]}
                >
                  <Text
                    style={{ ...TITLE_LARGE, fontSize: 21, lineHeight: 26.25 }}
                    color={theme.text}
                    maxLines={1}
                    overflow="ellipsis"
                  >
                    {occurredDate}
                  </Text>
                  <Text
                    style={composeTextStyle("bodyS")}
                    color={theme.textSecondary}
                  >
                    {[occurredTime, relativeLine(entry.occurredAt, "ago", t)]
                      .filter((part): part is string => Boolean(part))
                      .join(" · ")}
                  </Text>
                </Column>
              </Row>
            </Section>

            <Section title={detail.rows.length ? detail.header : undefined}>
              {detail.rows.length ? (
                detail.rows.map((row) => (
                  <LabeledRow key={row.key} label={row.label} theme={theme}>
                    <Text
                      style={row.mono ? DATA_STYLE : composeTextStyle("body")}
                      color={row.flagged ? theme.warning : theme.textSecondary}
                      maxLines={1}
                      overflow="ellipsis"
                    >
                      {row.value}
                    </Text>
                  </LabeledRow>
                ))
              ) : (
                <Text
                  style={composeTextStyle("body")}
                  color={theme.text}
                  modifiers={[fillMaxWidth()]}
                >
                  {detail.header}
                </Text>
              )}
            </Section>

            {linkedDocuments.length ? (
              <Section title={t("medicalForm.documents")}>
                {linkedDocuments.map((document) => (
                  <Box
                    key={document.id}
                    modifiers={[
                      fillMaxWidth(),
                      clickable(() =>
                        router.push(
                          `/animal/${animalId}/document-preview?documentId=${document.id}`,
                        ),
                      ),
                    ]}
                  >
                    <Row
                      verticalAlignment="center"
                      horizontalArrangement={{ spacedBy: Spacing.xs }}
                      modifiers={[
                        fillMaxWidth(),
                        padding(0, Spacing["2xs"], 0, Spacing["2xs"]),
                      ]}
                    >
                      <Icon
                        source={DESCRIPTION_ICON}
                        tint={theme.textSecondary}
                        size={iconSize}
                      />
                      <Text
                        style={composeTextStyle("body")}
                        color={theme.text}
                        maxLines={1}
                        overflow="ellipsis"
                      >
                        {document.title}
                      </Text>
                    </Row>
                  </Box>
                ))}
              </Section>
            ) : null}

            {notes ? (
              <Section title={t("activityDetail.notes")}>
                <Text
                  style={composeTextStyle("body")}
                  color={theme.text}
                  modifiers={[fillMaxWidth()]}
                >
                  {notes}
                </Text>
              </Section>
            ) : null}
          </Column>
        </Host>
      </Animated.ScrollView>

      <View
        style={[topBarStyles.topBar, { paddingTop: insets.top }]}
        pointerEvents="box-none"
      >
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle={scheme === "dark" ? "light-content" : "dark-content"}
        />
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
          style={topBarStyles.topBarHost}
          matchContents={{ horizontal: false, vertical: true }}
          seedColor={theme.primary}
        >
          <Row
            verticalAlignment="center"
            horizontalArrangement={{ spacedBy: Spacing["2xs"] }}
            modifiers={[
              fillMaxWidth(),
              padding(4, Spacing["2xs"], Spacing.md, Spacing["2xs"]),
            ]}
          >
            <IconButton
              onClick={() => router.back()}
              colors={{ contentColor: theme.textSecondary }}
            >
              <Icon
                source={ARROW_BACK_ICON}
                tint={theme.textSecondary}
                size={iconSize}
                contentDescription={t("activityDetail.done")}
              />
            </IconButton>

            <Text
              style={TITLE_LARGE}
              color={theme.text}
              maxLines={1}
              overflow="ellipsis"
              modifiers={[weight(1)]}
            >
              {typeName}
            </Text>

            <DropdownMenu
              expanded={menuOpen}
              onDismissRequest={() => setMenuOpen(false)}
              color={theme.surface}
            >
              <DropdownMenu.Trigger>
                <IconButton
                  onClick={() => setMenuOpen(true)}
                  colors={{ contentColor: theme.primary }}
                >
                  <Icon
                    source={MORE_VERT_ICON}
                    tint={theme.primary}
                    size={iconSize}
                    contentDescription={t("activityDetail.actions")}
                  />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Items>
                <DropdownMenuItem onClick={handleEdit}>
                  <DropdownMenuItem.Text>
                    <Text style={composeTextStyle("body")} color={theme.text}>
                      {t("activityDetail.edit")}
                    </Text>
                  </DropdownMenuItem.Text>
                  <DropdownMenuItem.LeadingIcon>
                    <Icon
                      source={MODE_EDIT_ICON}
                      tint={theme.text}
                      size={iconSize}
                    />
                  </DropdownMenuItem.LeadingIcon>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  elementColors={{
                    textColor: theme.danger,
                    leadingIconColor: theme.danger,
                  }}
                >
                  <DropdownMenuItem.Text>
                    <Text style={composeTextStyle("body")} color={theme.danger}>
                      {t("activityDetail.delete")}
                    </Text>
                  </DropdownMenuItem.Text>
                  <DropdownMenuItem.LeadingIcon>
                    <Icon
                      source={DELETE_ICON}
                      tint={theme.danger}
                      size={iconSize}
                    />
                  </DropdownMenuItem.LeadingIcon>
                </DropdownMenuItem>
              </DropdownMenu.Items>
            </DropdownMenu>
          </Row>
        </Host>
      </View>
    </View>
  );
}

const topBarStyles = StyleSheet.create({
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  topBarHost: {
    width: "100%",
  },
});
