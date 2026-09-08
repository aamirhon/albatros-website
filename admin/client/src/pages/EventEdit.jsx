import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { eventsApi } from "../api";
import { imgUrl } from "../imgUrl";
import { EVENT_TYPE_RU, RU_MONTHS, wordCount } from "./eventTypes.js";
import DraftUz from "../components/DraftUz.jsx";
import PublishStatus from "../components/PublishStatus.jsx";
import EventPhotoCropModal from "../components/EventPhotoCropModal.jsx";

const EMPTY = {
  title: "",
  titleUz: "",
  titleEn: "",
  month: "",
  year: "",
  type: "",
  description: "",
  descriptionUz: "",
  descriptionEn: "",
  images: [],
  priority: "",
  hidden: false,
};

function splitDate(date) {
  const m = /^(\S+) (\d{4})$/.exec(date || "");
  return m ? { month: m[1], year: m[2] } : { month: "", year: "" };
}

// The public page targets ~90-word descriptions; show a live counter without
// hard-blocking (older events have short descriptions).
function WordHint({ text }) {
  const n = wordCount(text);
  const okRange = n >= 60 && n <= 120;
  return (
    <span className={"text-xs " + (okRange ? "text-emerald-600" : "text-soft")}>
      {n} слов (цель ~90)
    </span>
  );
}

