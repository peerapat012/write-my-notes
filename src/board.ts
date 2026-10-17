/** Adds the app's top-level `"icon"` to a serialized `.excalidraw` scene (Excalidraw drops unknown fields). */
export function withIcon(json: string, icon?: string) {
  return icon ? JSON.stringify({ ...JSON.parse(json), icon }, null, 2) : json
}
