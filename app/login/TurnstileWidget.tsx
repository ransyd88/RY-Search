"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function TurnstileWidget({
  attempt,
  disabled,
  language,
  onToken,
  siteKey,
}: {
  attempt: number;
  disabled: boolean;
  language: "en" | "zh";
  onToken: (token: string) => void;
  siteKey: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!scriptReady || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action: "login",
      appearance: "interaction-only",
      language: language === "zh" ? "zh-cn" : "en",
      size: "flexible",
      theme: "light",
      "response-field": false,
      callback: (token: string) => onToken(token),
      "expired-callback": () => onToken(""),
      "error-callback": () => onToken(""),
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [language, onToken, scriptReady, siteKey]);

  useEffect(() => {
    if (!attempt || !widgetIdRef.current || !window.turnstile) return;
    onToken("");
    window.turnstile.reset(widgetIdRef.current);
  }, [attempt, onToken]);

  return (
    <div className={`login-turnstile${disabled ? " disabled" : ""}`}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div ref={containerRef} />
    </div>
  );
}
