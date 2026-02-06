/**
 * Free Google STUN servers for NAT traversal.
 * These help peers discover their public IP addresses.
 */
export const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * Timeout for WebRTC connection attempt.
 * If P2P fails within this time, we fall back to Firebase relay.
 * 5 seconds is reasonable for most NAT configurations.
 */
export const WEBRTC_CONNECT_TIMEOUT_MS = 5000;

/**
 * Label for the WebRTC DataChannel used for game data.
 */
export const DATA_CHANNEL_LABEL = 'game-data';

/**
 * Message types for DataChannel protocol.
 */
export const MESSAGE_TYPE = {
  INPUT: 'input',
  STATE: 'state',
} as const;