export default function EventEdit({ mode }) {
  const isNew = mode === "new";
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [commit, setCommit] = useState(null);
  const fileRef = useRef(null);
  // Photos are cropped one at a time before upload: `cropQueue` holds files
  // still waiting, `cropping` is the one currently shown in the crop modal.
  const [cropQueue, setCropQueue] = useState([]);
  const [cropping, setCropping] = useState(null);

  useEffect(() => {
    if (isNew) return;
    eventsApi
      .get(id)
      .then((d) => {
        const e = d.item;
        setForm({
          ...EMPTY,
          ...e,
          ...splitDate(e.date),
          type: e.type || "",
          images: e.images || [],
          priority: e.priority ?? "",
          hidden: !!e.hidden,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Selecting/dropping files just queues them; the crop modal (driven by the
  // effect below) pops one at a time and only uploads once the admin confirms
  // a crop for it.
  const doUpload = (files) => {
    if (!files || !files.length) return;
    setCropQueue((q) => [...q, ...files]);
  };

  useEffect(() => {
    if (!cropping && cropQueue.length) {
      setCropping(cropQueue[0]);
      setCropQueue((q) => q.slice(1));
    }
  }, [cropping, cropQueue]);

  const confirmCrop = async (croppedAreaPixels) => {
    const file = cropping;
    setCropping(null);
    setUploading(true);
    setError("");
    try {
      const base = "e" + (form.year || "event");
      const crop = JSON.stringify({
        left: croppedAreaPixels.x,
        top: croppedAreaPixels.y,
        width: croppedAreaPixels.width,
        height: croppedAreaPixels.height,
      });
      const d = await eventsApi.upload(file, "photo", base, { crop });
      setForm((f) => ({ ...f, images: [...f.images, d.path] }));
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const cancelCrop = () => setCropping(null);

  const moveImage = (i, dir) => {
    setForm((f) => {
      const imgs = [...f.images];
      const j = i + dir;
      if (j < 0 || j >= imgs.length) return f;
      [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
      return { ...f, images: imgs };
    });
  };

  const payload = () => ({
    title: form.title,
    titleUz: form.titleUz,
    titleEn: form.titleEn,
    date: form.month && form.year ? `${form.month} ${form.year}` : "",
    type: form.type,
    description: form.description,
    descriptionUz: form.descriptionUz,
    descriptionEn: form.descriptionEn,
    images: form.images,
    priority: form.priority === "" ? "" : Number(form.priority),
    hidden: !!form.hidden,
  });

  const save = async () => {
    setError("");
    setCommit(null);
    const miss = [];
    if (!form.title.trim()) miss.push("название (RU)");
    if (!form.titleUz.trim()) miss.push("название (UZ)");
    if (!form.month || !/^\d{4}$/.test(form.year)) miss.push("дата (месяц и год)");
    if (!form.description.trim()) miss.push("описание (RU)");
    if (!form.descriptionUz.trim()) miss.push("описание (UZ)");
    if (isNew && form.images.length === 0) miss.push("хотя бы одно фото");
    if (miss.length) {
      setError("Заполните обязательные поля: " + miss.join(", ") + ".");
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const d = await eventsApi.create(payload());
        setCommit(d.commit);
        navigate(`/events/${d.item.id}`, { replace: true });
      } else {
        const d = await eventsApi.update(id, payload());
        setCommit(d.commit);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-soft">Загрузка...</div>;

  return (
    <div>
      {cropping && (
        <EventPhotoCropModal file={cropping} onCancel={cancelCrop} onConfirm={confirmCrop} />
      )}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link to="/events" className="text-sm text-soft hover:text-clinical">
            ← К списку
          </Link>
          <h1 className="text-2xl font-extrabold text-ink">
            {isNew ? "Новое мероприятие" : form.title}
          </h1>
        </div>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Сохранение..." : "Сохранить"}
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <PublishStatus commit={commit} action={isNew ? "Мероприятие создано" : "Сохранено"} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-bold text-ink">Основное</h2>

          <label className="label">Название, RU *</label>
          <input className="field mb-4" value={form.title} onChange={(e) => set("title", e.target.value)} />

          <div className="mb-1 flex items-center justify-between">
            <label className="label mb-0">Название, UZ *</label>
            <DraftUz source={form.title} value={form.titleUz} onChange={(v) => set("titleUz", v)} />
          </div>
          <input className="field mb-4" value={form.titleUz} onChange={(e) => set("titleUz", e.target.value)} />

          <div className="mb-1 flex items-center justify-between">
            <label className="label mb-0">Название, EN</label>
            <DraftUz lang="en" source={form.title} value={form.titleEn} onChange={(v) => set("titleEn", v)} />
          </div>
          <input className="field mb-4" value={form.titleEn} onChange={(e) => set("titleEn", e.target.value)} />

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="label">Месяц *</label>
              <select className="field" value={form.month} onChange={(e) => set("month", e.target.value)}>
                <option value="">— выберите —</option>
                {RU_MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Год *</label>
              <input
                type="number"
                className="field"
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
                placeholder="2026"
              />
            </div>
          </div>

          <label className="label">Тип</label>
          <select className="field mb-4" value={form.type} onChange={(e) => set("type", e.target.value)}>
            <option value="">— не указан —</option>
            {Object.entries(EVENT_TYPE_RU).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <label className="label">Приоритет (меньше = выше на странице)</label>
          <input
            type="number"
            className="field mb-4"
            value={form.priority}
            onChange={(e) => set("priority", e.target.value)}
            placeholder="пусто = сортировка по дате"
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-line accent-clinical"
              checked={form.hidden}
              onChange={(e) => set("hidden", e.target.checked)}
            />
            Скрыто (не показывается на сайте)
          </label>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-bold text-ink">Фото {isNew ? "*" : ""}</h2>
          <div
            className="mb-4 rounded-lg border-2 border-dashed border-line p-6 text-center text-sm text-soft"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              doUpload(Array.from(e.dataTransfer.files));
            }}
          >
            Перетащите фото сюда или{" "}
            <button
              type="button"
              className="font-semibold text-clinical underline"
              onClick={() => fileRef.current?.click()}
            >
              выберите файлы
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                doUpload(Array.from(e.target.files));
                e.target.value = "";
              }}
            />
            <div className="mt-2 text-xs">
              Перед загрузкой фото можно обрезать под формат карточки (1600×1200).{" "}
              {uploading && "Загрузка..."}
            </div>
          </div>

          <div className="space-y-2">
            {form.images.map((img, i) => (
              <div key={img + i} className="flex items-center gap-3 rounded-lg border border-line p-2">
                <img src={imgUrl(img)} alt="" className="h-14 w-20 rounded object-cover" />
                <code className="flex-1 truncate text-xs text-soft">{img}</code>
                <button className="btn-ghost" onClick={() => moveImage(i, -1)} disabled={i === 0}>
                  ↑
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => moveImage(i, 1)}
                  disabled={i === form.images.length - 1}
                >
                  ↓
                </button>
                <button
                  className="btn-danger"
                  onClick={() => set("images", form.images.filter((_, idx) => idx !== i))}
                >
                  Удалить
                </button>
              </div>
            ))}
            {form.images.length === 0 && <p className="text-sm text-soft">Фото пока нет.</p>}
          </div>
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-bold text-ink">Описания</h2>
          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="label mb-0">Описание, RU *</label>
                <WordHint text={form.description} />
              </div>
              <textarea
                className="field h-40"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
            <div>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <label className="label mb-0">Описание, UZ *</label>
                <span className="inline-flex items-center gap-2">
                  <DraftUz
                    source={form.description}
                    value={form.descriptionUz}
                    onChange={(v) => set("descriptionUz", v)}
                  />
                  <WordHint text={form.descriptionUz} />
                </span>
              </div>
              <textarea
                className="field h-40"
                value={form.descriptionUz}
                onChange={(e) => set("descriptionUz", e.target.value)}
              />
            </div>
            <div>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <label className="label mb-0">Описание, EN</label>
                <DraftUz
                  lang="en"
                  source={form.description}
                  value={form.descriptionEn}
                  onChange={(v) => set("descriptionEn", v)}
                />
              </div>
              <textarea
                className="field h-40"
                value={form.descriptionEn}
                onChange={(e) => set("descriptionEn", e.target.value)}
              />
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 flex justify-end">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Сохранение..." : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
