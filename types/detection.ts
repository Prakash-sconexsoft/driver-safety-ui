export type DriverStatus = "NORMAL" | "DROWSY";

export type DrowsinessStatus = "NORMAL" | "DROWSY";

export type PhoneStatus = "NORMAL" | "PHONE_DETECTED";

export type ConnectionStatus =
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED";

export interface DriverInfo {
  user_id: string;
  username: string;
  camera_id: string;
}

/*
 * Backend registration response
 */
export interface RegisteredMessage {
  type: "REGISTERED";
  user_id: string;
  username: string;
  camera_id: string;
  status: string;
}

/*
 * Backend drowsiness alert
 *
 * Actual backend:
 *
 * {
 *   type: "DROWSINESS_ALERT",
 *   state: "drowsy",
 *   user_name: "admin",
 *   camera_id: "camera_001",
 *   timestamp: "2026-09-11T09:22:54.752+00:00",
 *   label: "Drowsy",
 *   confidence: 0.8652,
 *   peak_confidence: 0.9999,
 *   ear: null,
 *   perclos: null
 * }
 */
export interface DrowsinessAlertMessage {
  type: "DROWSINESS_ALERT";
  state: "drowsy";
  user_name: string;
  camera_id: string;
  user_id?: string;
  timestamp?: string;
  label?: string;
  confidence?: number;
  peak_confidence?: number;
  ear?: number | null;
  perclos?: number | null;
  closed_duration?: number | null;
  message?: string;
}

/*
 * Backend drowsiness cleared
 *
 * Sent once the driver is no longer drowsy. This is the ONLY
 * message that should clear a latched drowsiness alert.
 */
export interface DrowsinessClearedMessage {
  type: "DROWSINESS_CLEARED";
  state: "normal";
  user_name: string;
  camera_id: string;
  user_id?: string;
  timestamp?: string;
  label?: string;
  confidence?: number;
  peak_confidence?: number;
  ear?: number | null;
  perclos?: number | null;
  closed_duration?: number | null;
  message?: string;
}

/*
 * Backend phone-usage alert
 *
 * Actual backend:
 *
 * {
 *   type: "PHONE_ALERT",
 *   state: "phone_detected",
 *   user_name: "python_ai",
 *   camera_id: "camera_user_400",
 *   timestamp: "...",
 *   label: "phone",
 *   model: "YOLO_DIRECT",
 *   confidence: 0.789,
 *   peak_confidence: 0.789
 * }
 */
export interface PhoneAlertMessage {
  type: "PHONE_ALERT";
  state: "phone_detected";
  user_name: string;
  camera_id: string;
  user_id?: string;
  timestamp?: string;
  label?: string;
  model?: string;
  confidence?: number;
  peak_confidence?: number;
  message?: string;
}

/*
 * Backend phone-usage cleared
 *
 * This is the ONLY message that should clear a latched phone alert.
 */
export interface PhoneClearedMessage {
  type: "PHONE_CLEARED";
  state: "normal";
  user_name: string;
  camera_id: string;
  user_id?: string;
  timestamp?: string;
  label?: string;
  confidence?: number;
  peak_confidence?: number;
  message?: string;
}

/*
 * Domain-specific detection status.
 *
 * Actual backend:
 *
 * {
 *   type: "DETECTION_STATUS",
 *   domain: "drowsiness" | "phone",
 *   state: "normal" | "drowsy" | "phone_detected",
 *   user_name: "Driver A",
 *   camera_id: "camera_user_003"
 * }
 *
 * IMPORTANT: `domain` tells you which detection pipeline this
 * status belongs to. `state` alone is NOT enough to route the
 * message — "normal" can mean either domain.
 */
export interface DetectionStatusMessage {
  type: "DETECTION_STATUS";
  domain: "drowsiness" | "phone";
  state: "normal" | "drowsy" | "phone_detected";
  user_name: string;
  camera_id: string;
  user_id?: string;
  timestamp?: string;
  ear?: number | null;
}

/*
 * Backend error
 */
export interface ErrorMessage {
  type: "ERROR";
  message: string;
}

/*
 * All messages coming from FastAPI
 */
export type BackendMessage =
  | RegisteredMessage
  | DrowsinessAlertMessage
  | DrowsinessClearedMessage
  | PhoneAlertMessage
  | PhoneClearedMessage
  | DetectionStatusMessage
  | ErrorMessage;
