import { redirectSystemPath } from "@/app/+native-intent";
import type { Animal } from "@/state/animal";
import {
  availableLabelFields,
  buildLabelHtml,
  buildLabelUrl,
  customLabelSize,
  escapeHtml,
  hasLabelContent,
  labelFileName,
  LABEL_SIZES,
  PAPER_SIZES,
  labelGeometry,
  pageGeometry,
  type LabelOptions,
} from "@/utils/animal-label";

jest.mock("expo-sharing", () => ({
  shareAsync: jest.fn(),
}));

jest.mock("expo-print", () => ({
  printToFileAsync: jest.fn(),
}));

jest.mock("expo-file-system", () => ({
  File: jest.fn(),
  Paths: { bundle: "file:///bundle/" },
}));

jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: "jpeg" },
}));

function makeAnimal(overrides: Partial<Animal> = {}): Animal {
  return {
    id: "0123abcd-1234-5678-9abc-0123456789ab",
    createdAt: "2026-01-01T00:00:00.000Z",
    name: "Buddy",
    sex: "unknown",
    ...overrides,
  };
}

const t = ((key: string, options?: Record<string, unknown>) =>
  options
    ? `${key}:${JSON.stringify(options)}`
    : key) as unknown as import("i18next").TFunction;

const NO_FIELDS: LabelOptions["fields"] = {
  qr: false,
  name: false,
  scientificName: false,
  commonName: false,
  sex: false,
  birthDate: false,
  acquiredDate: false,
  photo: false,
};

function baseOptions(overrides: Partial<LabelOptions> = {}): LabelOptions {
  return {
    size: "card",
    target: "profile",
    paper: "letter",
    fields: {
      qr: true,
      name: true,
      scientificName: true,
      commonName: true,
      sex: true,
      birthDate: true,
      acquiredDate: true,
      photo: true,
    },
    ...overrides,
  };
}

describe("buildLabelUrl", () => {
  it("builds a profile url", () => {
    expect(buildLabelUrl("abc-123", "profile")).toBe(
      "https://reptikeep.com/a/?id=abc-123",
    );
  });

  it("builds urls that the deep link handler accepts", () => {
    const { id } = makeAnimal();
    expect(redirectSystemPath({ path: buildLabelUrl(id, "profile") })).toBe(
      `/animal/${id}`,
    );
    expect(redirectSystemPath({ path: buildLabelUrl(id, "log") })).toBe(
      `/animal/${id}?log=1`,
    );
  });

  it("builds a log url with log=1", () => {
    expect(buildLabelUrl("abc-123", "log")).toBe(
      "https://reptikeep.com/a/?id=abc-123&log=1",
    );
  });
});

describe("availableLabelFields", () => {
  it("offers only the fields this animal has data for", () => {
    expect(availableLabelFields(makeAnimal())).toEqual(["qr", "name"]);
    expect(
      availableLabelFields(
        makeAnimal({
          sex: "female",
          commonName: "Ball python",
          birthDate: "2020-05-01",
          photo: "photo.jpg",
        }),
      ),
    ).toEqual(["qr", "name", "commonName", "sex", "birthDate", "photo"]);
  });
});

describe("customLabelSize", () => {
  it("keeps width and height in proportion", () => {
    expect(customLabelSize("width", "100")).toEqual({
      widthMm: 100,
      heightMm: 33,
    });
    expect(customLabelSize("height", "33")).toEqual({
      widthMm: 101,
      heightMm: 33,
    });
    expect(customLabelSize("width", "90,5")).toEqual({
      widthMm: 91,
      heightMm: 30,
    });
  });

  it("rejects sizes outside the allowed range or non-numbers", () => {
    expect(customLabelSize("width", "50")).toBeUndefined();
    expect(customLabelSize("width", "250")).toBeUndefined();
    expect(customLabelSize("height", "abc")).toBeUndefined();
    expect(customLabelSize("width", "")).toBeUndefined();
  });
});

describe("labelFileName", () => {
  it("names the file after the animal and label size", () => {
    const name = (key: string, options: Record<string, string>) =>
      key === "label.fileName"
        ? `Label ${options.name} - ${options.size}`
        : key;
    expect(
      labelFileName(
        makeAnimal({ name: "Shen/long:?" }),
        { size: "tag" },
        name as unknown as import("i18next").TFunction,
      ),
    ).toBe("Label Shenlong - 122x40.pdf");
  });
});

