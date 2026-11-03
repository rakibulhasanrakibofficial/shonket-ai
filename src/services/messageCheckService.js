async function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string" || !reader.result.startsWith("data:image/")) {
        reject(new Error("The screenshot could not be read. Please choose the image again."));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("The screenshot could not be read. Please choose the image again."));
    reader.readAsDataURL(file);
  });
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const retryAfter = Number(data.retryAfterSeconds);
    const errorMessage = String(data.error || "Could not check this message. Please try again.");
    throw new Error(
      Number.isFinite(retryAfter) && retryAfter > 0
        ? `${errorMessage} Retry after about ${retryAfter} seconds.`
        : errorMessage
    );
  }
  return data;
}

export async function analyzeMessage({ message, imageFile = null, language = "bn" }) {
  const cleanMessage = String(message || "").trim();
  if (!cleanMessage && !imageFile) throw new Error("Add a message or screenshot to check.");

  if (imageFile) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(imageFile.type)) {
      throw new Error("Upload a PNG, JPG, or WebP screenshot.");
    }
    if (imageFile.size > 2.5 * 1024 * 1024) {
      throw new Error("Screenshot must be 2.5 MB or smaller.");
    }

    const imageBase64 = await readImageAsDataUrl(imageFile);
    const response = await fetch("/api/analyzeScreenshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: cleanMessage,
        imageMimeType: imageFile.type,
        imageBase64,
        language: language === "en" || language === "bn" ? language : "auto"
      })
    });
    return parseResponse(response);
  }

  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: cleanMessage,
      language: language === "en" || language === "bn" ? language : "auto"
    })
  });
  return parseResponse(response);
}
