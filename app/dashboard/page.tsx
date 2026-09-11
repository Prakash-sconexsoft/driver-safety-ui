"use client";

import { useEffect, useRef, useState } from "react";
import CameraView from "@/components/CameraView";
import { DriverWebSocket } from "@/lib/websocket";
import type {
  BackendMessage,
  ConnectionStatus,
  DrowsinessStatus,
  PhoneStatus,
} from "@/types/detection";

interface Driver {
  user_id: string;
  username: string;
  camera_id: string;
}

export default function DashboardPage() {
  const [driver, setDriver] = useState<Driver | null>(null);

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("DISCONNECTED");

  // ============================================================
  // DROWSINESS DOMAIN STATE
  // ============================================================

  const [drowsinessStatus, setDrowsinessStatus] =
    useState<DrowsinessStatus>("NORMAL");

  const [drowsinessAlertActive, setDrowsinessAlertActive] =
    useState(false);

  const [drowsinessAlertMessage, setDrowsinessAlertMessage] =
    useState("No active alerts.");

  const [drowsinessAlertTime, setDrowsinessAlertTime] =
    useState<string | null>(null);

  const [drowsinessEar, setDrowsinessEar] =
    useState<number | null>(null);

  const [drowsinessClosedDuration, setDrowsinessClosedDuration] =
    useState<number | null>(null);

  const [drowsinessConfidence, setDrowsinessConfidence] =
    useState<number | null>(null);

  const [drowsinessPeakConfidence, setDrowsinessPeakConfidence] =
    useState<number | null>(null);

  // Latches independently of React state so the WebSocket
  // message handler (captured once in the effect below) always
  // sees the up-to-date value instead of a stale closure.
  const drowsinessAlertActiveRef =
    useRef(false);

  // ============================================================
  // PHONE DOMAIN STATE
  // ============================================================

  const [phoneStatus, setPhoneStatus] =
    useState<PhoneStatus>("NORMAL");

  const [phoneAlertActive, setPhoneAlertActive] =
    useState(false);

  const [phoneAlertMessage, setPhoneAlertMessage] =
    useState("No active alerts.");

  const [phoneAlertTime, setPhoneAlertTime] =
    useState<string | null>(null);

  const [phoneConfidence, setPhoneConfidence] =
    useState<number | null>(null);

  const [phonePeakConfidence, setPhonePeakConfidence] =
    useState<number | null>(null);

  const audioContextRef =
    useRef<AudioContext | null>(null);

  const websocketRef =
    useRef<DriverWebSocket | null>(null);

  // ============================================================
  // AUDIO
  // ============================================================

  const initializeAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current =
        new AudioContext();
    }

    if (
      audioContextRef.current.state ===
      "suspended"
    ) {
      audioContextRef.current.resume();
    }
  };

  const playBeep = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current =
          new AudioContext();
      }

      const context =
        audioContextRef.current;

      if (context.state === "suspended") {
        context.resume();
      }

      const oscillator =
        context.createOscillator();

      const gainNode =
        context.createGain();

      oscillator.type = "sine";

      oscillator.frequency.setValueAtTime(
        880,
        context.currentTime
      );

      gainNode.gain.setValueAtTime(
        0.001,
        context.currentTime
      );

      gainNode.gain.exponentialRampToValueAtTime(
        0.3,
        context.currentTime + 0.02
      );

      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + 0.5
      );

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.start();

      oscillator.stop(
        context.currentTime + 0.5
      );
    } catch (error) {
      console.error(
        "Unable to play beep:",
        error
      );
    }
  };

  // ============================================================
  // WEBSOCKET
  // ============================================================

  useEffect(() => {
    const storedDriver =
      localStorage.getItem("driver");

    if (!storedDriver) {
      console.error(
        "No driver information found."
      );

      return;
    }

    const driverData: Driver =
      JSON.parse(storedDriver);

    setDriver(driverData);

    const websocket =
      new DriverWebSocket();

    websocketRef.current = websocket;

    setConnectionStatus("CONNECTING");

    websocket.connect(
      // ========================================================
      // CONNECTED
      // ========================================================

      () => {
        console.log(
          "Connected to FastAPI"
        );

        setConnectionStatus("CONNECTED");

        websocket.startStream(
          driverData
        );
      },

      // ========================================================
      // MESSAGE FROM FASTAPI
      // ========================================================

      (message: BackendMessage) => {
  console.log(
    "Message from FastAPI:",
    message
  );

  // ==========================================================
  // DROWSINESS ALERT — ONLY affects the drowsiness domain.
  // Starts/latches the alert. Only DROWSINESS_CLEARED (below)
  // is allowed to clear it.
  // ==========================================================
  if (
    "type" in message &&
    message.type === "DROWSINESS_ALERT"
  ) {
    console.log(
      "🚨 DROWSINESS ALERT RECEIVED:",
      message
    );

    drowsinessAlertActiveRef.current = true;

    setDrowsinessStatus("DROWSY");

    setDrowsinessAlertActive(true);

    setDrowsinessAlertMessage(
      message.message ||
        message.label ||
        "Driver drowsiness detected — immediate attention required."
    );

    setDrowsinessAlertTime(
      message.timestamp ||
        new Date().toISOString()
    );

    if (
      message.ear !== undefined &&
      message.ear !== null
    ) {
      setDrowsinessEar(message.ear);
    }

    if (
      message.closed_duration !== undefined &&
      message.closed_duration !== null
    ) {
      setDrowsinessClosedDuration(
        message.closed_duration
      );
    }

    if (message.confidence !== undefined) {
      setDrowsinessConfidence(message.confidence);
    }

    if (
      message.peak_confidence !== undefined
    ) {
      setDrowsinessPeakConfidence(
        message.peak_confidence
      );
    }

    playBeep();

    return;
  }

  // ==========================================================
  // DROWSINESS CLEARED — ONLY affects the drowsiness domain.
  // The ONLY event allowed to transition an active drowsiness
  // alert back to NORMAL.
  // ==========================================================
  if (
    "type" in message &&
    message.type === "DROWSINESS_CLEARED"
  ) {
    console.log("🟢 DROWSINESS CLEARED");

    drowsinessAlertActiveRef.current = false;

    setDrowsinessStatus("NORMAL");
    setDrowsinessAlertActive(false);
    setDrowsinessAlertMessage("No active alerts.");
    setDrowsinessClosedDuration(null);
    setDrowsinessConfidence(null);
    setDrowsinessPeakConfidence(null);

    if (
      message.ear !== undefined &&
      message.ear !== null
    ) {
      setDrowsinessEar(message.ear);
    }

    return;
  }

  // ==========================================================
  // PHONE ALERT — ONLY affects the phone domain. Must never
  // touch drowsiness state.
  // ==========================================================
  if (
    "type" in message &&
    message.type === "PHONE_ALERT"
  ) {
    console.log(
      "📱 PHONE ALERT RECEIVED:",
      message
    );

    setPhoneStatus("PHONE_DETECTED");

    setPhoneAlertActive(true);

    setPhoneAlertMessage(
      message.message ||
        message.label ||
        "Phone usage detected — immediate attention required."
    );

    setPhoneAlertTime(
      message.timestamp ||
        new Date().toISOString()
    );

    if (message.confidence !== undefined) {
      setPhoneConfidence(message.confidence);
    }

    if (
      message.peak_confidence !== undefined
    ) {
      setPhonePeakConfidence(
        message.peak_confidence
      );
    }

    playBeep();

    return;
  }

  // ==========================================================
  // PHONE CLEARED — ONLY affects the phone domain. Must never
  // touch drowsiness state.
  // ==========================================================
  if (
    "type" in message &&
    message.type === "PHONE_CLEARED"
  ) {
    console.log("🟢 PHONE CLEARED");

    setPhoneStatus("NORMAL");
    setPhoneAlertActive(false);
    setPhoneAlertMessage("No active alerts.");
    setPhoneConfidence(null);
    setPhonePeakConfidence(null);

    return;
  }

  // ==========================================================
  // DETECTION STATUS — routed by message.domain. `state` alone
  // is never enough to tell drowsiness and phone apart.
  // ==========================================================
  if (
    "type" in message &&
    message.type === "DETECTION_STATUS"
  ) {
    if (message.domain === "drowsiness") {
      if (
        message.ear !== undefined &&
        message.ear !== null
      ) {
        setDrowsinessEar(message.ear);
      }

      if (message.state === "normal") {
        if (drowsinessAlertActiveRef.current) {
          console.log(
            "Drowsiness alert remains active; ignoring normal detection status."
          );

          return;
        }

        setDrowsinessStatus("NORMAL");
      }

      return;
    }

    if (message.domain === "phone") {
      if (message.state === "normal") {
        setPhoneStatus("NORMAL");
      }

      if (message.state === "phone_detected") {
        setPhoneStatus("PHONE_DETECTED");
      }

      return;
    }

    return;
  }

  // REGISTERED
  if (
    "type" in message &&
    message.type === "REGISTERED"
  ) {
    console.log(
      "Driver registered successfully:",
      message
    );

    return;
  }

  // ERROR
  if (
    "type" in message &&
    message.type === "ERROR"
  ) {
    console.error(
      "FastAPI error:",
      message.message
    );

    return;
  }
},

      // ========================================================
      // DISCONNECTED
      // ========================================================

      () => {
        console.log(
          "WebSocket disconnected"
        );

        setConnectionStatus(
          "DISCONNECTED"
        );
      },

      // ========================================================
      // ERROR
      // ========================================================

      (error) => {
        console.error(
          "WebSocket error:",
          error
        );

        setConnectionStatus(
          "DISCONNECTED"
        );
      }
    );

    // ==========================================================
    // CLEANUP
    // ==========================================================

    return () => {
      websocket.disconnect();

      websocketRef.current = null;
    };
  }, []);

  // ============================================================
  // UI
  // ============================================================

  const anyAlertActive =
    drowsinessAlertActive || phoneAlertActive;

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <header className="border-b border-slate-800 bg-slate-900">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-xl">
              🚛
            </div>

            <div>

              <h1 className="font-bold">
                Driver Safety System
              </h1>

              <p className="text-xs text-slate-400">
                Real-time monitoring
              </p>

            </div>

          </div>

          <div className="flex items-center gap-4">

            <div className="text-right">

              <p className="text-sm font-medium">
                {driver?.username ||
                  "Driver"}
              </p>

              <p className="text-xs text-slate-400">
                {driver?.user_id ||
                  "Unknown"}
              </p>

            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700">
              👤
            </div>

          </div>

        </div>

      </header>

      {/* ====================================================== */}
      {/* DASHBOARD */}
      {/* ====================================================== */}

      <div className="mx-auto max-w-7xl px-6 py-8">

        <div className="mb-8">

          <h2 className="text-2xl font-bold">
            Driver Monitoring Dashboard
          </h2>

          <p className="mt-1 text-slate-400">
            Monitor driver behaviour in
            real time.
          </p>

        </div>

        {/* ==================================================== */}
        {/* MAIN GRID */}
        {/* ==================================================== */}

        <div className="grid gap-6 lg:grid-cols-3">

          {/* ================================================== */}
          {/* CAMERA */}
          {/* ================================================== */}

          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 lg:col-span-2">

            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">

              <div>

                <h3 className="font-semibold">
                  Camera Feed
                </h3>

                <p className="text-xs text-slate-400">
                  {driver?.camera_id ||
                    "Camera not registered"}
                </p>

              </div>

              <div className="flex items-center gap-2 text-xs">

                <span
                  className={`h-2 w-2 rounded-full ${
                    connectionStatus ===
                    "CONNECTED"
                      ? "bg-emerald-500"
                      : connectionStatus ===
                          "CONNECTING"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                />

                <span className="text-slate-400">

                  {connectionStatus ===
                  "CONNECTED"
                    ? "Camera connected"
                    : connectionStatus ===
                        "CONNECTING"
                      ? "Connecting..."
                      : "Camera offline"}

                </span>

              </div>

            </div>

            <CameraView
              onFrame={(frame) => {
                websocketRef.current?.sendFrame(
                  frame
                );
              }}
            />

          </section>

          {/* ================================================== */}
          {/* DRIVER STATUS — drowsiness and phone are shown as  */}
          {/* two independent domains, never merged.             */}
          {/* ================================================== */}

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <h3 className="font-semibold">
              Driver Status
            </h3>

            <div className="mt-6 grid grid-cols-2 gap-3">

              {/* ============================================= */}
              {/* DROWSINESS STATUS */}
              {/* ============================================= */}

              <div
                className={`rounded-xl border p-4 text-center ${
                  drowsinessStatus === "NORMAL"
                    ? "border-emerald-900 bg-slate-950"
                    : "border-red-900 bg-red-950/20"
                }`}
              >

                <div
                  className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
                    drowsinessStatus === "DROWSY"
                      ? "bg-red-500/20"
                      : "bg-emerald-500/10"
                  }`}
                >

                  {drowsinessStatus === "DROWSY"
                    ? "🚨"
                    : "🟢"}

                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Drowsiness
                </p>

                <h4
                  className={`mt-1 text-lg font-bold ${
                    drowsinessStatus === "NORMAL"
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {drowsinessStatus}
                </h4>

              </div>

              {/* ============================================= */}
              {/* PHONE STATUS */}
              {/* ============================================= */}

              <div
                className={`rounded-xl border p-4 text-center ${
                  phoneStatus === "NORMAL"
                    ? "border-emerald-900 bg-slate-950"
                    : "border-amber-900 bg-amber-950/20"
                }`}
              >

                <div
                  className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
                    phoneStatus === "PHONE_DETECTED"
                      ? "bg-amber-500/20"
                      : "bg-emerald-500/10"
                  }`}
                >

                  {phoneStatus === "PHONE_DETECTED"
                    ? "📱"
                    : "🟢"}

                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Phone Usage
                </p>

                <h4
                  className={`mt-1 text-lg font-bold ${
                    phoneStatus === "NORMAL"
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }`}
                >
                  {phoneStatus === "PHONE_DETECTED"
                    ? "DETECTED"
                    : "NORMAL"}
                </h4>

              </div>

            </div>

            {/* ================================================= */}
            {/* EAR */}
            {/* ================================================= */}

            <div className="mt-6 rounded-xl bg-slate-800 p-4">

              <div className="flex items-center justify-between">

                <span className="text-sm text-slate-400">
                  Eye Aspect Ratio
                </span>

                <span className="font-semibold">

                  {drowsinessEar !== null
                    ? drowsinessEar.toFixed(3)
                    : "--"}

                </span>

              </div>

            </div>

            {/* ================================================= */}
            {/* CONNECTION */}
            {/* ================================================= */}

            <div className="mt-3 rounded-xl bg-slate-800 p-4">

              <div className="flex items-center justify-between">

                <span className="text-sm text-slate-400">
                  WebSocket
                </span>

                <span
                  className={`flex items-center gap-2 text-sm ${
                    connectionStatus ===
                    "CONNECTED"
                      ? "text-emerald-400"
                      : connectionStatus ===
                          "CONNECTING"
                        ? "text-yellow-400"
                        : "text-red-400"
                  }`}
                >

                  <span
                    className={`h-2 w-2 rounded-full ${
                      connectionStatus ===
                      "CONNECTED"
                        ? "bg-emerald-500"
                        : connectionStatus ===
                            "CONNECTING"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                  />

                  {connectionStatus}

                </span>

              </div>

            </div>

          </section>

        </div>

        {/* ==================================================== */}
        {/* SAFETY ALERTS — drowsiness and phone alerts are      */}
        {/* rendered independently and can both be active at     */}
        {/* the same time without overwriting each other.        */}
        {/* ==================================================== */}

        <section
          className={`mt-6 rounded-2xl border p-6 ${
            anyAlertActive
              ? "border-red-500/50 bg-red-950/40"
              : "border-slate-800 bg-slate-900"
          }`}
        >

          <div className="flex items-center justify-between">

            <h3 className="font-semibold">
              Safety Alerts
            </h3>

            {anyAlertActive && (
              <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">
                ACTIVE
              </span>
            )}

          </div>

          {!anyAlertActive && (
            <p className="mt-2 text-sm text-slate-400">
              No active alerts.
            </p>
          )}

          <div className="mt-4 space-y-4">

            {/* ================================================= */}
            {/* DROWSINESS ALERT */}
            {/* ================================================= */}

            {drowsinessAlertActive && (
              <div className="flex items-start gap-4 rounded-xl bg-red-950/30 p-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-2xl">
                  🚨
                </div>

                <div className="flex-1">

                  <p className="font-semibold text-red-400">
                    {drowsinessAlertMessage}
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">

                    <div className="rounded-lg bg-slate-900/70 p-3">

                      <p className="text-xs text-slate-500">
                        Status
                      </p>

                      <p className="mt-1 font-semibold text-red-400">
                        DROWSY
                      </p>

                    </div>

                    <div className="rounded-lg bg-slate-900/70 p-3">

                      <p className="text-xs text-slate-500">
                        EAR
                      </p>

                      <p className="mt-1 font-semibold">
                        {drowsinessEar !== null
                          ? drowsinessEar.toFixed(3)
                          : "--"}
                      </p>

                    </div>

                    <div className="rounded-lg bg-slate-900/70 p-3">

                      <p className="text-xs text-slate-500">
                        Eyes Closed
                      </p>

                      <p className="mt-1 font-semibold">

                        {drowsinessClosedDuration !== null
                          ? `${drowsinessClosedDuration.toFixed(
                              2
                            )}s`
                          : "--"}

                      </p>

                    </div>

                    {drowsinessConfidence !== null && (
                      <div className="rounded-lg bg-slate-900/70 p-3">

                        <p className="text-xs text-slate-500">
                          Confidence
                        </p>

                        <p className="mt-1 font-semibold">

                          {(drowsinessConfidence * 100).toFixed(0)}%
                          {drowsinessPeakConfidence !== null &&
                            ` (peak ${(drowsinessPeakConfidence * 100).toFixed(0)}%)`}

                        </p>

                      </div>
                    )}

                  </div>

                  {drowsinessAlertTime && (
                    <p className="mt-3 text-xs text-slate-500">

                      Alert received:{" "}

                      {new Date(
                        drowsinessAlertTime
                      ).toLocaleTimeString()}

                    </p>
                  )}

                </div>

              </div>
            )}

            {/* ================================================= */}
            {/* PHONE ALERT */}
            {/* ================================================= */}

            {phoneAlertActive && (
              <div className="flex items-start gap-4 rounded-xl bg-amber-950/30 p-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-2xl">
                  📱
                </div>

                <div className="flex-1">

                  <p className="font-semibold text-amber-400">
                    {phoneAlertMessage}
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">

                    <div className="rounded-lg bg-slate-900/70 p-3">

                      <p className="text-xs text-slate-500">
                        Status
                      </p>

                      <p className="mt-1 font-semibold text-amber-400">
                        PHONE DETECTED
                      </p>

                    </div>

                    {phoneConfidence !== null && (
                      <div className="rounded-lg bg-slate-900/70 p-3">

                        <p className="text-xs text-slate-500">
                          Confidence
                        </p>

                        <p className="mt-1 font-semibold">

                          {(phoneConfidence * 100).toFixed(0)}%
                          {phonePeakConfidence !== null &&
                            ` (peak ${(phonePeakConfidence * 100).toFixed(0)}%)`}

                        </p>

                      </div>
                    )}

                  </div>

                  {phoneAlertTime && (
                    <p className="mt-3 text-xs text-slate-500">

                      Alert received:{" "}

                      {new Date(
                        phoneAlertTime
                      ).toLocaleTimeString()}

                    </p>
                  )}

                </div>

              </div>
            )}

          </div>

        </section>

      </div>

      {/* ====================================================== */}
      {/* AUDIO INITIALIZATION */}
      {/* ====================================================== */}

      <div className="fixed bottom-4 right-4">

        <button
          onClick={initializeAudio}
          className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs text-slate-400 hover:bg-slate-800"
        >
          Enable Alert Sound
        </button>

      </div>

    </main>
  );
}
