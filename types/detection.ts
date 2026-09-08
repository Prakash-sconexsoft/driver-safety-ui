export type DriverStatus = "NORMAL" | "DROWSY";

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
 * Backend normal detection message
 *
 * Actual backend:
 *
 * {
 *   state: "normal",
 *   user_name: "Driver A",
 *   camera_id: "camera_user_001"
 * }
 */
export interface NormalStateMessage {
  state: "normal";
  user_name: string;
  camera_id: string;
  user_id?: string;
  ear?: number;
  timestamp?: string;
}

/*
 * Backend drowsiness alert
 *
 * Actual backend:
 *
 * {
 *   type: "DROWSINESS_ALERT",
 *   state: "drowsy",
 *   user_name: "Driver A",
 *   camera_id: "camera_user_001",
 *   timestamp: "...",
 *   ear: 0.115,
 *   closed_duration: 1.60
 * }
 */
export interface DrowsinessAlertMessage {
  type: "DROWSINESS_ALERT";
  state: "drowsy";
  user_name: string;
  camera_id: string;
  user_id?: string;
  timestamp?: string;
  ear?: number;
  closed_duration?: number;
  message?: string;
}

/*
 * Optional detection-status message
 */
export interface DetectionStatusMessage {
  type: "DETECTION_STATUS";
  status: DriverStatus;
  ear?: number;
  timestamp?: string;
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
  | NormalStateMessage
  | DrowsinessAlertMessage
  | DetectionStatusMessage
  | ErrorMessage;