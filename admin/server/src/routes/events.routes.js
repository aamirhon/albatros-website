"use strict";
const { makeContentRouter } = require("../contentRouter");
const { EVENTS_PATH } = require("../config");
const { processEventPhoto } = require("../images");

// The crop rectangle travels as a JSON string multipart field (the browser
// crop tool computes it in the source image's pixel space).
function parseCropRect(raw) {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const r = JSON.parse(raw);
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  } catch {
    return null;
  }
}

// Events = src/data/events.json. Existing schema:
// { id, year, title, date ("Месяц ГГГГ"), description, titleUz, descriptionUz }
// Phase 2 optional additions: type, images[], hidden, priority.

const RU_MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const EVENT_TYPES = [
  "seminar",
  "conference",
  "congress",
  "symposium",
  "exhibition",
  "installation",
  "registration",
  "other",
];

function str(v) {
  return typeof v === "string" ? v.trim() : "";
}

// date must be "<RU month> <4-digit year>" to match every existing record.
function validDate(date) {
  const m = /^(\S+) (\d{4})$/.exec(str(date));
  return !!m && RU_MONTHS.includes(m[1]);
}

function buildRecord(body, existing) {
  const e = existing ? { ...existing } : {};
  const setReq = (k) => {
    if (typeof body[k] === "string") e[k] = body[k].trim();
  };
  const setOpt = (k) => {
    if (typeof body[k] === "string") {
      const v = body[k].trim();
      if (v) e[k] = v;
      else delete e[k];
    }
  };
  setReq("title");
  setReq("titleUz");
  setReq("description");
  setReq("descriptionUz");
  setOpt("titleEn");
  setOpt("descriptionEn");
  if (validDate(body.date)) {
    e.date = str(body.date);
    e.year = str(body.date).split(" ")[1]; // year always derived from date
  }
  if (typeof body.type === "string") {
    if (EVENT_TYPES.includes(body.type)) e.type = body.type;
    else if (body.type === "") delete e.type;
  }
  if (Array.isArray(body.images)) {
    const imgs = body.images.filter((x) => typeof x === "string");
    if (imgs.length) e.images = imgs;
    else delete e.images;
  }
  if (typeof body.priority === "number") e.priority = body.priority;
  else if (body.priority === "" || body.priority === null) delete e.priority;
  if (typeof body.hidden === "boolean") {
    if (body.hidden) e.hidden = true;
    else delete e.hidden;
  }
  return e;
}

const router = makeContentRouter({
  filePath: EVENTS_PATH,
  label: "event",
  fieldOrder: [
    "id",
    "year",
    "title",
    "date",
    "description",
    "titleUz",
    "descriptionUz",
    "titleEn",
    "descriptionEn",
    "type",
    "images",
    "priority",
    "hidden",
  ],
  nameOf: (r) => r.title,
  buildRecord,
  validateCreate: (body) => {
    const errors = [];
    if (!str(body.title)) errors.push("Укажите название (RU).");
    if (!str(body.titleUz)) errors.push("Укажите название (UZ).");
    if (!validDate(body.date)) errors.push("Укажите дату (месяц и год).");
    if (!str(body.description)) errors.push("Укажите описание (RU).");
    if (!str(body.descriptionUz)) errors.push("Укажите описание (UZ).");
    if (!Array.isArray(body.images) || body.images.length === 0)
      errors.push("Загрузите хотя бы одно фото.");
    if (body.type && !EVENT_TYPES.includes(body.type)) errors.push("Недопустимый тип.");
    return errors;
  },
  // Ids follow the existing e<year>-N convention loosely: e<year>, e<year>-2, ...
  idBase: (body) => "e" + (validDate(body.date) ? str(body.date).split(" ")[1] : "event"),
  idFallback: "event",
  fileFields: { images: "array" },
  uploads: {
    photo: (buffer, body) =>
      processEventPhoto(buffer, body.base, "images/events", parseCropRect(body.crop)),
  },
});

module.exports = { router, EVENT_TYPES, RU_MONTHS };
