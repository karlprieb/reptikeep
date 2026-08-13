import type { TFunction } from "i18next";
import { Alert } from "react-native";

export function confirmDeleteActivity(
  t: TFunction,
  activityType: string,
  onConfirm: () => void,
  deletesLinkedDocuments = false,
): void {
  Alert.alert(
    t("activityDetail.deleteTitle", { activityType }),
    t(
      deletesLinkedDocuments
        ? "activityDetail.deleteMedicalMessage"
        : "activityDetail.deleteMessage",
    ),
    [
      { text: t("activityDetail.cancel"), style: "cancel" },
      {
        text: t("activityDetail.deleteConfirm"),
        style: "destructive",
        onPress: onConfirm,
      },
    ],
  );
}
