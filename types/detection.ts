export type DriverStatus =
  | "NORMAL"
  | "DROWSY";

export type ConnectionStatus =
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED";

export interface RegisteredMessage {
  type: "REGISTERED";
  user_id: string;
  username: string;
  camera_id: string;
  status: string;
}

export interface DetectionStatusMessage {
  type: "DETECTION_STATUS";
  status: DriverStatus;
  ear?: number;
  timestamp?: string;
}

export interface DrowsinessAlertMessage {
  type: "DROWSINESS_ALERT";
  status: "DROWSY";
  ear?: number;
  closed_duration?: number;
  message?: string;
  timestamp?: string;
}

export interface ErrorMessage {
  type: "ERROR";
  message: string;
}

export type BackendMessage =
  | RegisteredMessage
  | DetectionStatusMessage
  | DrowsinessAlertMessage
  | ErrorMessage;