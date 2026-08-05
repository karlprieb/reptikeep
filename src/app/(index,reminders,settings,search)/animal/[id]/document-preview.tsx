import { useValue } from "@legendapp/state/react";
import { File } from "expo-file-system";
import { Stack, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import PdfRendererView from "react-native-pdf-renderer";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/empty-state";
import { Spacing, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { documents$ } from "@/state/document";
import {
  documentMimeType,
  documentUti,
  getAnimalDocumentUri,
} from "@/utils/animal-document-storage";
import { formatAbsoluteDate } from "@/utils/format-date";

export default function DocumentPreviewScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { documentId } = useLocalSearchParams<{ documentId?: string }>();
  const documents = useValue(documents$);
  const document = documentId ? documents[documentId] : undefined;

  const uri = document ? getAnimalDocumentUri(document.file) : undefined;
  const fileExists = useMemo(() => Boolean(uri && new File(uri).exists), [uri]);
  const isImage = document ? document.extension !== "pdf" : false;
  const [aspectRatio, setAspectRatio] = useState<number>();

  useEffect(() => {
    if (!uri || !isImage) return;

    let active = true;
    Image.getSize(uri, (width, height) => {
      if (active && height > 0) setAspectRatio(width / height);
    });

    return () => {
      active = false;
    };
  }, [uri, isImage]);

  if (!document || !uri || !fileExists) {
    return (
      <View style={[styles.missing, { backgroundColor: theme.bg }]}>
        <EmptyState
          title={t("documents.preview.missingTitle")}
          description={t("documents.preview.missingDescription")}
          systemImage="doc.text"
        />
      </View>
    );
  }

  const handleShare = () => {
    void Sharing.shareAsync(uri, {
      mimeType: documentMimeType(document.extension),
      UTI: documentUti(document.extension),
    });
  };

  const accessibilityLabel = [
    document.title,
    t(`documents.kind.${document.kind}`),
    document.issuedDate ? formatAbsoluteDate(document.issuedDate) : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(", ");

  return (
    <>
      <Stack.Title
        style={{ fontFamily: Typography.title.fontFamily, color: theme.text }}
      >
        {document.title}
      </Stack.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="square.and.arrow.up"
          tintColor={theme.primary}
          accessibilityLabel={t("documents.preview.share")}
          accessibilityHint={t("a11y.documents.share.hint")}
          onPress={handleShare}
        />
      </Stack.Toolbar>

      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        {isImage ? (
          <ScrollView
            style={styles.viewer}
            contentContainerStyle={styles.imagePage}
            contentInsetAdjustmentBehavior="never"
            automaticallyAdjustContentInsets={false}
            contentInset={{ top: 0, bottom: 0, left: 0, right: 0 }}
            contentOffset={{ x: 0, y: 0 }}
            maximumZoomScale={5}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
          >
            <Image
              source={{ uri }}
              style={[
                styles.image,
                { borderColor: theme.border },
                aspectRatio ? { aspectRatio } : null,
              ]}
              resizeMode="contain"
              accessible
              accessibilityLabel={accessibilityLabel}
              accessibilityIgnoresInvertColors
            />
          </ScrollView>
        ) : (
          <View
            style={styles.viewer}
            accessible
            accessibilityLabel={accessibilityLabel}
          >
            <PdfRendererView
              source={uri}
              distanceBetweenPages={Spacing.md}
              style={[styles.viewer, { backgroundColor: theme.bg }]}
            />
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  viewer: {
    flex: 1,
  },
  imagePage: {
    flexGrow: 1,
    justifyContent: "center",
  },
  image: {
    width: "100%",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  missing: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },
});
