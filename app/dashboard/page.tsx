"use client";

import { useEffect, useRef, useState } from "react";
import CameraView from "@/components/CameraView";
import { DriverWebSocket } from "@/lib/websocket";
import type {
  BackendMessage,
  ConnectionStatus,
  DriverStatus,
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

  const [driverStatus, setDriverStatus] =
    useState<DriverStatus>("NORMAL");

  const [ear, setEar] = useState<number | null>(null);

  const [alertActive, setAlertActive] =
    useState(false);

  const [alertMessage, setAlertMessage] =
    useState("No active alerts.");

  const [alertTime, setAlertTime] =
    useState<string | null>(null);

  const [closedDuration, setClosedDuration] =
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

  // NORMAL
  if (
    "state" in message &&
    message.state === "normal"
  ) {
    console.log(
      "🟢 Driver returned to NORMAL"
    );

    setDriverStatus("NORMAL");
    setAlertActive(false);
    setAlertMessage("No active alerts.");
    setClosedDuration(null);

    return;
  }

  // DROWSINESS
  if (
    "type" in message &&
    message.type === "DROWSINESS_ALERT"
  ) {
    console.log(
      "🚨 DROWSINESS ALERT RECEIVED:",
      message
    );

    setDriverStatus("DROWSY");

    setAlertActive(true);

    setAlertMessage(
      message.message ||
        "Driver drowsiness detected — immediate attention required."
    );

    setAlertTime(
      message.timestamp ||
        new Date().toISOString()
    );

    if (message.ear !== undefined) {
      setEar(message.ear);
    }

    if (
      message.closed_duration !==
      undefined
    ) {
      setClosedDuration(
        message.closed_duration
      );
    }

    playBeep();

    return;
  }

  // DETECTION STATUS
  if (
    "type" in message &&
    message.type === "DETECTION_STATUS"
  ) {
    setDriverStatus(message.status);

    if (message.ear !== undefined) {
      setEar(message.ear);
    }

    if (message.status === "NORMAL") {
      setAlertActive(false);
      setAlertMessage("No active alerts.");
      setClosedDuration(null);
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
          {/* DRIVER STATUS */}
          {/* ================================================== */}

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <h3 className="font-semibold">
              Driver Status
            </h3>

            <div
              className={`mt-6 rounded-xl border p-6 text-center ${
                driverStatus === "NORMAL"
                  ? "border-emerald-900 bg-slate-950"
                  : "border-red-900 bg-red-950/20"
              }`}
            >

              {/* STATUS ICON */}

              <div
                className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-4xl ${
                  driverStatus === "DROWSY"
                    ? "bg-red-500/20"
                    : "bg-emerald-500/10"
                }`}
              >

                {driverStatus ===
                "DROWSY"
                  ? "🚨"
                  : "🟢"}

              </div>

              {/* STATUS */}

              <h4
                className={`mt-4 text-2xl font-bold ${
                  driverStatus ===
                  "NORMAL"
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {driverStatus}
              </h4>

              <p className="mt-2 text-sm text-slate-400">

                {driverStatus ===
                "NORMAL"
                  ? "Driver behaviour is normal"
                  : "Drowsiness detected — immediate attention required"}

              </p>

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

                  {ear !== null
                    ? ear.toFixed(3)
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
        {/* SAFETY ALERT */}
        {/* ==================================================== */}

        <section
          className={`mt-6 rounded-2xl border p-6 ${
            alertActive
              ? "border-red-500/50 bg-red-950/40"
              : "border-slate-800 bg-slate-900"
          }`}
        >

          <div className="flex items-start gap-4">

            {/* ALERT ICON */}

            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${
                alertActive
                  ? "bg-red-500/20"
                  : "bg-slate-800"
              }`}
            >

              {alertActive
                ? "🚨"
                : "✓"}

            </div>

            <div className="flex-1">

              <div className="flex items-center justify-between">

                <h3 className="font-semibold">
                  Safety Alerts
                </h3>

                {alertActive && (
                  <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">
                    ACTIVE
                  </span>
                )}

              </div>

              <p
                className={`mt-1 text-sm ${
                  alertActive
                    ? "font-semibold text-red-400"
                    : "text-slate-400"
                }`}
              >
                {alertMessage}
              </p>

              {/* ================================================= */}
              {/* ACTIVE ALERT DETAILS */}
              {/* ================================================= */}

              {alertActive && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">

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
                      {ear !== null
                        ? ear.toFixed(3)
                        : "--"}
                    </p>

                  </div>

                  <div className="rounded-lg bg-slate-900/70 p-3">

                    <p className="text-xs text-slate-500">
                      Eyes Closed
                    </p>

                    <p className="mt-1 font-semibold">

                      {closedDuration !==
                      null
                        ? `${closedDuration.toFixed(
                            2
                          )}s`
                        : "--"}

                    </p>

                  </div>

                </div>
              )}

              {/* ================================================= */}
              {/* ALERT TIME */}
              {/* ================================================= */}

              {alertActive &&
                alertTime && (
                  <p className="mt-3 text-xs text-slate-500">

                    Alert received:{" "}

                    {new Date(
                      alertTime
                    ).toLocaleTimeString()}

                  </p>
                )}

            </div>

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