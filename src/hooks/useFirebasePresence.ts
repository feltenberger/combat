import { useEffect, useState, useRef } from 'react';
import { setupPresence, listenToPresence } from '../firebase/presence';
import { PresenceData } from '../types/firebase';
import { TankColor } from '../config/constants';

export function useFirebasePresence(uid: string | null, name: string, color: TankColor = 'blue') {
  const [players, setPlayers] = useState<Record<string, PresenceData>>({});
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!uid || !name) return;

    // Set up own presence
    cleanupRef.current = setupPresence(uid, name, color);

    // Listen to all presence
    const unsubPresence = listenToPresence((data) => {
      setPlayers(data);
    });

    return () => {
      cleanupRef.current?.();
      unsubPresence();
    };
  }, [uid, name, color]);

  const onlinePlayers = Object.entries(players)
    .filter(([id, p]) => p.online && id !== uid)
    .map(([id, p]) => ({ uid: id, name: p.name, color: p.color || 'blue' as TankColor }));

  return { players, onlinePlayers };
}
