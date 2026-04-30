function toDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildPartMap(formatter, date) {
  return formatter.formatToParts(date).reduce((parts, part) => {
    if (part.type !== "literal") {
      parts[part.type] = part.value;
    }

    return parts;
  }, {});
}

const LIST_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const LIST_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export function formatListDate(value) {
  const date = toDate(value);
  if (!date) {
    return "-";
  }

  const parts = buildPartMap(LIST_DATE_FORMATTER, date);
  return `${parts.day} ${String(parts.month || "").toLowerCase()} ${parts.year}`;
}

export function formatListDateTime(value) {
  const date = toDate(value);
  if (!date) {
    return "-";
  }

  const parts = buildPartMap(LIST_DATE_TIME_FORMATTER, date);
  const suffix = parts.dayPeriod ? ` ${parts.dayPeriod.toLowerCase()}` : "";
  return `${parts.day} ${String(parts.month || "").toLowerCase()} ${parts.year} ${parts.hour}:${parts.minute}${suffix}`;
}
