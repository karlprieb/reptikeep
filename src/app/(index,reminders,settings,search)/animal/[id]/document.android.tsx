import {
  Box,
  Column,
  DropdownMenu,
  DropdownMenuItem,
  Host,
  Icon,
  OutlinedTextField,
  Text,
  useNativeState,
} from "@expo/ui/jetpack-compose";
import {
  background,
  clickable,
  clip,
  fillMaxWidth,
  height,
  Shapes,
} from "@expo/ui/jetpack-compose/modifiers";
import { useValue } from "@legendapp/state/react";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Animated, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import { ThemedText } from "@/components/themed-text";
import {
  DateField,
  FormSheetTopBar,
  MenuField,
  Section,
  SwitchRow,
} from "@/components/form-sheet";
import {
  formSheetAndroidStyles as styles,
  fieldColors,
} from "@/constants/form-sheet-android";
import {
  ACTION_ICON_SIZE,
  TOP_BAR_HEIGHT,
  useScrollLift,
} from "@/utils/form-sheet-shared";
import { Radius, Spacing, StackAboveFontScale } from "@/constants/theme";
import { composeTextStyle } from "@/constants/type-font-compose";
import { useDocumentForm } from "@/hooks/use-document-form";
import { useTheme } from "@/hooks/use-theme";
import {
  DOCUMENT_KINDS,
  documents$,
  type AnimalDocument,
} from "@/state/document";
import { type DocumentExtension } from "@/utils/animal-document-storage";
import { formatFileSize } from "@/utils/format-number";

import ADD_ICON from "@/assets/images/icons/add.xml";
import DESCRIPTION_ICON from "@/assets/images/icons/description.xml";
import FOLDER_ICON from "@/assets/images/icons/folder.xml";
import PHOTO_CAMERA_ICON from "@/assets/images/icons/photo-camera.xml";
import PHOTO_ICON from "@/assets/images/icons/photo.xml";

const FILE_WELL_HEIGHT = 140;

const EXTENSION_ICONS: Record<DocumentExtension, typeof DESCRIPTION_ICON> = {
  pdf: DESCRIPTION_ICON,
  jpg: PHOTO_ICON,
  png: PHOTO_ICON,
  heic: PHOTO_ICON,
};

type DocumentFormSheetProps = {
  animalId: string;
  animalName: string;
  document?: AnimalDocument;
};