describe("escapeHtml", () => {
  it("escapes script tags", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
  });

  it("escapes quotes", () => {
    expect(escapeHtml(`He said "hi" and 'bye'`)).toBe(
      "He said &quot;hi&quot; and &#39;bye&#39;",
    );
  });

  it("escapes ampersands", () => {
    expect(escapeHtml("Ball & Chain")).toBe("Ball &amp; Chain");
  });
});

describe("buildLabelHtml", () => {
  it("includes only the enabled fields", () => {
    const animal = makeAnimal({
      commonName: "Ball python",
      scientificName: "Python regius",
      birthDate: "2020-05-01",
      acquiredDate: "2021-06-02",
      photo: "file:///photo.jpg",
    });

    const enabled = buildLabelHtml(animal, baseOptions(), { t });
    expect(enabled).toContain("Buddy");
    expect(enabled).toContain("Ball python");
    expect(enabled).toContain("Python regius");
    expect(enabled).toContain("<svg");

    const nameOnly = buildLabelHtml(
      animal,
      baseOptions({
        fields: {
          qr: true,
          name: true,
          scientificName: false,
          commonName: false,
          sex: false,
          birthDate: false,
          acquiredDate: false,
          photo: false,
        },
      }),
      { t },
    );
    expect(nameOnly).toContain("Buddy");
    expect(nameOnly).not.toContain("Ball python");
    expect(nameOnly).not.toContain("Python regius");
    expect(nameOnly).not.toContain("<img");
  });

  it("omits the QR code when disabled", () => {
    const html = buildLabelHtml(
      makeAnimal(),
      baseOptions({ fields: { ...baseOptions().fields, qr: false } }),
      { t },
    );
    expect(html).not.toContain('class="qr"');
    expect(html).toContain("Buddy");
  });

  it("omits the info column when no text field is enabled", () => {
    const html = buildLabelHtml(
      makeAnimal(),
      baseOptions({
        fields: { ...NO_FIELDS, qr: true },
      }),
      { t },
    );
    expect(html).toContain('class="qr"');
    expect(html).not.toContain('class="info"');
  });

  it("reports whether the label would show anything", () => {
    const none = NO_FIELDS;
    const animal = makeAnimal();
    expect(hasLabelContent(animal, none)).toBe(false);
    expect(hasLabelContent(animal, { ...none, qr: true })).toBe(true);
    expect(hasLabelContent(animal, { ...none, photo: true, sex: true })).toBe(
      false,
    );
    expect(
      hasLabelContent(makeAnimal({ photo: "photo.jpg" }), {
        ...none,
        photo: true,
      }),
    ).toBe(true);
  });

  it("always renders the logo watermark", () => {
    const html = buildLabelHtml(makeAnimal(), baseOptions(), { t });
    expect(html).toContain('class="logo-watermark"');
  });

  it("sizes the page to fit the label when paper is label", () => {
    const html = buildLabelHtml(
      makeAnimal(),
      baseOptions({ size: "tag", paper: "label" }),
      { t },
    );
    expect(html).toContain("size: 358pt 125pt");
  });

  it("escapes animal-supplied strings before interpolation", () => {
    const animal = makeAnimal({
      name: `<script>alert("x")</script>`,
      commonName: "Tom & Jerry",
    });

    const html = buildLabelHtml(animal, baseOptions(), { t });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Tom &amp; Jerry");
  });

  it("degrades cleanly with no birth date, acquired date, or photo", () => {
    const animal = makeAnimal();
    expect(() => buildLabelHtml(animal, baseOptions(), { t })).not.toThrow();
    const html = buildLabelHtml(animal, baseOptions(), { t });
    expect(html).not.toContain("<img");
  });

  it.each(LABEL_SIZES)("produces valid geometry for size %s", (size) => {
    const geometry = labelGeometry(size);
    expect(geometry.widthMm).toBeGreaterThan(0);
    expect(geometry.heightMm).toBeGreaterThan(0);
    expect(geometry.widthMm / geometry.heightMm).toBeCloseTo(122 / 40, 1);

    const html = buildLabelHtml(makeAnimal(), baseOptions({ size }), { t });
    expect(html).toContain(`${geometry.widthMm}mm`);
  });

  it.each(PAPER_SIZES)("produces valid geometry for paper %s", (paper) => {
    const geometry = pageGeometry(paper);
    expect(geometry.widthPt).toBeGreaterThan(0);
    expect(geometry.heightPt).toBeGreaterThan(0);

    const html = buildLabelHtml(makeAnimal(), baseOptions({ paper }), { t });
    expect(html).toContain(`size: ${geometry.cssSize}`);
  });
});
