import { useEffect } from "react";

// Warns the admin before they lose unsaved changes: `beforeunload` covers tab
// close/refresh/address-bar navigation, and a capture-phase click listener
// covers in-app navigation (nav links, "Изменить", "+ Добавить") since this
// app uses plain react-router <Routes> (no data router / useBlocker).
export default function useUnsavedChangesGuard(
  active,
  message = "У вас есть несохранённые изменения в порядке сортировки. Уйти без сохранения?"
) {
  useEffect(() => {
    if (!active) return undefined;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    const handleClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const link = e.target.closest("a[href]");
      if (!link || link.target === "_blank") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm(message)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    document.addEventListener("click", handleClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, [active, message]);
}
