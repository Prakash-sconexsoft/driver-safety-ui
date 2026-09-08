export interface DriverInfo {
  user_id: string;
  username: string;
  camera_id: string;
}

export interface RegisteredMessage {
  type: "REGISTERED";
  user_id: string;
  username: string;
  camera_id: string;
  status: string;
}

export interface DetectionStatusMessage {
  type: "DETECTION_STATUS";
  status: "NORMAL" | "DROWSY";
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

export type BackendMessage =
  | RegisteredMessage
  | DetectionStatusMessage
  | DrowsinessAlertMessage;

export class DriverWebSocket {
  private socket: WebSocket | null = null;

  private readonly url: string;

  constructor(url?: string) {
    this.url =
      url ||
      process.env.NEXT_PUBLIC_BACKEND_WS_URL ||
      "ws://localhost:8000/video";
  }

  connect(
    onOpen?: () => void,
    onMessage?: (message: BackendMessage) => void,
    onClose?: () => void,
    onError?: (error: Event) => void
  ) {
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log("WebSocket connected:", this.url);

      onOpen?.();
    };

    this.socket.onmessage = (event) => {
      try {
        const message: BackendMessage = JSON.parse(event.data);

        console.log("Backend message:", message);

        onMessage?.(message);
      } catch (error) {
        console.error(
          "Failed to parse backend message:",
          error
        );
      }
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);

      onError?.(error);
    };

    this.socket.onclose = () => {
      console.log("WebSocket disconnected");

      onClose?.();
    };
  }

  startStream(driver: DriverInfo) {
  if (!this.socket) {
    console.error("WebSocket is not initialized.");
    return;
  }

  if (this.socket.readyState !== WebSocket.OPEN) {
    console.error("WebSocket is not open.");
    return;
  }

  const startStreamMessage = {
  type: "START_STREAM",
  user_id: driver.user_id,
  user_name: driver.username,
  camera_id: driver.camera_id,
};

  console.log(
    "Sending START_STREAM:",
    startStreamMessage
  );

  this.socket.send(
    JSON.stringify(startStreamMessage)
  );
}

  sendFrame(frame: ArrayBuffer) {
    if (!this.socket) {
      return;
    }

    if (this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(frame);
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  isConnected() {
    return (
      this.socket?.readyState === WebSocket.OPEN
    );
  }
}
