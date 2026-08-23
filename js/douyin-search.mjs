export const normalizeDouyinWord = (value) => String(value ?? "").trim();

export function buildDouyinLinks(value) {
  const word = normalizeDouyinWord(value);
  if (!word) return null;
  const encoded = encodeURIComponent(word);
  return {
    word,
    appUrl: `snssdk1128://search?keyword=${encoded}`,
    webUrl: `https://www.douyin.com/search/${encoded}`,
  };
}

export function isMobileDouyinDevice(navigatorRef = {}) {
  if (navigatorRef?.userAgentData?.mobile === true) return true;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(String(navigatorRef?.userAgent ?? ""))) {
    return true;
  }
  return navigatorRef?.platform === "MacIntel"
    && Number(navigatorRef?.maxTouchPoints ?? 0) > 1;
}

export function openDouyinSearch(value, options = {}) {
  const links = buildDouyinLinks(value);
  if (!links) return { launched: false };
  const windowRef = options.windowRef ?? window;
  const navigatorRef = options.navigatorRef
    ?? (typeof navigator !== "undefined" ? navigator : {});

  if (!isMobileDouyinDevice(navigatorRef)) {
    let opened = false;
    try {
      opened = Boolean(windowRef.open(
        links.webUrl,
        "_blank",
        "noopener,noreferrer",
      ));
    } catch {
      opened = false;
    }
    if (!opened) windowRef.location.assign(links.webUrl);
    return { launched: true, links };
  }

  const documentRef = options.documentRef ?? document;
  const fallbackDelay = options.fallbackDelay ?? 1500;
  let cancelled = false;
  let timerId;
  const cleanup = () => {
    if (timerId !== undefined) windowRef.clearTimeout(timerId);
    documentRef.removeEventListener("visibilitychange", onVisibilityChange);
  };
  const cancel = () => {
    cancelled = true;
    cleanup();
  };
  const onVisibilityChange = () => {
    if (documentRef.hidden) cancel();
  };
  documentRef.addEventListener("visibilitychange", onVisibilityChange);
  timerId = windowRef.setTimeout(() => {
    if (cancelled || documentRef.hidden) return;
    cleanup();
    windowRef.location.assign(links.webUrl);
  }, fallbackDelay);
  try {
    windowRef.location.assign(links.appUrl);
  } catch {
    cleanup();
    windowRef.location.assign(links.webUrl);
  }
  return { launched: true, links, cancel };
}

if (typeof window !== "undefined") {
  window.DouyinSearch = { buildDouyinLinks, openDouyinSearch };
}
