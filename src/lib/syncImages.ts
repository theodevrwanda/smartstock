import { uploadToCloudinary } from "./uploadToCloudinary";
import { getImageQueue, clearImageQueue } from "./imageQueue";

export async function syncQueuedImages() {
  if (!navigator.onLine) return;

  const queue = getImageQueue();
  if (!queue.length) return;

  for (const item of queue) {
    try {
      const imageUrl = await uploadToCloudinary(item.file);
      console.log("Uploaded:", imageUrl);

      // TODO: update Firestore user/product with imageUrl
    } catch (err) {
      console.error("Upload failed, retry later", err);
      return;
    }
  }

  clearImageQueue();
}
