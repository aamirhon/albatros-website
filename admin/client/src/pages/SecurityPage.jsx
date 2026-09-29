import { useEffect, useState } from "react";
import { api } from "../api";

const EVENT_RU = {
  login_ok: "Вход",
  login_failed: "Неудачный вход",
  login_blocked: "Вход заблокирован (подбор)",
  logout: "Выход",
  password_changed: "Пароль изменён",
  password_change_failed: "Неудачная смена пароля",
  users_at_startup: "Запуск сервера",
  users_changed: "Изменён список аккаунтов",
  users_pruned: "Удалены заблокированные аккаунты",
};

const ALERT = new Set(["login_failed", "login_blocked", "password_change_failed", "users_changed"]);

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "medium" });
  } catch {
    return iso || "—";
  }
}

function eventDetails(e) {
  const parts = [];
  if (e.reason) parts.push(e.reason);
  if (e.added?.length) parts.push("добавлены: " + e.added.join(", "));
  if (e.removed?.length) parts.push("удалены: " + e.removed.join(", "));
  if (e.accounts?.length && e.event === "users_at_startup") parts.push(e.accounts.join(", "));
  if (e.retryAfter) parts.push(`блок ещё ${Math.ceil(e.retryAfter / 60)} мин`);
  return parts.join("; ");
}

function PasswordForm() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    if (next !== again) return setError("Новые пароли не совпадают.");
    if (next.length < 12) return setError("Новый пароль должен быть не короче 12 символов.");
    setBusy(true);
    try {
      await api.changePassword(cur, next);
      setCur("");
      setNext("");
      setAgain("");
      setOk("Пароль изменён. Все остальные сессии (другие браузеры и устройства) завершены.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card p-5" onSubmit={submit}>
      <h2 className="mb-4 font-bold text-ink">Смена пароля</h2>
      {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {ok && <div className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</div>}
      <label className="label">Текущий пароль</label>
      <input
        type="password"
        className="field mb-3"
        autoComplete="current-password"
        value={cur}
        onChange={(e) => setCur(e.target.value)}
      />
      <label className="label">Новый пароль (не короче 12 символов)</label>
      <input
        type="password"
        className="field mb-3"
        autoComplete="new-password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
      />
      <label className="label">Повторите новый пароль</label>
      <input
        type="password"
        className="field mb-4"
        autoComplete="new-password"
        value={again}
        onChange={(e) => setAgain(e.target.value)}
      />
      <button type="submit" className="btn-primary" disabled={busy || !cur || !next}>
        {busy ? "Сохранение..." : "Сменить пароль"}
      </button>
    </form>
  );
}

export default function SecurityPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [pruning, setPruning] = useState(false);

  const load = () =>
    api
      .security()
      .then(setData)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const blocked = data ? data.accounts.filter((a) => a.blocked) : [];

  const prune = async () => {
    if (!window.confirm(`Удалить заблокированные аккаунты (${blocked.map((a) => a.email).join(", ")})?`)) {
      return;
    }
    setPruning(true);
    setMsg("");
    try {
      const d = await api.pruneBlockedUsers();
      setMsg(d.removed.length ? "Удалены: " + d.removed.join(", ") : "Удалять нечего.");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setPruning(false);
    }
  };

  if (error) return <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="text-soft">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-ink">Безопасность</h1>

      <section className="card p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-bold text-ink">Аккаунты</h2>
          {blocked.length > 0 && (
            <button className="btn-danger" onClick={prune} disabled={pruning}>
              {pruning ? "Удаление..." : `Удалить заблокированные (${blocked.length})`}
            </button>
          )}
        </div>
        <p className="mb-4 text-xs text-soft">
          Войти могут только:{" "}
          {data.status.allowList.length ? data.status.allowList.join(", ") : "все аккаунты из списка"}.
          Остальные заблокированы, даже если они есть в списке.
        </p>
        {msg && <div className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</div>}
        <div className="space-y-2">
          {data.accounts.map((a) => (
            <div
              key={a.id}
              className={
                "flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm " +
                (a.blocked ? "border-red-200 bg-red-50" : "border-line")
              }
            >
              <span className="font-semibold text-ink">{a.email}</span>
              <span className="text-soft">{a.name}</span>
              <span className="text-xs text-soft">создан {fmtDate(a.createdAt)}</span>
              {a.you && <span className="text-xs font-semibold text-clinical">это вы</span>}
              {a.blocked && (
                <span className="text-xs font-semibold text-red-700">заблокирован: {a.blocked}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <PasswordForm />

      <section className="card p-5">
        <h2 className="mb-1 font-bold text-ink">Журнал входов и изменений аккаунтов</h2>
        <p className="mb-4 text-xs text-soft">
          Последние {data.events.length} событий, новые сверху. Подозрительные выделены.
        </p>
        {data.events.length === 0 ? (
          <p className="text-sm text-soft">Событий пока нет.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-soft">
                <tr>
                  <th className="py-1 pr-3">Время</th>
                  <th className="py-1 pr-3">Событие</th>
                  <th className="py-1 pr-3">Аккаунт</th>
                  <th className="py-1 pr-3">IP</th>
                  <th className="py-1">Подробности</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((e, i) => (
                  <tr
                    key={i}
                    className={"border-t border-line " + (ALERT.has(e.event) ? "bg-red-50" : "")}
                  >
                    <td className="whitespace-nowrap py-1 pr-3">{fmtDate(e.time)}</td>
                    <td className="py-1 pr-3">{EVENT_RU[e.event] || e.event}</td>
                    <td className="py-1 pr-3">{e.email || "—"}</td>
                    <td className="py-1 pr-3 font-mono">{e.ip || "—"}</td>
                    <td className="py-1 text-soft" title={e.ua || ""}>
                      {eventDetails(e)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
