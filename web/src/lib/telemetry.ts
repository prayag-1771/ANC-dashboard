"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Posture = "supine" | "left" | "right";

export interface Stereo {
  left: number;
  right: number;
}

export interface TelemetryFrame {
  ts: number;
  t: number;
  posture: Posture;
  posturePinned: boolean;
  ambientDb: number;
  eventKind: string | null;
  anc: Stereo;
  residualDb: Stereo;
  passiveDb: number;
  pressureKpa: Stereo;
  deformationMm: Stereo;
  sealPct: Stereo;
  powerMw: number;
  batteryPct: number;
  latencyMs: number;
  mode: "simulation" | "hardware";
}

export interface NoiseEvent {
  kind: string;
  label: string;
  band: string;
  peakDb: number;
  at: number; // client timestamp
}

export type ConnStatus = "connecting" | "live" | "offline";

const SERVER =
  process.env.NEXT_PUBLIC_ANC_SERVER?.replace(/\/$/, "") ?? "http://localhost:4100";
export const SERVER_HTTP = SERVER;
const WS_URL = SERVER.replace(/^http/, "ws") + "/ws";

const HISTORY = 300; // ~60 s at 5 Hz

export function useTelemetry() {
  const [frame, setFrame] = useState<TelemetryFrame | null>(null);
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const [events, setEvents] = useState<NoiseEvent[]>([]);
  const historyRef = useRef<TelemetryFrame[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);

  useEffect(() => {
    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      if (closed) return;
      setStatus((s) => (s === "live" ? s : "connecting"));
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        setStatus("live");
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "telemetry") {
            const f = msg.data as TelemetryFrame;
            const h = historyRef.current;
            h.push(f);
            if (h.length > HISTORY) h.splice(0, h.length - HISTORY);
            setFrame(f);
          } else if (msg.type === "noise-event") {
            setEvents((prev) =>
              [{ ...(msg.data as Omit<NoiseEvent, "at">), at: Date.now() }, ...prev].slice(0, 8),
            );
          }
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onclose = () => {
        if (closed) return;
        setStatus("offline");
        const delay = Math.min(8000, 500 * 2 ** retryRef.current++);
        reconnectTimer = setTimeout(connect, delay);
      };
      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      closed = true;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  const sendPosture = useCallback((posture: Posture | "auto") => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "posture", posture }));
    }
  }, []);

  return { frame, history: historyRef.current, events, status, sendPosture };
}
