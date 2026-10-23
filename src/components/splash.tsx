"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { LogoMark } from "./logo";

const SPLASH_KEY = "weiyu:splash:v1";

type Phase = "covered" | "playing" | "leaving" | "done";

export function SplashScreen({ logoUrl }: { logoUrl?: string | null }) {
  const [phase, setPhase] = useState<Phase>("covered");
  const timers = useRef<number[]>([]);

  const finish = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    setPhase("leaving");
    try {
      window.sessionStorage.setItem(SPLASH_KEY, "1");
    } catch {
      // sessionStorage 不可用時，僅播放本次
    }
    const id = window.setTimeout(() => setPhase("done"), 460);
    timers.current.push(id);
  }, []);

  useEffect(() => {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SPLASH_KEY) === "1";
    } catch {
      seen = false;
    }
    const reducedMotion =
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (seen || reducedMotion) {
      const id = window.setTimeout(() => {
        try {
          window.sessionStorage.setItem(SPLASH_KEY, "1");
        } catch {
          // ignore
        }
        setPhase("done");
      }, 120);
      timers.current.push(id);
      return () => {
        timers.current.forEach((timer) => window.clearTimeout(timer));
        timers.current = [];
      };
    }

    document.body.style.overflow = "hidden";
    const start = window.setTimeout(() => setPhase("playing"), 30);
    const id = window.setTimeout(finish, 2050);
    timers.current.push(start, id);

    return () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current = [];
      document.body.style.overflow = "";
    };
  }, [finish]);

  useEffect(() => {
    document.body.style.overflow = phase === "done" ? "" : "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase]);

  if (phase === "done") return null;

  const shown = phase === "playing" || phase === "leaving";

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-cream transition-opacity duration-[460ms] ease-out ${
        phase === "leaving" ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden={phase === "leaving"}
      data-splash={phase}
    >
      <div className="flex flex-col items-center px-6 text-center">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="WEIYU 唯遇甜所"
            className={`h-72 max-h-[58vh] w-auto max-w-[84vw] object-contain ${shown ? "animate-scale-in" : "opacity-0"}`}
          />
        ) : (
          <>
            <div className={`text-caramel ${shown ? "splash-draw" : "opacity-0"}`}>
              <LogoMark className="h-36 w-[6.4rem] sm:h-44 sm:w-[7.8rem]" strokeWidth={1.5} />
            </div>
            <div
              className={`mt-8 pl-[0.5em] font-serif text-4xl tracking-[0.5em] text-caramel-deep sm:text-5xl ${shown ? "animate-rise" : "opacity-0"}`}
              style={{ animationDelay: "620ms" }}
            >
              WEIYU
            </div>
            <div
              className={`mt-4 pl-[0.5em] text-base tracking-[0.5em] text-caramel-deep sm:text-lg ${shown ? "animate-rise" : "opacity-0"}`}
              style={{ animationDelay: "900ms" }}
            >
              唯遇甜所
            </div>
            <div className={`mt-6 h-px w-14 bg-caramel/70 ${shown ? "animate-fade-in" : "opacity-0"}`} style={{ animationDelay: "1100ms" }} />
            <p
              className={`mt-5 pl-[0.36em] text-sm tracking-[0.36em] text-cocoa-soft ${shown ? "animate-fade-in" : "opacity-0"}`}
              style={{ animationDelay: "1250ms" }}
            >
              遇見一口甜。
            </p>
          </>
        )}
      </div>

      {phase === "playing" ? (
        <button
          type="button"
          onClick={finish}
          className="absolute bottom-8 right-6 rounded-full border border-mist/80 bg-cream/80 px-4 py-2 text-xs tracking-[0.18em] text-cocoa-soft transition-colors hover:border-caramel hover:text-caramel-deep sm:right-10"
        >
          略過開場
        </button>
      ) : null}
    </div>
  );
}
