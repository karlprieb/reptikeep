import type { ImageSourcePropType } from "react-native";

import type { ActivityType } from "@/constants/theme";

import BALANCE_ICON from "@/assets/images/icons/balance.xml";
import ECO_ICON from "@/assets/images/icons/eco.xml";
import LOCAL_HOSPITAL_ICON from "@/assets/images/icons/local-hospital.xml";
import NIGHTS_STAY_ICON from "@/assets/images/icons/nights-stay.xml";
import RESTAURANT_ICON from "@/assets/images/icons/restaurant.xml";
import WATER_DROP_ICON from "@/assets/images/icons/water-drop.xml";

export const ActivityIcons: Record<ActivityType, ImageSourcePropType> = {
  feed: RESTAURANT_ICON,
  shed: NIGHTS_STAY_ICON,
  poop: WATER_DROP_ICON,
  weight: BALANCE_ICON,
  habitat: ECO_ICON,
  medical: LOCAL_HOSPITAL_ICON,
};
