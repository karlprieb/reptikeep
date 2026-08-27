import type { ImageSourcePropType } from "react-native";

import type { DocumentKind } from "@/state/document";

import ATTACH_FILE_ICON from "@/assets/images/icons/attach-file.xml";
import DESCRIPTION_ICON from "@/assets/images/icons/description.xml";
import DRAW_ICON from "@/assets/images/icons/draw.xml";
import LOCAL_HOSPITAL_ICON from "@/assets/images/icons/local-hospital.xml";
import PUBLIC_ICON from "@/assets/images/icons/public.xml";
import VERIFIED_ICON from "@/assets/images/icons/verified.xml";

export const DocumentKindIcons: Record<DocumentKind, ImageSourcePropType> = {
  invoice: DESCRIPTION_ICON,
  authenticity: VERIFIED_ICON,
  origin: PUBLIC_ICON,
  permit: DRAW_ICON,
  medical: LOCAL_HOSPITAL_ICON,
  other: ATTACH_FILE_ICON,
};
