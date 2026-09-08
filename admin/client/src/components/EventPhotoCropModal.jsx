import { useCallback, useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";

// Must match EVENT_PHOTO_W / EVENT_PHOTO_H in admin/server/src/images.js.
const TARGET_W = 1600;
const TARGET_H = 1200;
const ASPECT = TARGET_W / TARGET_H;
const MAX_REMOUNT_ATTEMPTS = 3;

// Modal crop step shown before an event photo upload: fixes the crop to the
// public card's 4:3 ratio with drag/zoom, so what the admin frames here is
// exactly what publishes (the server extracts this same rectangle).
export default function EventPhotoCropModal({ file, onCancel, onConfirm }) {
  const [imageUrl, setImageUrl] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  // react-easy-crop measures its crop area against the container on the
  // image's load event; if that event fires before the container has
  // finished layout (can happen with an already-decoded blob) it can measure
  // a 0x0 area and get stuck. Bumping this key forces a clean remount, which
  // gives the measurement another chance.
  const [cropperKey, setCropperKey] = useState(0);
  const remountAttempts = useRef(0);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    // Pre-decode off-screen so the Cropper's own <img> starts from an
    // already fully-decoded source, then wait a frame so the container's
    // layout has settled before Cropper ever mounts and measures it.
    const probe = new Image();
    probe.onload = () => requestAnimationFrame(() => setImageUrl(url));
    probe.onerror = () => setImageUrl(url);
    probe.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_area, areaPixels) => {
    if (areaPixels.width === 0 || areaPixels.height === 0) {
      if (remountAttempts.current < MAX_REMOUNT_ATTEMPTS) {
        remountAttempts.current += 1;
        setCropperKey((k) => k + 1);
      }
      return;
    }
    setCroppedAreaPixels(areaPixels);
  }, []);

  const willUpscale =
    croppedAreaPixels && (croppedAreaPixels.width < TARGET_W || croppedAreaPixels.height < TARGET_H);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card flex w-full max-w-2xl flex-col p-5">
        <h2 className="mb-3 font-bold text-ink">Обрезка фото ({file.name})</h2>

        <div className="relative h-[420px] w-full overflow-hidden rounded-lg bg-black/80">
          {imageUrl && (
            <Cropper
              key={cropperKey}
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={ASPECT}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <label className="mt-4 flex items-center gap-3 text-sm text-soft">
          Масштаб
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
          />
        </label>

        {willUpscale && (
          <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
            Выбранная область меньше {TARGET_W}×{TARGET_H}px — фото будет увеличено и может выглядеть
            размыто. Отдалите масштаб, чтобы захватить больше исходного фото.
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Отмена
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!croppedAreaPixels}
            onClick={() => onConfirm(croppedAreaPixels)}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
