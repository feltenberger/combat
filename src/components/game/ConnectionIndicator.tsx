import React from 'react';
import { ConnectionState, TransportType } from '../../network/NetworkTransport';

export interface ConnectionIndicatorProps {
  state: ConnectionState;
  transportType: TransportType;
}

/**
 * Small badge showing the current connection mode (P2P or Relay).
 * Displays in the corner of the game screen.
 */
export function ConnectionIndicator({ state, transportType }: ConnectionIndicatorProps) {
  if (state === 'connecting') {
    return (
      <div className="connection-indicator connecting">
        Connecting...
      </div>
    );
  }

  if (state === 'failed' || state === 'disconnected') {
    return (
      <div className="connection-indicator disconnected">
        Disconnected
      </div>
    );
  }

  return (
    <div className={`connection-indicator ${transportType}`}>
      {transportType === 'p2p' ? 'P2P' : 'Relay'}
    </div>
  );
}
