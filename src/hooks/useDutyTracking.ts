import { useEffect, useRef, useState } from 'react';
import { dutyApi } from '@/api/collections';
import { getPosition } from '@/lib/geo';

/**
 * While on duty and the app is open, send the agent's location every `everySeconds`.
 * Browsers pause this when the app is closed or the screen is off; every collection still saves GPS.
 */
export function useDutyTracking(onDuty: boolean, everySeconds = 120) {
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);
  const [gpsOff, setGpsOff] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    if (!onDuty) return;
    const send = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const gps = await getPosition();
        setGpsOff(!gps);
        if (gps) {
          await dutyApi.ping(gps).catch(() => undefined);
          setLastSentAt(new Date());
        }
      } finally {
        busy.current = false;
      }
    };
    send();
    const id = window.setInterval(send, everySeconds * 1000);
    return () => window.clearInterval(id);
  }, [onDuty, everySeconds]);

  return { lastSentAt, gpsOff };
}
