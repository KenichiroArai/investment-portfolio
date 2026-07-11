export const BACKUP_ZIP_SITE_PREFIX = "investment-portfolio";

export function formatBackupFilenameTimestamp(date = new Date()): string {
  let result = "";
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const formatted = formatter.format(date);
  const [datePart, timePart] = formatted.split(" ");
  result = `${datePart.replace(/-/g, "")}${timePart.replace(/:/g, "")}`;
  return result;
}

export function buildBackupZipFilename(
  scope: "all" | "portfolio",
  portfolioCode?: string,
  date = new Date(),
): string {
  let result = "";
  const timestamp = formatBackupFilenameTimestamp(date);

  if (scope === "portfolio" && portfolioCode) {
    result = `${BACKUP_ZIP_SITE_PREFIX}-${portfolioCode}-${timestamp}.zip`;
    return result;
  }

  result = `${BACKUP_ZIP_SITE_PREFIX}-all-${timestamp}.zip`;
  return result;
}
