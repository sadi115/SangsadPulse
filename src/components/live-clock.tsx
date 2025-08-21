'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

export function LiveClock() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    // Set initial time after mount to avoid hydration mismatch
    setCurrentTime(new Date());

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Cleanup interval on component unmount
    return () => {
      clearInterval(timer);
    };
  }, []); // Empty dependency array ensures this runs only once on the client

  if (!currentTime) {
    // Render a placeholder on the server and during initial client render
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Loading time...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start font-medium text-muted-foreground text-xs">
        <span>{format(currentTime, 'EEEE, MMMM do, yyyy')}</span>
        <span className="font-semibold text-foreground">{format(currentTime, 'h:mm:ss a')}</span>
    </div>
  );
}
