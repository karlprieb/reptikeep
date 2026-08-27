import { useValue } from "@legendapp/state/react";
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
  clickable,
  fillMaxWidth,
  padding,
  weight,
} from "@expo/ui/jetpack-compose/modifiers";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Animated, StatusBar, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import { EmptyState } from "@/components/empty-state";
import {
  ACTION_ICON_SIZE,
  formSheetAndroidStyles as styles,
  TITLE_LARGE,
  TOP_BAR_HEIGHT,
  useScrollLift,
} from "@/components/form-sheet";
import { DocumentKindIcons } from "@/constants/document-icons";
import { Spacing } from "@/constants/theme";
import { composeTextStyle } from "@/constants/type-font-compose";
import { useColorScheme, useTheme } from "@/hooks/use-theme";
import {
  DOCUMENT_KINDS,
  documents$,
  documentsForAnimal,
  removeDocument,
  type AnimalDocument,
} from "@/state/document";
import { formatAbsoluteDate } from "@/utils/format-date";
import { formatFileSize } from "@/utils/format-number";

import ADD_ICON from "@/assets/images/icons/add.xml";
import ARROW_BACK_ICON from "@/assets/images/icons/arrow-back.xml";
import CHEVRON_RIGHT_ICON from "@/assets/images/icons/chevron-right.xml";
import DELETE_ICON from "@/assets/images/icons/delete.xml";
import MODE_EDIT_ICON from "@/assets/images/icons/mode-edit.xml";
import MORE_VERT_ICON from "@/assets/images/icons/more-vert.xml";

function documentMeta(document: AnimalDocument): string {
  return [
    document.issuedDate ? formatAbsoluteDate(document.issuedDate) : null,
    formatFileSize(document.size),
  ]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

function DocumentRow({
  document,
  iconSize,
  onDelete,
}: {
  document: AnimalDocument;
  iconSize: number;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = documentMeta(document);
  const kindLabel = t(`documents.kind.${document.kind}`);

  return (
    <Box
      modifiers={[
        fillMaxWidth(),
        clickable(() =>
          router.push(
            `/animal/${document.animalId}/document-preview?documentId=${document.id}`,
          ),
        ),
      ]}
    >
      <Row
        verticalAlignment="center"
        horizontalArrangement={{ spacedBy: Spacing.sm }}
        modifiers={[fillMaxWidth(), padding(0, Spacing.sm, 0, Spacing.sm)]}
      >
        <Icon
          source={DocumentKindIcons[document.kind]}
          tint={theme.textSecondary}
          size={iconSize}
          contentDescription={kindLabel}
        />
        <Column
          horizontalAlignment="start"
          verticalArrangement={{ spacedBy: Spacing["2xs"] }}
          modifiers={[weight(1)]}
        >
          <Text
            style={composeTextStyle("body")}
            color={theme.text}
            maxLines={1}
            overflow="ellipsis"
          >
            {document.title}
          </Text>
          <Text style={composeTextStyle("data")} color={theme.textMuted}>
            {meta}
          </Text>
        </Column>

        <DropdownMenu
          expanded={menuOpen}
          onDismissRequest={() => setMenuOpen(false)}
          color={theme.surface}
        >
          <DropdownMenu.Trigger>
            <IconButton
              onClick={() => setMenuOpen(true)}
              colors={{ contentColor: theme.textMuted }}
            >
              <Icon
                source={MORE_VERT_ICON}
                tint={theme.textMuted}
                size={iconSize}
                contentDescription={t("documents.row.actions")}
              />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Items>
            <DropdownMenuItem
              onClick={() => {
                setMenuOpen(false);
                router.push(
                  `/animal/${document.animalId}/document?documentId=${document.id}`,
                );
              }}
            >
              <DropdownMenuItem.Text>
                <Text style={composeTextStyle("body")} color={theme.text}>
                  {t("documents.swipe.edit")}
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
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
              elementColors={{
                textColor: theme.danger,
                leadingIconColor: theme.danger,
              }}
            >
              <DropdownMenuItem.Text>
                <Text style={composeTextStyle("body")} color={theme.danger}>
                  {t("documents.swipe.delete")}
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

        <Icon source={CHEVRON_RIGHT_ICON} tint={theme.textMuted} size={16} />
      </Row>
    </Box>
  );
}

export default function AnimalDocumentsScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { id, animal } = useAnimalRoute();
  const documents = useValue(documents$);
  const { lifted, onScroll } = useScrollLift();

  if (!animal) return <AnimalNotFound />;

  const animalDocuments = documentsForAnimal(id, documents);
  const sections = DOCUMENT_KINDS.map((kind) => ({
    kind,
    items: animalDocuments.filter((document) => document.kind === kind),
  })).filter((section) => section.items.length > 0);

  const openAdd = () => router.push(`/animal/${id}/document`);

  const confirmDelete = (document: AnimalDocument) =>
    Alert.alert(
      t("documents.deleteTitle", { title: document.title }),
      t("documents.deleteMessage"),
      [
        { text: t("documents.cancel"), style: "cancel" },
        {
          text: t("documents.deleteConfirm"),
          style: "destructive",
          onPress: () => removeDocument(document.id),
        },
      ],
    );

  const iconSize = ACTION_ICON_SIZE;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {animalDocuments.length === 0 ? (
        <View
          style={[
            documentsStyles.empty,
            {
              backgroundColor: theme.bg,
              paddingTop: insets.top + TOP_BAR_HEIGHT,
            },
          ]}
        >
          <EmptyState
            title={t("documents.empty.title")}
            description={t("documents.empty.description")}
            action={{
              label: t("documents.add"),
              accessibilityHint: t("a11y.documents.add.hint"),
              onPress: openAdd,
            }}
          />
        </View>
      ) : (
        <Animated.ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingTop: insets.top + TOP_BAR_HEIGHT,
            paddingBottom: insets.bottom + Spacing.xl,
            paddingHorizontal: Spacing.md,
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
              verticalArrangement={{ spacedBy: Spacing.lg }}
              horizontalAlignment="start"
              modifiers={[fillMaxWidth()]}
            >
              {sections.map((section) => (
                <Column
                  key={section.kind}
                  horizontalAlignment="start"
                  verticalArrangement={{ spacedBy: Spacing.sm }}
                  modifiers={[fillMaxWidth()]}
                >
                  <Text
                    style={composeTextStyle("label")}
                    color={theme.textSecondary}
                  >
                    {t(`documents.kind.${section.kind}`).toUpperCase()}
                  </Text>
                  {section.items.map((document) => (
                    <DocumentRow
                      key={document.id}
                      document={document}
                      iconSize={iconSize}
                      onDelete={() => confirmDelete(document)}
                    />
                  ))}
                </Column>
              ))}
            </Column>
          </Host>
        </Animated.ScrollView>
      )}

      <View
        style={[documentsStyles.topBar, { paddingTop: insets.top }]}
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
          style={documentsStyles.topBarHost}
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
              {t("documents.title")}
            </Text>

            <IconButton
              onClick={openAdd}
              colors={{ contentColor: theme.primary }}
            >
              <Icon
                source={ADD_ICON}
                tint={theme.primary}
                size={iconSize}
                contentDescription={t("documents.add")}
              />
            </IconButton>
          </Row>
        </Host>
      </View>
    </View>
  );
}

const documentsStyles = StyleSheet.create({
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  topBarHost: {
    width: "100%",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },
});
