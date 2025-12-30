export async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = "smartstock"; // Updated preset name

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", "smartstock/users");
  // Forbidden params for unsigned upload removed:
  // overwrite, use_filename, unique_filename, use_filename_as_display_name

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      // This log is crucial—it will tell you the exact field Cloudinary hates
      console.error("Cloudinary Error Response:", data);
      throw new Error(data.error?.message || "Upload failed");
    }

    return data.secure_url;
  } catch (error) {
    console.error("Upload Error:", error);
    throw error;
  }
}