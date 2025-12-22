interface QueuedImage {
  id: string;
  file: File;
  type: "user" | "product";
}

const KEY = "image-upload-queue";

export function addImageToQueue(item: QueuedImage) {
  const queue: QueuedImage[] = JSON.parse(
    localStorage.getItem(KEY) || "[]"
  );
  queue.push(item);
  localStorage.setItem(KEY, JSON.stringify(queue));
}

export function getImageQueue(): QueuedImage[] {
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}

export function clearImageQueue() {
  localStorage.removeItem(KEY);
}
