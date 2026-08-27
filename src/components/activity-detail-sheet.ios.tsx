import { useSelector as useValue } from "@legendapp/state/react";
import {
  Button,
  Circle,
  Form,
  Host,
  HStack,
  Image,
  LabeledContent,
  Section,
  Text,
  VStack,
  ZStack,
} from "@expo/ui/swift-ui";
import {
  accessibilityElement,
  accessibilityLabel,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  listRowBackground,
  minimumScaleFactor,
} from "@expo/ui/swift-ui/modifiers";
import type { TFunction } from "i18next";
import { router, Stack } from "expo-router";
import { useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  FormSectionFooter,
  FormSectionHeader,
  formSheetStyles as styles,
  useFormModifiers,
} from "@/components/form-sheet";
import {
  ActivitySymbols,
  CategoryColors,
  Spacing,
  Typography,
} from "@/constants/theme";
import { typeFont } from "@/constants/type-font";
import { useTheme } from "@/hooks/use-theme";
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

const BADGE_DIAMETER = 52;
const BADGE_SYMBOL_RATIO = 0.46;
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
  const { foodType, amount, weight, frozen, refused } = entry.record;

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
      ...(weight != null
        ? [
            {
              key: "weight",
              label: t("feedingForm.feederWeight"),
              value: formatWeight(weight, unit),
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
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const modifiers = useFormModifiers();

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

  const handleEdit = () =>
    router.replace(`/animal/${animalId}/${entry.type}?activityId=${entry.id}`);

  const handleDelete = () =>
    confirmDeleteActivity(
      t,
      typeName,
      () => {
        removeActivity(entry.type, entry.id);
        router.back();
      },
      entry.type === "medical",
    );

  return (
    <>
      <Stack.Title
        style={{ fontFamily: Typography.title.fontFamily, color: theme.text }}
      >
        {typeName}
      </Stack.Title>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          tintColor={theme.textSecondary}
          accessibilityLabel={t("activityDetail.done")}
          accessibilityHint={t("activityDetail.doneHint")}
          onPress={() => router.back()}
        >
          {t("activityDetail.done")}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu
          icon="ellipsis"
          tintColor={theme.primary}
          accessibilityLabel={t("activityDetail.actions")}
          accessibilityHint={t("activityDetail.actionsHint")}
        >
          <Stack.Toolbar.MenuAction
            icon="square.and.pencil"
            onPress={handleEdit}
          >
            {t("activityDetail.edit")}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="trash"
            destructive
            onPress={handleDelete}
          >
            {t("activityDetail.delete")}
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Host
          style={styles.host}
          useViewportSizeMeasurement
          seedColor={theme.primary}
        >
          <Form modifiers={modifiers.form}>
            <Section
              footer={
                <FormSectionFooter>
                  {backdated
                    ? t("activityDetail.recordedOn", { date: recordedDate })
                    : t("activityDetail.loggedFor", { animalName })}
                </FormSectionFooter>
              }
              modifiers={modifiers.row}
            >
              <HStack
                alignment="center"
                spacing={Spacing.md}
                modifiers={[
                  frame({ maxWidth: Infinity, alignment: "leading" }),
                  accessibilityElement("combine"),
                  accessibilityLabel(
                    [typeName, occurredDate, occurredTime]
                      .filter((part): part is string => Boolean(part))
                      .join(", "),
                  ),
                ]}
              >
                <ZStack
                  modifiers={[frame({ width: badgeSize, height: badgeSize })]}
                >
                  <Circle
                    modifiers={[foregroundStyle(CategoryColors[entry.type])]}
                  />
                  <Image
                    systemName={ActivitySymbols[entry.type]}
                    modifiers={[
                      font({
                        size: Math.round(badgeSize * BADGE_SYMBOL_RATIO),
                        weight: "semibold",
                      }),
                      foregroundStyle(theme.onPrimary),
                    ]}
                  />
                </ZStack>

                <VStack alignment="leading" spacing={Spacing["2xs"]}>
                  <Text
                    modifiers={[
                      typeFont("title"),
                      foregroundStyle(theme.text),
                      lineLimit(1),
                      minimumScaleFactor(0.7),
                    ]}
                  >
                    {occurredDate}
                  </Text>
                  <Text
                    modifiers={[
                      typeFont("bodyS"),
                      foregroundStyle(theme.textSecondary),
                    ]}
                  >
                    {[occurredTime, relativeLine(entry.occurredAt, "ago", t)]
                      .filter((part): part is string => Boolean(part))
                      .join(" · ")}
                  </Text>
                </VStack>
              </HStack>
            </Section>

            <Section
              header={
                detail.rows.length ? (
                  <FormSectionHeader>{detail.header}</FormSectionHeader>
                ) : undefined
              }
              modifiers={modifiers.row}
            >
              {detail.rows.length ? (
                detail.rows.map((row) => (
                  <LabeledContent
                    key={row.key}
                    label={row.label}
                    modifiers={[listRowBackground(theme.surface)]}
                  >
                    <Text
                      modifiers={[
                        typeFont(row.mono ? "data" : "body"),
                        foregroundStyle(
                          row.flagged ? theme.warning : theme.textSecondary,
                        ),
                        lineLimit(1),
                        minimumScaleFactor(0.7),
                      ]}
                    >
                      {row.value}
                    </Text>
                  </LabeledContent>
                ))
              ) : (
                <Text
                  modifiers={[
                    typeFont("body"),
                    foregroundStyle(theme.text),
                    frame({ maxWidth: Infinity, alignment: "leading" }),
                  ]}
                >
                  {detail.header}
                </Text>
              )}
            </Section>

            {linkedDocuments.length ? (
              <Section
                header={
                  <FormSectionHeader>
                    {t("medicalForm.documents")}
                  </FormSectionHeader>
                }
                modifiers={modifiers.row}
              >
                {linkedDocuments.map((document) => (
                  <Button
                    key={document.id}
                    onPress={() =>
                      router.push(
                        `/animal/${animalId}/document-preview?documentId=${document.id}`,
                      )
                    }
                  >
                    <Text>{document.title}</Text>
                  </Button>
                ))}
              </Section>
            ) : null}

            {notes ? (
              <Section
                header={
                  <FormSectionHeader>
                    {t("activityDetail.notes")}
                  </FormSectionHeader>
                }
                modifiers={modifiers.row}
              >
                <Text
                  modifiers={[
                    typeFont("body"),
                    foregroundStyle(theme.text),
                    frame({ maxWidth: Infinity, alignment: "leading" }),
                  ]}
                >
                  {notes}
                </Text>
              </Section>
            ) : null}
          </Form>
        </Host>
      </View>
    </>
  );
}
