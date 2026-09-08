"use client";

import { useEffect, useRef, useState } from "react";

interface CameraViewProps {
  onCameraReady?: () => void;
  onCameraStopped?: () => void;
  onCameraStarting?: () => void;
  onFrame?: (frame: ArrayBuffer) => void;
}

export default function CameraView({
  onCameraReady,
  onCameraStopped,
  onCameraStarting,
  onFrame,
}: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
const streamRef = useRef<MediaStream | null>(null);
const canvasRef = useRef<HTMLCanvasElement | null>(null);
const frameTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [cameraStatus, setCameraStatus] = useState<
    "idle" | "starting" | "active" | "error"
  >("idle");

  const [errorMessage, setErrorMessage] = useState("");

  const captureFrame = () => {
  const video = videoRef.current;
  const canvas = canvasRef.current;

  if (!video || !canvas) {
    return;
  }

  if (
    video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
    video.videoWidth === 0 ||
    video.videoHeight === 0
  ) {
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.drawImage(
    video,
    0,
    0,
    canvas.width,
    canvas.height
  );

  canvas.toBlob(
    async (blob) => {
      if (!blob) {
        return;
      }

      const frame = await blob.arrayBuffer();

      onFrame?.(frame);
    },
    "image/jpeg",
    0.7
  );
};

  const startCamera = async () => {
    onCameraStarting?.();
    try {
      setCameraStatus("starting");
      setErrorMessage("");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera access is not supported by this browser."
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: {
            ideal: 1280,
          },
          height: {
            ideal: 720,
          },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await videoRef.current.play();
      }

      setCameraStatus("active");

onCameraReady?.();

frameTimerRef.current = setInterval(
  captureFrame,
  100
);
    } catch (error) {
      console.error("Camera error:", error);

      setCameraStatus("error");

      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          setErrorMessage(
            "Camera permission was denied. Please allow camera access."
          );
        } else if (error.name === "NotFoundError") {
          setErrorMessage(
            "No camera was found on this device."
          );
        } else if (error.name === "NotReadableError") {
          setErrorMessage(
            "The camera is already being used by another application."
          );
        } else {
          setErrorMessage(
            "Unable to access the camera."
          );
        }
      } else {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to access the camera."
        );
      }
    }
  };

  const stopCamera = () => {
    if (frameTimerRef.current) {
  clearInterval(frameTimerRef.current);
  frameTimerRef.current = null;
}
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraStatus("idle");

    onCameraStopped?.();
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  return (
    <div className="w-full">
        <canvas
  ref={canvasRef}
  className="hidden"
/>
      {/* Video */}
      <div className="relative aspect-video overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
        />

        {/* Camera status */}
        <div className="absolute left-4 top-4">
          <div className="flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white backdrop-blur">
            <span
              className={`h-2 w-2 rounded-full ${
                cameraStatus === "active"
                  ? "bg-green-500"
                  : cameraStatus === "starting"
                    ? "bg-yellow-500"
                    : cameraStatus === "error"
                      ? "bg-red-500"
                      : "bg-slate-500"
              }`}
            />

            {cameraStatus === "active"
              ? "Camera Live"
              : cameraStatus === "starting"
                ? "Starting Camera..."
                : cameraStatus === "error"
                  ? "Camera Error"
                  : "Camera Offline"}
          </div>
        </div>

        {/* Placeholder */}
        {cameraStatus !== "active" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="px-6 text-center">
              <div className="text-5xl">
                {cameraStatus === "error" ? "⚠️" : "📷"}
              </div>

              <p className="mt-4 text-sm text-slate-400">
                {cameraStatus === "starting"
                  ? "Requesting camera access..."
                  : cameraStatus === "error"
                    ? errorMessage
                    : "Camera is currently offline"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900 px-5 py-4">
        <div>
          <p className="text-sm font-medium text-white">
            Driver Camera
          </p>

          <p className="text-xs text-slate-400">
            Camera video will be processed by the backend.
          </p>
        </div>

        <div>
          {cameraStatus === "active" ? (
            <button
              onClick={stopCamera}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
            >
              Stop Camera
            </button>
          ) : (
            <button
              onClick={startCamera}
              disabled={cameraStatus === "starting"}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cameraStatus === "starting"
                ? "Starting..."
                : "Start Camera"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
