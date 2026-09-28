import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { Animal } from "@/state/animal";
import {
  DEFAULT_LABEL_DEFAULTS,
  setLabelDefaults,
  settings$,
  type LabelDefaults,
} from "@/state/settings";
import {
  availableLabelFields,
  createLabelPdf,
  DEFAULT_LABEL_FIELDS,
  deleteLabelPdf,
  hasLabelContent,
  LABEL_SIZES,
  LABEL_TARGETS,
  PAPER_SIZES,
  printLabelPdf,
  shareLabelPdf,
  type LabelFields,
  type LabelSize,
  type LabelTarget,
  type PaperSize,
} from "@/utils/animal-label";

const REGENERATE_DEBOUNCE_MS = 300;

function pick<T>(options: readonly T[], value: T | undefined, fallback: T): T {
  return value !== undefined && options.includes(value) ? value : fallback;
}

export function readLabelDefaults(
  saved: Partial<LabelDefaults> | undefined,
): LabelDefaults {
  return {
    size: pick(LABEL_SIZES, saved?.size, DEFAULT_LABEL_DEFAULTS.size),
    target: pick(LABEL_TARGETS, saved?.target, DEFAULT_LABEL_DEFAULTS.target),
    paper: pick(PAPER_SIZES, saved?.paper, DEFAULT_LABEL_DEFAULTS.paper),
  };
}

export function useLabelEditor(
  animal: Animal | undefined,
  onError: () => void,
) {
  const { t } = useTranslation();
  const [defaults] = useState(() =>
    readLabelDefaults(settings$.labelDefaults.peek()),
  );
  const [size, setSize] = useState<LabelSize>(defaults.size);
  const [target, setTarget] = useState<LabelTarget>(defaults.target);
  const [paper, setPaper] = useState<PaperSize>(defaults.paper);
  const [fields, setFields] = useState<LabelFields>(DEFAULT_LABEL_FIELDS);
  const [previewUri, setPreviewUri] = useState<string>();

  const generation = useRef(0);
  const shownPreview = useRef<string | undefined>(undefined);
  const lastOutput = useRef<string | undefined>(undefined);
  const outputBusy = useRef(false);
  const reportError = useRef(onError);
  useEffect(() => {
    reportError.current = onError;
  });

  const hasContent = animal ? hasLabelContent(animal, fields) : false;

  useEffect(() => {
    const id = ++generation.current;
    if (!animal || !hasContent) return;

    const handle = setTimeout(() => {
      createLabelPdf(
        animal,
        { size: "tag", target, paper: "label", fields },
        t,
      ).then(
        (uri) => {
          if (id !== generation.current) {
            deleteLabelPdf(uri);
            return;
          }
          const stale = shownPreview.current;
          shownPreview.current = uri;
          setPreviewUri(uri);
          if (stale) deleteLabelPdf(stale);
        },
        () => {
          if (id === generation.current) reportError.current();
        },
      );
    }, REGENERATE_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [animal, hasContent, target, fields, t]);

  useEffect(
    () => () => {
      generation.current++;
      if (shownPreview.current) deleteLabelPdf(shownPreview.current);
      shownPreview.current = undefined;
    },
    [],
  );

  const output = async (send: (uri: string) => Promise<void>) => {
    if (!animal || outputBusy.current) return;
    outputBusy.current = true;
    try {
      const uri = await createLabelPdf(
        animal,
        { size, target, paper, fields },
        t,
      );
      if (lastOutput.current) deleteLabelPdf(lastOutput.current);
      lastOutput.current = uri;
      await send(uri);
    } catch {
      reportError.current();
    } finally {
      outputBusy.current = false;
    }
  };

  return {
    size,
    target,
    paper,
    fields,
    previewUri,
    hasContent,
    fieldKeys: animal ? availableLabelFields(animal) : [],
    changeSize: (value: LabelSize) => {
      setSize(value);
      setLabelDefaults({ size: value });
    },
    changeTarget: (value: LabelTarget) => {
      setTarget(value);
      setLabelDefaults({ target: value });
    },
    changePaper: (value: PaperSize) => {
      setPaper(value);
      setLabelDefaults({ paper: value });
    },
    toggleField: (key: keyof LabelFields, value: boolean) =>
      setFields((current) => ({ ...current, [key]: value })),
    print: () => output(printLabelPdf),
    share: () => output(shareLabelPdf),
  };
}
