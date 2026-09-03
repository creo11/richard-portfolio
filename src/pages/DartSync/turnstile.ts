export type TurnstileAction =
  | "player_create"
  | "player_update"
  | "player_reset"
  | "player_delete"
  | "game_start"
  | "game_complete"
  | "game_abandon";

const TURNSTILE_SITE_KEY = "0x4AAAAAAEjiyS4IbzQLd7D2";
const TURNSTILE_SCRIPT_ID = "dartsync-turnstile-script";

type TurnstileWidgetOptions = {
  sitekey: string;
  action: TurnstileAction;
  execution: "execute";
  appearance: "interaction-only";
  theme: "dark";
  callback: (token: string) => void;
  "error-callback": () => boolean;
  "expired-callback": () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileWidgetOptions) => string;
  execute: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  const pendingScript = new Promise<TurnstileApi>((resolve, reject) => {
    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID);
    const script = existingScript instanceof HTMLScriptElement
      ? existingScript
      : document.createElement("script");

    const handleLoad = () => {
      if (window.turnstile) {
        resolve(window.turnstile);
      } else {
        reject(new Error("Cloudflare verification did not load."));
      }
    };

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Cloudflare verification could not be loaded.")),
      { once: true },
    );

    if (!existingScript) {
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.append(script);
    }
  }).catch((error) => {
    scriptPromise = null;
    throw error;
  });

  scriptPromise = pendingScript;
  return pendingScript;
}

export async function requestTurnstileToken(
  container: HTMLElement,
  action: TurnstileAction,
): Promise<{ token: string; release: () => void }> {
  const turnstile = await loadTurnstile();

  return new Promise((resolve, reject) => {
    let widgetId = "";
    let settled = false;

    const release = () => {
      if (widgetId) turnstile.remove(widgetId);
      container.replaceChildren();
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      release();
      reject(new Error(message));
    };

    widgetId = turnstile.render(container, {
      sitekey: TURNSTILE_SITE_KEY,
      action,
      execution: "execute",
      appearance: "interaction-only",
      theme: "dark",
      callback: (token) => {
        if (settled) return;
        settled = true;
        resolve({ token, release });
      },
      "error-callback": () => {
        fail("Cloudflare could not verify this request. Please try again.");
        return true;
      },
      "expired-callback": () => {
        fail("Cloudflare verification expired. Please try again.");
      },
    });

    turnstile.execute(widgetId);
  });
}
