export async function analyzeMessage({ message, imageFile, language = "bn" }) {
  const body = { message: String(message || ""), language };
  if (imageFile) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(imageFile.type)) {
      throw new Error("Please upload a PNG, JPG, or WebP screenshot.");
    }
    if (imageFile.size > 5 * 1024 * 1024) throw new Error("Screenshot must be 5 MB or smaller.");
    body.imageBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = () => reject(new Error("Could not read the screenshot."));
      reader.readAsDataURL(imageFile);
    });
    body.imageMimeType = imageFile.type;
  }
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Analysis failed. Please try again.");
  return data;
}
