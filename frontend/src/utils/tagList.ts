/** Tags are stored as a comma-separated string but edited as a list. */
export const normalizeTagList = (value: unknown): string[] => {
  const source = Array.isArray(value) ? value : String(value || "").split(/[,，]/);

  return source
    .map((item) => String(item).trim())
    .filter((item) => item.length);
};
