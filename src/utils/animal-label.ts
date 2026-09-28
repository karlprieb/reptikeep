import { File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import qrCodeGenerator from "qrcode-generator";
import { Platform } from "react-native";
import type { TFunction } from "i18next";

import type { Animal } from "@/state/animal";
import { SEX_SYMBOLS } from "@/utils/animal-card-status";
import { getAnimalPhotoUri } from "@/utils/animal-photo-storage";

import { formatAbsoluteDate } from "./format-date";

export type LabelSize = "tag" | "card" | "large";
export type LabelTarget = "profile" | "log";
export type PaperSize = "a4" | "letter";

export interface LabelFields {
  qr: boolean;
  name: boolean;
  scientificName: boolean;
  commonName: boolean;
  sex: boolean;
  birthDate: boolean;
  acquiredDate: boolean;
  photo: boolean;
}

export interface LabelOptions {
  size: LabelSize;
  target: LabelTarget;
  paper: PaperSize | "label";
  fields: LabelFields;
}

export const DEFAULT_LABEL_FIELDS: LabelFields = {
  qr: true,
  name: true,
  scientificName: true,
  commonName: true,
  sex: false,
  birthDate: true,
  acquiredDate: false,
  photo: false,
};

export const LABEL_FIELD_KEYS: readonly (keyof LabelFields)[] = [
  "qr",
  "name",
  "scientificName",
  "commonName",
  "sex",
  "birthDate",
  "acquiredDate",
  "photo",
];

export const LABEL_SIZES: readonly LabelSize[] = ["tag", "card", "large"];
export const LABEL_TARGETS: readonly LabelTarget[] = ["profile", "log"];
export const PAPER_SIZES: readonly PaperSize[] = ["a4", "letter"];

const BASE_GEOMETRY = {
  widthMm: 122,
  heightMm: 40,
  qrMm: 30,
  photoMm: 20,
  paddingMm: 4,
  typeMm: 3.6,
};

const SIZE_SCALE: Record<LabelSize, number> = {
  tag: 1,
  card: 1.25,
  large: 1.6,
};

const LOGO_MARK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">' +
  '<path fill="none" stroke="#3b2a1d" stroke-linecap="round" stroke-linejoin="round" stroke-width="11" d="M25 51c7-6 9 6 17 13 3 2.5 6 1.5 8.5-2L70 35"/>' +
  '<path fill="none" stroke="#c98a4b" stroke-linecap="round" stroke-width="11" d="M63.5 43.9 70 35"/>' +
  '<circle cx="67.6" cy="38.6" r="2.2" fill="#ffffff"/>' +
  "</svg>";

const SEX_GLYPHS: Record<"male" | "female", string> = {
  male: '<circle cx="9.5" cy="14.5" r="6"/><path d="M14 10 20.5 3.5M14.5 3.5h6v6"/>',
  female: '<circle cx="12" cy="8.5" r="6"/><path d="M12 14.5v8M8 18.5h8"/>',
};

const PAGE_GEOMETRY: Record<
  PaperSize,
  { cssSize: string; widthPt: number; heightPt: number }
> = {
  a4: { cssSize: "A4", widthPt: 595, heightPt: 842 },
  letter: { cssSize: "letter", widthPt: 612, heightPt: 792 },
};

export function labelGeometry(size: LabelSize) {
  const scale = SIZE_SCALE[size];
  return {
    widthMm: Math.round(BASE_GEOMETRY.widthMm * scale),
    heightMm: Math.round(BASE_GEOMETRY.heightMm * scale),
    scale,
  };
}

export function pageGeometry(paper: PaperSize) {
  return PAGE_GEOMETRY[paper];
}

const LABEL_PAGE_MARGIN_MM = 4;

function pageFor(options: LabelOptions) {
  return options.paper === "label"
    ? labelPageGeometry(options.size)
    : pageGeometry(options.paper);
}

export function labelPageGeometry(size: LabelSize) {
  const { widthMm, heightMm } = labelGeometry(size);
  const widthPt = Math.ceil(((widthMm + LABEL_PAGE_MARGIN_MM) * 72) / 25.4);
  const heightPt = Math.ceil(((heightMm + LABEL_PAGE_MARGIN_MM) * 72) / 25.4);
  return { cssSize: `${widthPt}pt ${heightPt}pt`, widthPt, heightPt };
}

export function availableLabelFields(animal: Animal): (keyof LabelFields)[] {
  const available: Record<keyof LabelFields, boolean> = {
    qr: true,
    name: true,
    scientificName: Boolean(animal.scientificName),
    commonName: Boolean(animal.commonName),
    sex: animal.sex !== "unknown",
    birthDate: Boolean(animal.birthDate),
    acquiredDate: Boolean(animal.acquiredDate),
    photo: Boolean(animal.photo),
  };
  return LABEL_FIELD_KEYS.filter((key) => available[key]);
}

export function hasLabelContent(animal: Animal, fields: LabelFields): boolean {
  return (
    fields.qr ||
    fields.name ||
    (fields.photo && Boolean(animal.photo)) ||
    (fields.commonName && Boolean(animal.commonName)) ||
    (fields.scientificName && Boolean(animal.scientificName)) ||
    (fields.birthDate && Boolean(animal.birthDate)) ||
    (fields.acquiredDate && Boolean(animal.acquiredDate))
  );
}

export function buildLabelUrl(animalId: string, target: LabelTarget): string {
  const query = target === "log" ? `id=${animalId}&log=1` : `id=${animalId}`;
  return `https://reptikeep.com/a/?${query}`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface LabelHtmlDeps {
  t: TFunction;
  photoDataUri?: string;
  fontFacesCss?: string;
}

const DATE_SLOT = "\u0000";

const QR_QUIET_MODULES = 4;

function qrCode(url: string) {
  const qr = qrCodeGenerator(0, "Q");
  qr.addData(url);
  qr.make();
  return {
    svg: qr.createSvgTag({
      cellSize: 1,
      margin: QR_QUIET_MODULES,
      scalable: true,
    }),
    quietZone: QR_QUIET_MODULES / (qr.getModuleCount() + 2 * QR_QUIET_MODULES),
  };
}

function buildCardHtml(
  animal: Animal,
  options: LabelOptions,
  deps: LabelHtmlDeps,
): string {
  const { fields } = options;
  const qr = qrCode(buildLabelUrl(animal.id, options.target));

  const symbol = fields.sex && animal.sex !== "unknown" ? animal.sex : null;
  const nameRow = fields.name
    ? `<div class="name">${escapeHtml(animal.name)}${
        symbol
          ? `&nbsp;<svg class="sex" role="img" aria-label="${SEX_SYMBOLS[symbol]}" viewBox="0 0 24 24">${SEX_GLYPHS[symbol]}</svg>`
          : ""
      }</div>`
    : "";

  const dateLine = (key: string, date: string) =>
    `<div>${escapeHtml(deps.t(key, { date: DATE_SLOT })).replace(
      DATE_SLOT,
      `<span class="date">${escapeHtml(formatAbsoluteDate(date))}</span>`,
    )}</div>`;
  const dateLines = [
    fields.birthDate && animal.birthDate
      ? dateLine("label.field.birthDate", animal.birthDate)
      : "",
    fields.acquiredDate && animal.acquiredDate
      ? dateLine("label.field.acquiredDate", animal.acquiredDate)
      : "",
  ].join("");
  const datesRow = dateLines ? `<div class="dates">${dateLines}</div>` : "";

  const commonRow =
    fields.commonName && animal.commonName
      ? `<div class="common">${escapeHtml(animal.commonName)}</div>`
      : "";

  const scientificRow =
    fields.scientificName && animal.scientificName
      ? `<div class="scientific">${escapeHtml(animal.scientificName)}</div>`
      : "";

  const photoUri = fields.photo ? deps.photoDataUri : undefined;
  const photoHtml = photoUri ? `<img class="photo" src="${photoUri}" />` : "";

  const info = nameRow + commonRow + scientificRow + datesRow;
  const qrHtml = fields.qr ? `<div class="qr">${qr.svg}</div>` : "";
  const infoHtml = info
    ? `<div class="info"${
        fields.qr
          ? ` style="padding-right: calc(var(--qr) * ${qr.quietZone})"`
          : ""
      }>${info}</div>`
    : "";
  const classes = [
    "card",
    photoHtml && "has-photo",
    photoHtml && !qrHtml && !infoHtml && "photo-only",
    !qrHtml && "no-qr",
  ].filter(Boolean);

  return `<div class="${classes.join(" ")}">
    ${photoHtml}
    <div class="logo-watermark">${LOGO_MARK_SVG}</div>
    <div class="card-row">
      ${qrHtml}
      ${infoHtml}
    </div>
  </div>`;
}

export function buildLabelHtml(
  animal: Animal,
  options: LabelOptions,
  deps: LabelHtmlDeps,
): string {
  const { widthMm, heightMm, scale } = labelGeometry(options.size);
  const mm = (value: number) => `${+(value * scale).toFixed(2)}mm`;
  const base = BASE_GEOMETRY;
  const page = pageFor(options);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      ${deps.fontFacesCss ?? ""}
      @page { size: ${page.cssSize}; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body {
        width: 100%;
        height: 100%;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        background: #ffffff;
      }
      .card {
        position: relative;
        max-width: ${widthMm}mm;
        height: ${heightMm}mm;
        border: ${mm(0.3)} dashed #9C845F;
        border-radius: ${mm(3)};
        padding: ${mm(base.paddingMm)};
        overflow: hidden;
        font-size: ${mm(base.typeMm)};
        --qr: ${mm(base.qrMm)};
        color: #3B2A1D;
      }
      .card.has-photo { padding-left: ${mm(base.photoMm + base.paddingMm / 2)}; }
      .card.has-photo.no-qr { padding-left: ${mm(base.photoMm + base.paddingMm)}; }
      .card.photo-only { width: ${mm(base.photoMm)}; padding: 0; }
      .photo {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        width: ${mm(base.photoMm)};
        height: 100%;
        object-fit: cover;
      }
      .logo-watermark {
        position: absolute;
        right: -${mm(base.heightMm * 0.22)};
        bottom: -${mm(base.heightMm * 0.3)};
        width: ${mm(base.heightMm * 1.1)};
        height: ${mm(base.heightMm * 1.1)};
        opacity: 0.08;
      }
      .logo-watermark svg { width: 100%; height: 100%; display: block; }
      .card-row {
        position: relative;
        height: 100%;
        display: flex;
        align-items: center;
        gap: ${mm(base.paddingMm / 2)};
      }
      .qr {
        flex: 0 0 auto;
        width: var(--qr);
        height: var(--qr);
      }
      .qr svg { width: 100%; height: 100%; display: block; }
      .qr path { fill: #3B2A1D; }
      .qr rect { fill: none; }
      .info {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.35em;
      }
      .info > div {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .info > .name {
        font-family: "Solway-Bold", Georgia, serif;
        font-size: 1.35em;
        line-height: 1.3;
        white-space: normal;
        overflow-wrap: break-word;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }
      .sex {
        width: 0.72em;
        height: 0.72em;
        vertical-align: -0.02em;
        fill: none;
        stroke: currentColor;
        stroke-width: 2.6;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .dates {
        font-family: -apple-system, system-ui, Roboto, sans-serif;
        font-size: 0.78em;
        line-height: 1.4;
        margin-top: 0.3em;
        color: #6E5A3E;
      }
      .dates > div { overflow: hidden; text-overflow: ellipsis; }
      .date {
        font-family: "SpaceMono-Bold", ui-monospace, monospace;
        font-size: 0.92em;
        color: #3B2A1D;
      }
      .common, .scientific {
        font-family: -apple-system, system-ui, Roboto, sans-serif;
        line-height: 1.25;
      }
      .common { font-size: 0.9em; }
      .scientific {
        font-size: 0.8em;
        font-style: italic;
        color: #6E5A3E;
      }
    </style>
  </head>
  <body>
    ${buildCardHtml(animal, options, deps)}
  </body>
</html>`;
}

let fontFacesCss: string | undefined;

const LABEL_FONT_FAMILIES = ["Solway-Bold", "SpaceMono-Bold"];

function bundledFont(family: string): File {
  return Platform.OS === "android"
    ? new File(Paths.bundle, "fonts", `${family}.ttf`)
    : new File(Paths.bundle, `${family}.ttf`);
}

async function loadFontFacesCss(): Promise<string> {
  if (fontFacesCss !== undefined) return fontFacesCss;
  try {
    const faces = await Promise.all(
      LABEL_FONT_FAMILIES.map(async (family) => {
        const base64 = await bundledFont(family).base64();
        return `@font-face { font-family: "${family}"; src: url(data:font/ttf;base64,${base64}) format("truetype"); }`;
      }),
    );
    fontFacesCss = faces.join("\n");
    return fontFacesCss;
  } catch {
    return "";
  }
}

const LABEL_PHOTO_MAX_WIDTH = 600;

async function loadPhotoDataUri(photo: string): Promise<string> {
  const context = ImageManipulator.manipulate(getAnimalPhotoUri(photo));
  try {
    context.resize({ width: LABEL_PHOTO_MAX_WIDTH });
    const image = await context.renderAsync();
    try {
      const { base64 } = await image.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.8,
        base64: true,
      });
      if (!base64) throw new Error("Label photo could not be encoded");
      return `data:image/jpeg;base64,${base64}`;
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}

export async function createLabelPdf(
  animal: Animal,
  options: LabelOptions,
  t: TFunction,
): Promise<string> {
  const [fontFacesCss, photoDataUri] = await Promise.all([
    loadFontFacesCss(),
    options.fields.photo && animal.photo
      ? loadPhotoDataUri(animal.photo)
      : Promise.resolve(undefined),
  ]);

  const html = buildLabelHtml(animal, options, {
    t,
    photoDataUri,
    fontFacesCss,
  });
  const page = pageFor(options);

  const { uri } = await Print.printToFileAsync({
    html,
    width: page.widthPt,
    height: page.heightPt,
  });

  return uri;
}

export function printLabelPdf(uri: string): Promise<void> {
  return Print.printAsync({ uri });
}

export async function shareLabelPdf(uri: string): Promise<void> {
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
  });
}

export function deleteLabelPdf(uri: string): void {
  const file = new File(uri);
  if (file.exists) file.delete();
}
