import { useColorScheme as useRNColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

export function useColorScheme(): "light" | "dark" {
  return useRNColorScheme() === "dark" ? "dark" : "light";
}

export function useTheme() {
  return Colors[useColorScheme()];
}
