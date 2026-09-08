"use strict";
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { PRODUCT_IMAGES_DIR } = require("./config");

// Product images follow the site convention: a 1000x1000 white canvas with the
// device contained inside, saved as PNG to public/images/products/<name>.png and
// referenced in catalog.json as /images/products/<name>.png.
const CANVAS = 1000;
const PUBLIC_PREFIX = "/images/products/";

function ensureDir() {
  if (!fs.existsSync(PRODUCT_IMAGES_DIR)) {
    fs.mkdirSync(PRODUCT_IMAGES_DIR, { recursive: true });
  }
}

// Pick a filename that does not clobber an existing image. Base is usually the
// product slug; extra images get -2, -3, ... suffixes.
function uniqueFilename(baseSlug) {
  ensureDir();
  const safe = String(baseSlug || "product")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "product";
  let name = `${safe}.png`;
  let i = 2;
  while (fs.existsSync(path.join(PRODUCT_IMAGES_DIR, name))) {
    name = `${safe}-${i}.png`;
    i += 1;
  }
  return name;
}

// Process an uploaded buffer to the standard canvas and save it.
// Returns the public path to store in catalog.json (/images/products/<name>.png).
async function processAndSave(buffer, baseSlug) {
  ensureDir();
  const filename = uniqueFilename(baseSlug);
  const outPath = path.join(PRODUCT_IMAGES_DIR, filename);

  const resized = await sharp(buffer)
    .resize(CANVAS, CANVAS, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();

  fs.writeFileSync(outPath, resized);
  return PUBLIC_PREFIX + filename;
}

// Delete a product image file by its public path. Only touches files inside the
// products image directory; ignores anything else for safety.
function deleteByPublicPath(publicPath) {
  if (typeof publicPath !== "string" || !publicPath.startsWith(PUBLIC_PREFIX)) {
    return null;
  }
  const filename = path.basename(publicPath);
  const filePath = path.join(PRODUCT_IMAGES_DIR, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return filePath;
  }
  return null;
}

function absFromPublicPath(publicPath) {
  return path.join(PRODUCT_IMAGES_DIR, path.basename(publicPath));
}

// ── Phase 2 generic asset helpers ──────────────────────────────────────────
// Unlike product photos (white 1000x1000 canvas), logos keep their own aspect
// and transparency: trim the surrounding whitespace/transparent border, cap to
// a web-friendly size, save as PNG (matches public/images/brands convention).

const { SITE_ROOT } = require("./config");

function safeName(base, fallback) {
  const s = String(base || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || fallback;
}

function uniqueNameIn(dir, base, ext, fallback) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const safe = safeName(base, fallback);
  let name = `${safe}.${ext}`;
  let i = 2;
  while (fs.existsSync(path.join(dir, name))) {
    name = `${safe}-${i}.${ext}`;
    i += 1;
  }
  return name;
}

// publicDir e.g. "images/brands" -> file saved to public/images/brands/<name>.png,
// returned reference is "/images/brands/<name>.png".
async function processLogo(buffer, baseName, publicDir, { maxW = 600, maxH = 320 } = {}) {
  const dir = path.join(SITE_ROOT, "public", ...publicDir.split("/"));
  const name = uniqueNameIn(dir, baseName, "png", "logo");
  const out = await sharp(buffer)
    .trim({ threshold: 10 }) // drop uniform border (white or transparent)
    .resize(maxW, maxH, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(dir, name), out);
  return `/${publicDir}/${name}`;
}

// Web-friendly photo (events): fit inside 1600x1600, JPEG q82.
async function processPhoto(buffer, baseName, publicDir) {
  const dir = path.join(SITE_ROOT, "public", ...publicDir.split("/"));
  const name = uniqueNameIn(dir, baseName, "jpg", "photo");
  const out = await sharp(buffer)
    .rotate() // respect EXIF orientation
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 82 })
    .toBuffer();
  fs.writeFileSync(path.join(dir, name), out);
  return `/${publicDir}/${name}`;
}

// Event photo: the admin crops/frames the source image client-side (fixed to
// the public card's 4:3 ratio) and we extract exactly that rectangle here, so
// the published image is pixel-for-pixel what the admin previewed rather than
// re-cropped again by CSS on the public site. cropRect is in the pixel space
// of the EXIF-rotated image (matching what a browser <img>/canvas shows).
const EVENT_PHOTO_W = 1600;
const EVENT_PHOTO_H = 1200;

async function processEventPhoto(buffer, baseName, publicDir, cropRect) {
  if (
    !cropRect ||
    ![cropRect.left, cropRect.top, cropRect.width, cropRect.height].every(
      (n) => typeof n === "number" && Number.isFinite(n)
    )
  ) {
    throw new Error("Нужна область обрезки (crop).");
  }

  const dir = path.join(SITE_ROOT, "public", ...publicDir.split("/"));
  const name = uniqueNameIn(dir, baseName, "jpg", "photo");

  // Rotate to a concrete buffer first so extract() coordinates land on the
  // same pixel grid the crop UI (and any EXIF-aware image viewer) showed.
  const { data, info } = await sharp(buffer)
    .rotate()
    .toBuffer({ resolveWithObject: true });

  const left = Math.max(0, Math.min(Math.round(cropRect.left), info.width - 1));
  const top = Math.max(0, Math.min(Math.round(cropRect.top), info.height - 1));
  const width = Math.max(1, Math.min(Math.round(cropRect.width), info.width - left));
  const height = Math.max(1, Math.min(Math.round(cropRect.height), info.height - top));

  const out = await sharp(data)
    .extract({ left, top, width, height })
    .resize(EVENT_PHOTO_W, EVENT_PHOTO_H, { fit: "fill" })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 88 })
    .toBuffer();
  fs.writeFileSync(path.join(dir, name), out);
  return `/${publicDir}/${name}`;
}

function isPdf(buffer) {
  return buffer && buffer.length > 4 && buffer.slice(0, 5).toString("latin1") === "%PDF-";
}

function savePdf(buffer, baseName, publicDir) {
  if (!isPdf(buffer)) throw new Error("not a PDF");
  const dir = path.join(SITE_ROOT, "public", ...publicDir.split("/"));
  const name = uniqueNameIn(dir, baseName, "pdf", "document");
  fs.writeFileSync(path.join(dir, name), buffer);
  return `/${publicDir}/${name}`;
}

// Delete any file under public/ by its site-absolute reference (/images/...,
// /files/...). Refuses paths that escape public/.
function deletePublicFile(publicPath) {
  if (typeof publicPath !== "string" || !publicPath.startsWith("/")) return null;
  const abs = path.resolve(path.join(SITE_ROOT, "public", "." + publicPath));
  const publicRoot = path.resolve(path.join(SITE_ROOT, "public"));
  if (!abs.startsWith(publicRoot + path.sep)) return null;
  if (fs.existsSync(abs)) {
    fs.unlinkSync(abs);
    return abs;
  }
  return null;
}

function absPublicFile(publicPath) {
  return path.resolve(path.join(SITE_ROOT, "public", "." + publicPath));
}

module.exports = {
  processAndSave,
  deleteByPublicPath,
  absFromPublicPath,
  PUBLIC_PREFIX,
  processLogo,
  processPhoto,
  processEventPhoto,
  EVENT_PHOTO_W,
  EVENT_PHOTO_H,
  savePdf,
  isPdf,
  deletePublicFile,
  absPublicFile,
};
