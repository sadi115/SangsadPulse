
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

export function LiveClock() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This effect runs only on the client, after the component has mounted.
    setIsClient(true);
    setCurrentTime(new Date());

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Cleanup interval on component unmount
    return () => {
      clearInterval(timer);
    };
  }, []); // Empty dependency array ensures this runs only once on the client

  if (!isClient || !currentTime) {
    // Render a placeholder on the server and during initial client render
    // to prevent hydration mismatch.
    return (
      <div className="flex flex-col items-start font-medium text-muted-foreground text-xs">
          <span>Loading...</span>
          <span className="font-semibold text-foreground">Loading time...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start font-medium text-muted-foreground text-xs">
        <span>{format(currentTime, 'MMMM do, yyyy')}</span>
        <span className="font-semibold text-foreground">{format(currentTime, 'EEEE, hh:mm:ss a')}</span>
    </div>
  );
}
