import {
  Button,
  Form,
  Host,
  HStack,
  Image,
  Section,
  Spacer,
  SwipeActions,
  Text,
  VStack,
} from "@expo/ui/swift-ui";
import {
  accessibilityHint,
  accessibilityLabel,
  buttonStyle,
  contentShape,
  foregroundStyle,
  frame,
  shapes,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { useValue } from "@legendapp/state/react";
import { router, Stack } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import { EmptyState } from "@/components/empty-state";
import { FormSectionHeader, useFormModifiers } from "@/components/form-sheet";
import { Spacing, type SFSymbolName, type Theme } from "@/constants/theme";
import { typeFont } from "@/constants/type-font";
import { useTheme } from "@/hooks/use-theme";
import {
  DOCUMENT_KINDS,
  documents$,
  documentsForAnimal,
  removeDocument,
  type AnimalDocument,
  type DocumentKind,
} from "@/state/document";
import { formatAbsoluteDate } from "@/utils/format-date";
import { formatFileSize } from "@/utils/format-number";

const KIND_SYMBOLS: Record<DocumentKind, SFSymbolName> = {
  invoice: "doc.text",
  authenticity: "checkmark.seal",
  origin: "globe",
  permit: "signature",
  medical: "cross.case",
  other: "paperclip",
};

function documentMeta(document: AnimalDocument): string {
  return [
    document.issuedDate ? formatAbsoluteDate(document.issuedDate) : null,
    formatFileSize(document.size),
  ]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

type DocumentRowProps = {
  document: AnimalDocument;
  theme: Theme;
  onDelete: () => void;
};

function DocumentRow({ document, theme, onDelete }: DocumentRowProps) {
  const { t } = useTranslation();
  const meta = documentMeta(document);
  const kindLabel = t(`documents.kind.${document.kind}`);

  return (
    <SwipeActions>
      <Button
        onPress={() =>
          router.push(
            `/animal/${document.animalId}/document-preview?documentId=${document.id}`,
          )
        }
        modifiers={[
          buttonStyle("plain"),
          accessibilityLabel(
            [document.title, kindLabel, meta]
              .filter((part): part is string => Boolean(part))
              .join(", "),
          ),
          accessibilityHint(t("a11y.documents.row.hint")),
        ]}
      >
        <HStack
          alignment="center"
          spacing={Spacing.sm}
          modifiers={[
            frame({ maxWidth: Infinity }),
            contentShape(shapes.rectangle()),
          ]}
        >
          <Image
            systemName={KIND_SYMBOLS[document.kind]}
            modifiers={[foregroundStyle(theme.textSecondary)]}
          />
          <VStack alignment="leading" spacing={Spacing["2xs"]}>
            <Text modifiers={[typeFont("body"), foregroundStyle(theme.text)]}>
              {document.title}
            </Text>
            <Text
              modifiers={[typeFont("data"), foregroundStyle(theme.textMuted)]}
            >
              {meta}
            </Text>
          </VStack>
          <Spacer />
          <Image
            systemName="chevron.right"
            modifiers={[foregroundStyle(theme.textMuted)]}
          />
        </HStack>
      </Button>

      <SwipeActions.Actions edge="leading">
        <Button
          label={t("documents.swipe.edit")}
          systemImage="square.and.pencil"
          onPress={() =>
            router.push(
              `/animal/${document.animalId}/document?documentId=${document.id}`,
            )
          }
          modifiers={[tint(theme.primary)]}
        />
      </SwipeActions.Actions>

      <SwipeActions.Actions edge="trailing">
        <Button
          label={t("documents.swipe.delete")}
          systemImage="trash"
          onPress={onDelete}
          modifiers={[tint(theme.danger)]}
        />
      </SwipeActions.Actions>
    </SwipeActions>
  );
}

export default function AnimalDocumentsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const modifiers = useFormModifiers();
  const { id, animal } = useAnimalRoute();
  const documents = useValue(documents$);

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

  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="plus"
          tintColor={theme.primary}
          accessibilityLabel={t("documents.add")}
          accessibilityHint={t("a11y.documents.add.hint")}
          onPress={openAdd}
        />
      </Stack.Toolbar>

      {animalDocuments.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: theme.bg }]}>
          <EmptyState
            title={t("documents.empty.title")}
            description={t("documents.empty.description")}
            systemImage="doc.text"
            action={{
              label: t("documents.add"),
              accessibilityHint: t("a11y.documents.add.hint"),
              onPress: openAdd,
            }}
          />
        </View>
      ) : (
        <Host style={styles.host} useViewportSizeMeasurement>
          <Form modifiers={modifiers.form}>
            {sections.map((section) => (
              <Section
                key={section.kind}
                header={
                  <FormSectionHeader>
                    {t(`documents.kind.${section.kind}`)}
                  </FormSectionHeader>
                }
                modifiers={modifiers.row}
              >
                {section.items.map((document) => (
                  <DocumentRow
                    key={document.id}
                    document={document}
                    theme={theme}
                    onDelete={() => confirmDelete(document)}
                  />
                ))}
              </Section>
            ))}
          </Form>
        </Host>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },
});
