import { officialSearchHandler } from "./analyze.mjs";

export async function handler(event) {
  return officialSearchHandler(event, process.env);
}
