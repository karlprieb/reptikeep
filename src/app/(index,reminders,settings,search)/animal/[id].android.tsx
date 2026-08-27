import {
  DropdownMenu,
  DropdownMenuItem,
  Host,
  Icon,
  IconButton,
  Row,
  Text,
} from "@expo/ui/jetpack-compose";
import {
  defaultMinSize,
  fillMaxWidth,
  padding,
  weight,
} from "@expo/ui/jetpack-compose/modifiers";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, StatusBar, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddActivitySheet } from "@/components/add-activity-sheet";
import { AnimalDetail } from "@/components/animal-detail";
import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import {
  ACTION_ICON_SIZE,
  TOP_BAR_HEIGHT,
  useScrollLift,
} from "@/components/form-sheet";
import { Spacing } from "@/constants/theme";
import { useAddActivity } from "@/hooks/use-add-activity";
import { useColorScheme, useTheme } from "@/hooks/use-theme";
import { removeAnimal } from "@/state/animal";

import ADD_ICON from "@/assets/images/icons/add.xml";
import ARROW_BACK_ICON from "@/assets/images/icons/arrow-back.xml";
import DELETE_ICON from "@/assets/images/icons/delete.xml";
import DESCRIPTION_ICON from "@/assets/images/icons/description.xml";
import MODE_EDIT_ICON from "@/assets/images/icons/mode-edit.xml";
import MORE_VERT_ICON from "@/assets/images/icons/more-vert.xml";

export default function AnimalDetailScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { id, animal } = useAnimalRoute();
  const addActivity = useAddActivity(id);
  const pendingDelete = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { lifted, onScroll } = useScrollLift();

  useEffect(
    () => () => {
      if (pendingDelete.current && id) removeAnimal(id);
    },
    [id],
  );

  if (!animal) return <AnimalNotFound />;

  const iconSize = ACTION_ICON_SIZE;

  const confirmDelete = () =>
    Alert.alert(
      t("animal.deleteTitle", { animalName: animal.name }),
      t("animal.deleteMessage", { animalName: animal.name }),
      [
        { text: t("animal.cancel"), style: "cancel" },
        {
          text: t("animal.deleteConfirm"),
          style: "destructive",
          onPress: () => {
            setMenuOpen(false);
            pendingDelete.current = true;
            router.back();
          },
        },
      ],
    );

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: animal.photo ? 0 : insets.top + TOP_BAR_HEIGHT,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        <AnimalDetail animal={animal} onAddActivity={addActivity.open} />
      </Animated.ScrollView>

      <View
        style={[styles.topBar, { paddingTop: insets.top }]}
        pointerEvents="box-none"
      >
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle={scheme === "dark" ? "light-content" : "dark-content"}
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
              padding(4, Spacing["2xs"], Spacing.md, Spacing["2xs"]),
            ]}
          >
            <IconButton
              onClick={() => router.back()}
              colors={{ contentColor: theme.text }}
            >
              <Icon
                source={ARROW_BACK_ICON}
                tint={theme.text}
                size={iconSize}
                contentDescription={t("animal.back")}
              />
            </IconButton>

            <Row modifiers={[weight(1)]} />

            <IconButton
              onClick={addActivity.open}
              colors={{ contentColor: theme.primary }}
            >
              <Icon
                source={ADD_ICON}
                tint={theme.primary}
                size={iconSize}
                contentDescription={t("animal.addActivity")}
              />
            </IconButton>

            <DropdownMenu
              expanded={menuOpen}
              onDismissRequest={() => setMenuOpen(false)}
              color={theme.surface}
            >
              <DropdownMenu.Trigger>
                <IconButton
                  onClick={() => setMenuOpen(true)}
                  colors={{ contentColor: theme.text }}
                >
                  <Icon
                    source={MORE_VERT_ICON}
                    tint={theme.text}
                    size={iconSize}
                    contentDescription={t("animal.actions")}
                  />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Items>
                <DropdownMenuItem
                  onClick={() => {
                    setMenuOpen(false);
                    router.push(`/animal/${id}/documents`);
                  }}
                >
                  <DropdownMenuItem.Text>
                    <Text color={theme.text}>{t("documents.title")}</Text>
                  </DropdownMenuItem.Text>
                  <DropdownMenuItem.LeadingIcon>
                    <Icon
                      source={DESCRIPTION_ICON}
                      tint={theme.text}
                      size={iconSize}
                    />
                  </DropdownMenuItem.LeadingIcon>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setMenuOpen(false);
                    router.push(`/animal/${id}/edit`);
                  }}
                >
                  <DropdownMenuItem.Text>
                    <Text color={theme.text}>{t("animal.edit")}</Text>
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
                  onClick={confirmDelete}
                  elementColors={{
                    textColor: theme.danger,
                    leadingIconColor: theme.danger,
                  }}
                >
                  <DropdownMenuItem.Text>
                    <Text color={theme.danger}>{t("animal.delete")}</Text>
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

      <AddActivitySheet
        visible={addActivity.visible}
        animalName={animal.name}
        onClose={addActivity.close}
        onDismiss={addActivity.dismiss}
        onPick={addActivity.pick}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
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
});
