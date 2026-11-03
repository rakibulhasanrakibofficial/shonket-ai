export async function analyzeMessage({ message, language = "bn" }) {
  const cleanMessage = String(message || "").trim();
  if (!cleanMessage) throw new Error("Add a message to check.");

  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: cleanMessage,
      language: language === "en" ? "en" : "bn"
    })
  });

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
