import { act, fireEvent, render } from "@testing-library/react-native";
import * as DocumentPicker from "expo-document-picker";
import { Alert } from "react-native";

import { AddMedicalSheet } from "@/components/add-medical-sheet";
import { addDocument, documents$ } from "@/state/document";
import * as medical from "@/state/medical";
import { createMedicalActivity, medicalStore } from "@/state/medical";
import * as storage from "@/utils/animal-document-storage";

jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("@/utils/animal-document-storage", () => ({
  DocumentTooLargeError: class DocumentTooLargeError extends Error {
    size: number;

    constructor(mockSize: number) {
      super("Document exceeds the maximum size");
      this.size = mockSize;
    }
  },
  MAX_DOCUMENT_BYTES: 10 * 1024 * 1024,
  inspectDocumentSource: jest.fn(),
  importAnimalDocument: jest.fn(),
  deleteManagedAnimalDocument: jest.fn(),
  clearManagedAnimalDocuments: jest.fn(),
}));

const ANIMAL_ID = "animal-1";

beforeEach(() => {
  medicalStore.clear();
  documents$.set({});
  jest.clearAllMocks();
});

describe("AddMedicalSheet documents", () => {
  it("shows localized picker inspection feedback", async () => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///large.pdf", name: "large.pdf" }],
    } as never);
    jest.mocked(storage.inspectDocumentSource).mockImplementation(() => {
      throw new storage.DocumentTooLargeError(11 * 1024 * 1024);
    });

    const screen = render(
      <AddMedicalSheet animalId={ANIMAL_ID} animalName="Juno" />,
    );
    await act(() => fireEvent.press(screen.getByLabelText("Add document")));

    expect(screen.getByText(/This document is 11 MB/)).toBeTruthy();
  });

  it("shows unsupported picker feedback", async () => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///unsupported.txt", name: "unsupported.txt" }],
    } as never);
    jest.mocked(storage.inspectDocumentSource).mockImplementation(() => {
      throw new Error("unsupported");
    });

    const screen = render(
      <AddMedicalSheet animalId={ANIMAL_ID} animalName="Juno" />,
    );
    await act(() => fireEvent.press(screen.getByLabelText("Add document")));

    expect(
      screen.getByText(
        "That file type isn't supported. Choose a PDF, JPG, PNG, or HEIC.",
      ),
    ).toBeTruthy();
  });

  it("shows save feedback when saving rejects", async () => {
    jest.mocked(storage.inspectDocumentSource).mockReturnValue({
      extension: "pdf",
      size: 8,
    });
    jest
      .spyOn(medical, "saveMedicalActivity")
      .mockRejectedValueOnce(new Error("copy failed"));

    const screen = render(
      <AddMedicalSheet animalId={ANIMAL_ID} animalName="Juno" />,
    );
    fireEvent.changeText(screen.getByPlaceholderText("What happened?"), "Exam");
    await act(() => fireEvent.press(screen.getByLabelText("Save")));

    expect(
      screen.getByText("We couldn't save this medical record. Try again."),
    ).toBeTruthy();
  });

  it("confirms persisted document removal before marking it for deletion", () => {
    const record = createMedicalActivity({
      animalId: ANIMAL_ID,
      summary: "Exam",
    });
    medicalStore.add(record);
    addDocument({
      id: "document-1",
      animalId: ANIMAL_ID,
      createdAt: "2026-01-01T00:00:00.000Z",
      title: "Vet invoice",
      kind: "medical",
      file: "file:///document-1.pdf",
      extension: "pdf",
      size: 8,
      activityType: "medical",
      activityId: record.id,
    });
    const alert = jest.spyOn(Alert, "alert").mockImplementation();
    const screen = render(
      <AddMedicalSheet
        animalId={ANIMAL_ID}
        animalName="Juno"
        activity={record}
      />,
    );

    fireEvent.press(screen.getByLabelText("Vet invoice, Remove document"));

    expect(alert).toHaveBeenCalledWith(
      "Remove Vet invoice?",
      expect.any(String),
      expect.any(Array),
    );
    expect(screen.getByText("Vet invoice")).toBeTruthy();
    const buttons = alert.mock.calls[0][2]!;
    act(() => buttons.find((button) => button.text === "Remove")?.onPress?.());

    expect(screen.queryByText("Vet invoice")).toBeNull();
  });
});
