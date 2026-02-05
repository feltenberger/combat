import { ref, set, onDisconnect, onValue, serverTimestamp, off } from 'firebase/database';
import { rtdb } from '../config/firebase';
import { PresenceData } from '../types/firebase';
import { TankColor } from '../config/constants';

export function setupPresence(uid: string, name: string, color: TankColor = 'blue'): () => void {
  const presenceRef = ref(rtdb, `presence/${uid}`);
  const connectedRef = ref(rtdb, '.info/connected');

  const data: PresenceData = {
    name,
    online: true,
    lastSeen: Date.now(),
    color,
  };

  const handleConnected = onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      // Set up onDisconnect first
      onDisconnect(presenceRef).set({
        ...data,
        online: false,
        lastSeen: Date.now(),
      });

      // Then set presence
      set(presenceRef, {
        ...data,
        online: true,
        lastSeen: Date.now(),
      });
    }
  });

  // Cleanup function
  return () => {
    off(connectedRef);
    set(presenceRef, {
      ...data,
      online: false,
      lastSeen: Date.now(),
    });
  };
}

export function listenToPresence(
  callback: (players: Record<string, PresenceData>) => void,
): () => void {
  const presenceRef = ref(rtdb, 'presence');
  const unsub = onValue(presenceRef, (snap) => {
    const data = snap.val() || {};
    callback(data);
  });

  return () => off(presenceRef);
}