function DocumentFormSheet({ animalId, document }: DocumentFormSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const { lifted, onScroll } = useScrollLift();

  const titleText = useNativeState(document?.title ?? "");
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
  const {
    setTitle,
    kind,
    setKind,
    knownIssueDate,
    setKnownIssueDate,
    issueDate,
    setIssueDate,
    fileError,
    fileDisplay,
    wellLabel,
    canSave,
    saveError,
    linkedToMedical,
    handlePickFiles,
    handlePickPhotos,
    handlePickCamera,
    handleConfirm,
  } = useDocumentForm({
    animalId,
    document,
    onTitleDerived: (derived) => titleText.set(derived),
    onPickStart: () => setSourceMenuOpen(false),
  });

  const iconSize = ACTION_ICON_SIZE * Math.min(fontScale, 2);
  const horizontalInset = Spacing.md * Math.min(fontScale, StackAboveFontScale);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + TOP_BAR_HEIGHT * Math.min(fontScale, 1.5),
          paddingBottom: insets.bottom + Spacing["2xl"],
          paddingHorizontal: horizontalInset,
        }}
        keyboardShouldPersistTaps="handled"
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
            <Section footerColor={theme.danger} footer={fileError}>
              <DropdownMenu
                expanded={sourceMenuOpen}
                onDismissRequest={() => setSourceMenuOpen(false)}
                color={theme.surface}
              >
                <DropdownMenu.Trigger>
                  <Box
                    contentAlignment="center"
                    modifiers={[
                      fillMaxWidth(),
                      height(FILE_WELL_HEIGHT),
                      clip(Shapes.RoundedCorner(Radius.lg)),
                      background(theme.surfaceSunken),
                      clickable(() => setSourceMenuOpen(true)),
                    ]}
                  >
                    <Column
                      horizontalAlignment="center"
                      verticalArrangement={{ spacedBy: Spacing["2xs"] }}
                    >
                      <Icon
                        source={
                          fileDisplay
                            ? EXTENSION_ICONS[fileDisplay.extension]
                            : ADD_ICON
                        }
                        tint={theme.textSecondary}
                        size={28}
                        contentDescription={wellLabel}
                      />
                      {fileDisplay ? (
                        <>
                          <Text
                            style={composeTextStyle("body")}
                            color={theme.text}
                            maxLines={1}
                            overflow="ellipsis"
                          >
                            {fileDisplay.name}
                          </Text>
                          <Text
                            style={composeTextStyle("data")}
                            color={theme.textMuted}
                          >
                            {formatFileSize(fileDisplay.size)}
                          </Text>
                        </>
                      ) : (
                        <Text
                          style={composeTextStyle("bodyS")}
                          color={theme.textSecondary}
                        >
                          {t("documents.form.chooseFile")}
                        </Text>
                      )}
                    </Column>
                  </Box>
                </DropdownMenu.Trigger>
                <DropdownMenu.Items>
                  <DropdownMenuItem onClick={() => void handlePickFiles()}>
                    <DropdownMenuItem.Text>
                      <Text style={composeTextStyle("body")} color={theme.text}>
                        {t("documents.form.source.files")}
                      </Text>
                    </DropdownMenuItem.Text>
                    <DropdownMenuItem.LeadingIcon>
                      <Icon
                        source={FOLDER_ICON}
                        tint={theme.text}
                        size={iconSize}
                      />
                    </DropdownMenuItem.LeadingIcon>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handlePickPhotos()}>
                    <DropdownMenuItem.Text>
                      <Text style={composeTextStyle("body")} color={theme.text}>
                        {t("documents.form.source.photos")}
                      </Text>
                    </DropdownMenuItem.Text>
                    <DropdownMenuItem.LeadingIcon>
                      <Icon
                        source={PHOTO_ICON}
                        tint={theme.text}
                        size={iconSize}
                      />
                    </DropdownMenuItem.LeadingIcon>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handlePickCamera()}>
                    <DropdownMenuItem.Text>
                      <Text style={composeTextStyle("body")} color={theme.text}>
                        {t("documents.form.source.camera")}
                      </Text>
                    </DropdownMenuItem.Text>
                    <DropdownMenuItem.LeadingIcon>
                      <Icon
                        source={PHOTO_CAMERA_ICON}
                        tint={theme.text}
                        size={iconSize}
                      />
                    </DropdownMenuItem.LeadingIcon>
                  </DropdownMenuItem>
                </DropdownMenu.Items>
              </DropdownMenu>
            </Section>

            <Section title={t("documents.form.details")}>
              <OutlinedTextField
                value={titleText}
                onValueChange={(value) => setTitle(value)}
                colors={fieldColors(theme)}
                keyboardOptions={{ capitalization: "sentences" }}
                singleLine
                modifiers={[fillMaxWidth()]}
              >
                <OutlinedTextField.Label>
                  <Text>{t("documents.form.titleField")}</Text>
                </OutlinedTextField.Label>
              </OutlinedTextField>

              {linkedToMedical ? (
                <Text style={composeTextStyle("body")} color={theme.text}>
                  {t("documents.form.linkedMedicalKind")}
                </Text>
              ) : (
                <MenuField
                  label={t("documents.form.kindField")}
                  value={t(`documents.kind.${kind}`)}
                  theme={theme}
                  iconSize={iconSize}
                  items={DOCUMENT_KINDS.map((value) => ({
                    value,
                    label: t(`documents.kind.${value}`),
                    selected: value === kind,
                  }))}
                  onSelect={setKind}
                />
              )}

              <SwitchRow
                label={t("documents.form.knownIssueDate")}
                checked={knownIssueDate}
                onCheckedChange={setKnownIssueDate}
                theme={theme}
              />

              {knownIssueDate ? (
                <DateField
                  label={t("documents.form.issueDate")}
                  date={issueDate}
                  onSelect={setIssueDate}
                  theme={theme}
                  iconSize={iconSize}
                  confirmLabel={t("newReptile.save")}
                  dismissLabel={t("newReptile.cancel")}
                />
              ) : null}
            </Section>
          </Column>
        </Host>
      </Animated.ScrollView>

      <FormSheetTopBar
        namespace="documents.form"
        editing={Boolean(document)}
        saveDisabled={!canSave}
        onCancel={() => router.back()}
        onSave={() => void handleConfirm()}
        lifted={lifted}
        insetsTop={insets.top}
        iconSize={iconSize}
      />

      {saveError ? (
        <View
          style={[
            documentFormStyles.saveError,
            { borderTopColor: theme.border, bottom: insets.bottom },
          ]}
        >
          <ThemedText
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            type="bodyS"
            themeColor="danger"
          >
            {saveError}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

export default function DocumentFormScreen() {
  const { t } = useTranslation();
  const { animal } = useAnimalRoute();
  const { documentId } = useLocalSearchParams<{ documentId?: string }>();
  const documents = useValue(documents$);
  const candidate = documentId ? documents[documentId] : undefined;
  const sameAnimal = candidate?.animalId === animal?.id;
  const document = sameAnimal ? candidate : undefined;

  if (!animal) return <AnimalNotFound />;
  if (documentId && !document)
    return (
      <AnimalNotFound
        title={t("documents.notFound")}
        description={t("documents.notFoundSubtitle")}
      />
    );

  return (
    <DocumentFormSheet
      animalId={animal.id}
      animalName={animal.name}
      document={document}
    />
  );
}

const documentFormStyles = {
  saveError: {
    position: "absolute" as const,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
};
