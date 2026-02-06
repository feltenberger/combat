import { PlayerInput, GameState } from '../types/game';
import {
  NetworkTransport,
  ConnectionState,
  TransportType,
  TransportConfig,
} from './NetworkTransport';
import { WebRTCSignaling } from './WebRTCSignaling';
import { STUN_SERVERS, DATA_CHANNEL_LABEL, MESSAGE_TYPE } from './constants';

interface DataChannelMessage {
  type: typeof MESSAGE_TYPE.INPUT | typeof MESSAGE_TYPE.STATE;
  data: PlayerInput | GameState;
}

/**
 * WebRTC DataChannel transport for P2P game data.
 * Provides low-latency direct connection between players.
 */
export class WebRTCTransport implements NetworkTransport {
  private _state: ConnectionState = 'connecting';
  private config: TransportConfig;
  private signaling: WebRTCSignaling;
  private peerConnection: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;
  private stateChangeCallbacks: ((state: ConnectionState, type: TransportType) => void)[] = [];
  private inputCallbacks: ((input: PlayerInput) => void)[] = [];
  private stateCallbacks: ((state: GameState) => void)[] = [];
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private remoteDescriptionSet = false;

  readonly transportType: TransportType = 'p2p';

  constructor(config: TransportConfig) {
    this.config = config;
    this.signaling = new WebRTCSignaling(config.gameId, config.isHost);

    // Create peer connection with STUN servers
    this.peerConnection = new RTCPeerConnection({
      iceServers: STUN_SERVERS,
    });

    this.setupPeerConnection();

    if (config.isHost) {
      this.startAsHost();
    } else {
      this.startAsGuest();
    }
  }

  get state(): ConnectionState {
    return this._state;
  }

  private setState(newState: ConnectionState): void {
    if (this._state !== newState) {
      this._state = newState;
      for (const cb of this.stateChangeCallbacks) {
        cb(newState, this.transportType);
      }
    }
  }

  private setupPeerConnection(): void {
    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.sendIceCandidate(event.candidate.toJSON());
      }
    };

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection.iceConnectionState;
      if (iceState === 'failed' || iceState === 'disconnected') {
        this.setState('failed');
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const connState = this.peerConnection.connectionState;
      if (connState === 'failed') {
        this.setState('failed');
      }
    };

    // Guest receives data channel from host
    this.peerConnection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };

    // Listen for remote ICE candidates
    this.signaling.onIceCandidate((candidate) => {
      this.addIceCandidate(candidate);
    });
  }

  private async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.remoteDescriptionSet) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('Failed to add ICE candidate:', err);
      }
    } else {
      // Queue candidates until remote description is set
      this.pendingIceCandidates.push(candidate);
    }
  }

  private async processPendingCandidates(): Promise<void> {
    for (const candidate of this.pendingIceCandidates) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('Failed to add queued ICE candidate:', err);
      }
    }
    this.pendingIceCandidates = [];
  }

  private async startAsHost(): Promise<void> {
    try {
      // Create data channel (host creates, guest receives)
      const channel = this.peerConnection.createDataChannel(DATA_CHANNEL_LABEL);
      this.setupDataChannel(channel);

      // Create and send offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      await this.signaling.sendOffer(offer);

      // Listen for answer
      this.signaling.onAnswer(async (answer) => {
        try {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          this.remoteDescriptionSet = true;
          await this.processPendingCandidates();
        } catch (err) {
          console.error('Failed to set remote description:', err);
          this.setState('failed');
        }
      });
    } catch (err) {
      console.error('Host WebRTC setup failed:', err);
      this.setState('failed');
    }
  }

  private async startAsGuest(): Promise<void> {
    // Listen for offer from host
    this.signaling.onOffer(async (offer) => {
      try {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        this.remoteDescriptionSet = true;
        await this.processPendingCandidates();

        // Create and send answer
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        await this.signaling.sendAnswer(answer);
      } catch (err) {
        console.error('Guest WebRTC setup failed:', err);
        this.setState('failed');
      }
    });
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel;

    channel.onopen = () => {
      this.setState('connected');
    };

    channel.onclose = () => {
      this.setState('disconnected');
    };

    channel.onerror = (event) => {
      console.error('DataChannel error:', event);
      this.setState('failed');
    };

    channel.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  private handleMessage(data: string): void {
    try {
      const message: DataChannelMessage = JSON.parse(data);

      if (message.type === MESSAGE_TYPE.INPUT) {
        for (const cb of this.inputCallbacks) {
          cb(message.data as PlayerInput);
        }
      } else if (message.type === MESSAGE_TYPE.STATE) {
        for (const cb of this.stateCallbacks) {
          cb(message.data as GameState);
        }
      }
    } catch (err) {
      console.warn('Failed to parse DataChannel message:', err);
    }
  }

  sendInput(input: PlayerInput): void {
    if (this._state !== 'connected' || !this.dataChannel || this.dataChannel.readyState !== 'open') {
      return;
    }

    const message: DataChannelMessage = {
      type: MESSAGE_TYPE.INPUT,
      data: input,
    };
    this.dataChannel.send(JSON.stringify(message));
  }

  sendState(state: GameState): void {
    if (this._state !== 'connected' || !this.dataChannel || this.dataChannel.readyState !== 'open') {
      return;
    }

    const message: DataChannelMessage = {
      type: MESSAGE_TYPE.STATE,
      data: state,
    };
    this.dataChannel.send(JSON.stringify(message));
  }

  onInput(callback: (input: PlayerInput) => void): void {
    this.inputCallbacks.push(callback);
  }

  onState(callback: (state: GameState) => void): void {
    this.stateCallbacks.push(callback);
  }

  onStateChange(callback: (state: ConnectionState, type: TransportType) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  destroy(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    this.peerConnection.close();
    this.signaling.destroy();

    this.inputCallbacks = [];
    this.stateCallbacks = [];
    this.stateChangeCallbacks = [];
    this.pendingIceCandidates = [];

    this.setState('disconnected');
  }
}
