import { Stack } from "expo-router/stack";
import { Platform } from "react-native";
import { useTranslation } from "react-i18next";

import { useTheme } from "@/hooks/use-theme";

export const unstable_settings = {
  initialRouteName: "index",
  index: { anchor: "index" },
  reminders: { anchor: "reminders" },
  settings: { anchor: "settings" },
  search: { anchor: "search" },
};

const SELF_HEADED_ANDROID = new Set(["index", "reminders", "settings"]);

const ROOT_SCREEN_BY_GROUP = {
  "(index)": "index",
  "(reminders)": "reminders",
  "(settings)": "settings",
  "(search)": "search",
} as const;

type RootGroup = keyof typeof ROOT_SCREEN_BY_GROUP;

const FORM_SHEET_OPTIONS = {
  presentation: "formSheet",
  sheetGrabberVisible: true,
  headerShown: true,
  headerTransparent: true,
  headerBlurEffect: "systemChromeMaterial",
} as const;

const REPTILE_FORM_OPTIONS =
  Platform.OS === "android"
    ? ({
        presentation: "card",
        animation: "slide_from_bottom",
        headerShown: false,
      } as const)
    : FORM_SHEET_OPTIONS;

const ACTIVITY_SHEET_OPTIONS = {
  sheetAllowedDetents: [0.85, 1],
  sheetInitialDetentIndex: "last" as const,
  sheetExpandsWhenScrolledToEdge: true,
};

const ACTIVITY_FORM_OPTIONS =
  Platform.OS === "android"
    ? ({
        presentation: "card",
        animation: "slide_from_bottom",
        headerShown: false,
      } as const)
    : { ...FORM_SHEET_OPTIONS, ...ACTIVITY_SHEET_OPTIONS };

const DETAIL_SCREEN_OPTIONS =
  Platform.OS === "android"
    ? ({ headerShown: false } as const)
    : {
        headerTransparent: true,
        headerTitle: "",
        headerBackButtonDisplayMode: "minimal" as const,
      };

export default function TabStackLayout({ segment }: { segment: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const screenName =
    ROOT_SCREEN_BY_GROUP[segment as RootGroup] ??
    ROOT_SCREEN_BY_GROUP["(index)"];

  return (
    <Stack
      screenOptions={{
        headerTransparent: Platform.OS === "ios",
        headerStyle:
          Platform.OS === "android" ? { backgroundColor: theme.bg } : undefined,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerBlurEffect: "none",
        headerLargeStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen
        name={screenName}
        options={{
          headerShown: !(
            Platform.OS === "android" && SELF_HEADED_ANDROID.has(screenName)
          ),
        }}
      />
      <Stack.Screen
        name="about"
        options={{
          title: t("about.title"),
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="backup-restore"
        options={{
          title: t("backup.title"),
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="add-reptile"
        options={{ ...REPTILE_FORM_OPTIONS, title: t("newReptile.title") }}
      />
      <Stack.Screen name="animal/[id]" options={DETAIL_SCREEN_OPTIONS} />
      <Stack.Screen
        name="animal/[id]/history"
        options={
          Platform.OS === "android"
            ? { headerShown: false }
            : { headerBackButtonDisplayMode: "minimal" }
        }
      />
      <Stack.Screen
        name="animal/[id]/history-range"
        options={{
          ...ACTIVITY_FORM_OPTIONS,
          title: t("timeline.range.customTitle"),
        }}
      />
      <Stack.Screen
        name="animal/[id]/documents"
        options={
          Platform.OS === "android"
            ? { headerShown: false }
            : {
                title: t("documents.title"),
                headerBackButtonDisplayMode: "minimal",
              }
        }
      />
      <Stack.Screen
        name="animal/[id]/document"
        options={{ ...ACTIVITY_FORM_OPTIONS, title: t("documents.form.title") }}
      />
      <Stack.Screen
        name="animal/[id]/document-preview"
        options={{ headerBackButtonDisplayMode: "minimal" }}
      />
      <Stack.Screen
        name="animal/[id]/edit"
        options={{ ...REPTILE_FORM_OPTIONS, title: t("editReptile.title") }}
      />
      <Stack.Screen
        name="animal/[id]/feed"
        options={{ ...ACTIVITY_FORM_OPTIONS, title: t("feedingForm.title") }}
      />
      <Stack.Screen
        name="animal/[id]/weight"
        options={{ ...ACTIVITY_FORM_OPTIONS, title: t("weightForm.title") }}
      />
      <Stack.Screen
        name="animal/[id]/shed"
        options={{ ...ACTIVITY_FORM_OPTIONS, title: t("shedForm.title") }}
      />
      <Stack.Screen
        name="animal/[id]/poop"
        options={{
          ...ACTIVITY_FORM_OPTIONS,
          title: t("defecationForm.title"),
        }}
      />
      <Stack.Screen
        name="animal/[id]/habitat"
        options={{ ...ACTIVITY_FORM_OPTIONS, title: t("habitatForm.title") }}
      />
      <Stack.Screen
        name="animal/[id]/medical"
        options={{ ...ACTIVITY_FORM_OPTIONS, title: t("medicalForm.title") }}
      />
      <Stack.Screen
        name="animal/[id]/activity"
        options={{
          ...ACTIVITY_FORM_OPTIONS,
          title: t("activityDetail.title"),
        }}
      />
    </Stack>
  );
}
