import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const MAX_LONG_EDGE = 2048;
const COMPRESS_QUALITY = 0.8;

export async function processAnimalPhoto(sourceUri: string): Promise<string> {
  const context = ImageManipulator.manipulate(sourceUri);

  try {
    let image = await context.renderAsync();

    if (Math.max(image.width, image.height) > MAX_LONG_EDGE) {
      context.resize(
        image.width >= image.height
          ? { width: MAX_LONG_EDGE }
          : { height: MAX_LONG_EDGE },
      );
      image.release();
      image = await context.renderAsync();
    }

    try {
      const { uri } = await image.saveAsync({
        format: SaveFormat.WEBP,
        compress: COMPRESS_QUALITY,
      });
      return uri;
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}
