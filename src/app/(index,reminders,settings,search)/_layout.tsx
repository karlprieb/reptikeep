import { Stack } from "expo-router/stack";
import { useTranslation } from "react-i18next";

export const unstable_settings = {
  initialRouteName: "index",
  index: { anchor: "index" },
  reminders: { anchor: "reminders" },
  settings: { anchor: "settings" },
  search: { anchor: "search" },
};

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

const ACTIVITY_SHEET_OPTIONS = {
  sheetAllowedDetents: [0.85, 1],
  sheetInitialDetentIndex: "last" as const,
  sheetExpandsWhenScrolledToEdge: true,
};

export default function TabStackLayout({ segment }: { segment: string }) {
  const { t } = useTranslation();
  const screenName =
    ROOT_SCREEN_BY_GROUP[segment as RootGroup] ??
    ROOT_SCREEN_BY_GROUP["(index)"];

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerBlurEffect: "none",
        headerLargeStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name={screenName} />
      <Stack.Screen
        name="about"
        options={{
          title: t("about.title"),
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="add-reptile"
        options={{ ...FORM_SHEET_OPTIONS, title: t("newReptile.title") }}
      />
      <Stack.Screen
        name="animal/[id]"
        options={{
          headerTransparent: true,
          headerTitle: "",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <Stack.Screen
        name="animal/[id]/history"
        options={{ headerBackButtonDisplayMode: "minimal" }}
      />
      <Stack.Screen
        name="animal/[id]/edit"
        options={{ ...FORM_SHEET_OPTIONS, title: t("editReptile.title") }}
      />
      <Stack.Screen
        name="animal/[id]/feed"
        options={{
          ...FORM_SHEET_OPTIONS,
          ...ACTIVITY_SHEET_OPTIONS,
          title: t("feedingForm.title"),
        }}
      />
      <Stack.Screen
        name="animal/[id]/weight"
        options={{
          ...FORM_SHEET_OPTIONS,
          ...ACTIVITY_SHEET_OPTIONS,
          title: t("weightForm.title"),
        }}
      />
      <Stack.Screen
        name="animal/[id]/shed"
        options={{
          ...FORM_SHEET_OPTIONS,
          ...ACTIVITY_SHEET_OPTIONS,
          title: t("shedForm.title"),
        }}
      />
      <Stack.Screen
        name="animal/[id]/poop"
        options={{
          ...FORM_SHEET_OPTIONS,
          ...ACTIVITY_SHEET_OPTIONS,
          title: t("defecationForm.title"),
        }}
      />
      <Stack.Screen
        name="animal/[id]/habitat"
        options={{
          ...FORM_SHEET_OPTIONS,
          ...ACTIVITY_SHEET_OPTIONS,
          title: t("habitatForm.title"),
        }}
      />
      <Stack.Screen
        name="animal/[id]/activity"
        options={{
          ...FORM_SHEET_OPTIONS,
          ...ACTIVITY_SHEET_OPTIONS,
          title: t("activityDetail.title"),
        }}
      />
    </Stack>
  );
}
