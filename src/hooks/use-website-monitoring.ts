
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Website, WebsiteFormData, StatusHistory } from '@/lib/types';
import { checkStatus, getTtfb } from '@/lib/actions';

const initialWebsites: Website[] = [
  { id: '1', name: 'Parliament Website', url: 'https://www.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, isPaused: false, displayOrder: 0, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '2', name: 'PRP Parliament', url: 'https://prp.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, isPaused: false, displayOrder: 1, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '3', name: 'QAMS Parliament', url: 'https://qams.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, isPaused: false, displayOrder: 2, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '4', name: 'CMIS Parliament', url: 'https://cmis.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, isPaused: false, displayOrder: 3, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '5', name: 'Debate Parliament', url: 'https://debate.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, isPaused: false, displayOrder: 4, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '6', name: 'DRM Parliament', url: 'https://drm.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, isPaused: false, displayOrder: 5, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '7', name: 'eBilling Parliament', url: 'https://ebilling.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, isPaused: false, displayOrder: 6, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '8', name: 'Sitting Parliament', url: 'https://sitting.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, isPaused: false, displayOrder: 7, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '9', name: 'eBook Parliament', url: 'https://ebook.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, isPaused: false, displayOrder: 8, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '10', name: 'Broadcast Parliament', url: 'https://broadcast.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, isPaused: false, displayOrder: 9, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '11', name: 'Library Parliament', url: 'https://library.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, isPaused: false, displayOrder: 10, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '12', name: 'Google', url: 'https://www.google.com', status: 'Idle', monitorType: 'HTTP(s)', port: 443, isPaused: false, displayOrder: 11, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '13', name: 'Google DNS', url: '8.8.8.8', status: 'Idle', monitorType: 'DNS Records', isPaused: false, displayOrder: 12, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '14', name: 'Cloudflare DNS', url: '1.1.1.1', status: 'Idle', monitorType: 'DNS Records', isPaused: false, displayOrder: 13, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
];

const MAX_LATENCY_HISTORY = 50;
const MAX_STATUS_HISTORY = 100;

export function useWebsiteMonitoring() {
  const [websites, setWebsites] = useState<Website[]>(initialWebsites);
  const [isLoading, setIsLoading] = useState(true);
  const [pollingInterval, setPollingInterval] = useState(30);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { toast } = useToast();

  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const notificationsEnabledRef = useRef(notificationsEnabled);
  
  useEffect(() => {
    notificationsEnabledRef.current = notificationsEnabled;
  }, [notificationsEnabled]);

  const scheduleCheck = useCallback((site: Website) => {
    if (timeoutsRef.current.has(site.id)) {
      clearTimeout(timeoutsRef.current.get(site.id));
      timeoutsRef.current.delete(site.id);
    }
    
    if (site.isPaused || site.monitorType === 'Downtime') {
      return;
    }

    const interval = (site.pollingInterval ?? pollingInterval) * 1000;

    const timerId = setTimeout(() => {
      manualCheck(site.id);
    }, interval);

    timeoutsRef.current.set(site.id, timerId);
  }, [pollingInterval]);


  const updateWebsiteState = useCallback((id: string, result: Partial<Website>) => {
    setWebsites(current => {
      const siteToUpdate = current.find(s => s.id === id);
      if (!siteToUpdate) return current;
      
      const newLatencyHistory = result.latency !== undefined 
          ? [...(siteToUpdate.latencyHistory || []), { time: new Date().toISOString(), latency: result.latency }].slice(-MAX_LATENCY_HISTORY)
          : siteToUpdate.latencyHistory;
      
      let newStatusHistory = [...(siteToUpdate.statusHistory || [])];
      const lastStatus = newStatusHistory.length > 0 ? newStatusHistory[newStatusHistory.length - 1].status : null;
      
      if (result.status && result.status !== 'Checking' && result.status !== 'Idle' && result.status !== lastStatus) {
          newStatusHistory.push({
              time: new Date().toISOString(),
              status: result.status === 'Up' ? 'Up' : 'Down',
              latency: result.latency ?? 0,
              reason: result.httpResponse ?? '',
          });
          newStatusHistory = newStatusHistory.slice(-MAX_STATUS_HISTORY);
      }

      const calculateUptime = (history: StatusHistory[]) => {
          if (!history || history.length === 0) return { '1h': null, '24h': null, '30d': null, 'total': null };
          const now = new Date();
          const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
          const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          
          const calculatePercentage = (data: StatusHistory[]) => {
              if (data.length === 0) return null;
              const upCount = data.filter(h => h.status === 'Up').length;
              return (upCount / data.length) * 100;
          };
  
          return {
              '1h': calculatePercentage(history.filter(h => new Date(h.time) >= oneHourAgo)),
              '24h': calculatePercentage(history.filter(h => new Date(h.time) >= twentyFourHoursAgo)),
              '30d': calculatePercentage(history.filter(h => new Date(h.time) >= thirtyDaysAgo)),
              'total': calculatePercentage(history),
          };
      };

      const upHistory = (newLatencyHistory || []).filter(h => h.latency > 0);
      const averageLatency = upHistory.length > 0 ? Math.round(upHistory.reduce((acc, curr) => acc + curr.latency, 0) / upHistory.length) : undefined;
      const lowestLatency = upHistory.length > 0 ? Math.min(...upHistory.map(h => h.latency)) : undefined;
      const highestLatency = upHistory.length > 0 ? Math.max(...upHistory.map(h => h.latency)) : undefined;
      
      if (result.status === 'Down' && siteToUpdate.status !== 'Down' && notificationsEnabledRef.current) {
         setTimeout(() => {
            toast({
              title: 'Service Down',
              description: `${siteToUpdate.name} is currently down.`,
              variant: 'destructive',
            });
         }, 0);
      }

      const updatedSite: Website = {
          ...siteToUpdate,
          ...result,
          latencyHistory: newLatencyHistory,
          statusHistory: newStatusHistory,
          averageLatency,
          lowestLatency,
          highestLatency,
          uptimeData: calculateUptime(newStatusHistory),
          lastDownTime: result.status === 'Down' && siteToUpdate.status !== 'Down' ? new Date().toISOString() : siteToUpdate.lastDownTime,
      };

      scheduleCheck(updatedSite);
      return current.map(s => s.id === id ? updatedSite : s);
    });
  }, [scheduleCheck, toast]);

  const manualCheck = useCallback(async (id: string) => {
    let siteToCheck: Website | undefined;
    setWebsites(current => {
      siteToCheck = current.find(s => s.id === id);
      if (!siteToCheck || siteToCheck.isPaused || siteToCheck.monitorType === 'Downtime') {
        return current;
      }
      
      if (timeoutsRef.current.has(id)) {
        clearTimeout(timeoutsRef.current.get(id));
      }
      return current.map(s => s.id === id ? { ...s, status: 'Checking' } : s);
    });
  
    if (siteToCheck) {
      try {
        const result = await checkStatus(siteToCheck);
        let ttfbResult;
        if (result.status === 'Up' && (siteToCheck.monitorType === 'HTTP(s)' || siteToCheck.monitorType === 'HTTP(s) - Keyword')) {
          ttfbResult = await getTtfb({ url: siteToCheck.url });
        }
        updateWebsiteState(id, { ...result, ttfb: ttfbResult?.ttfb });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        updateWebsiteState(id, { status: 'Down', httpResponse: `Check failed: ${errorMessage}` });
      }
    }
  }, [updateWebsiteState]);


  useEffect(() => {
    setIsLoading(false);
    websites.forEach(site => {
      if (!site.isPaused && site.monitorType !== 'Downtime') {
        const initialDelay = Math.random() * 2000;
        setTimeout(() => manualCheck(site.id), initialDelay);
      }
    });
    
    return () => {
      timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addWebsite = (data: WebsiteFormData) => {
    let newWebsite: Website | null = null;
    setWebsites(currentWebsites => {
        if (currentWebsites.some(site => site.url === data.url && site.port === data.port)) {
            toast({ title: 'Duplicate Service', description: 'This service is already being monitored.', variant: 'destructive' });
            return currentWebsites;
        }
        newWebsite = {
            ...data,
            id: `${Date.now()}`,
            status: 'Idle',
            isPaused: false,
            latencyHistory: [],
            statusHistory: [],
            uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null },
            displayOrder: currentWebsites.length > 0 ? Math.max(...currentWebsites.map(w => w.displayOrder || 0)) + 1 : 0,
        };
        
        return [...currentWebsites, newWebsite];
    });

    if (newWebsite) {
      const id = newWebsite.id;
      setTimeout(() => manualCheck(id), 0);
    }
  };
  
  const editWebsite = (id: string, data: WebsiteFormData) => {
    setWebsites(currentWebsites => {
        const siteIndex = currentWebsites.findIndex(s => s.id === id);
        if (siteIndex === -1) return currentWebsites;
        
        const updatedSite: Website = {
            ...currentWebsites[siteIndex],
            ...data,
        };
        
        const newWebsites = [...currentWebsites];
        newWebsites[siteIndex] = updatedSite;
        return newWebsites;
    });
     setTimeout(() => manualCheck(id), 0);
  };

  const deleteWebsite = (id: string) => {
    if (timeoutsRef.current.has(id)) {
        clearTimeout(timeoutsRef.current.get(id));
        timeoutsRef.current.delete(id);
    }
    setWebsites(currentWebsites => currentWebsites.filter(s => s.id !== id));
  };

  const moveWebsite = (id: string, direction: 'up' | 'down') => {
      setWebsites(currentSites => {
          const sites = [...currentSites].sort((a,b) => (a.displayOrder || 0) - (b.displayOrder || 0));
          const index = sites.findIndex(site => site.id === id);

          if (index === -1) return currentSites;
          
          const newIndex = direction === 'up' ? index - 1 : index + 1;

          if (newIndex < 0 || newIndex >= sites.length) return currentSites;

          const [movedItem] = sites.splice(index, 1);
          sites.splice(newIndex, 0, movedItem);

          return sites.map((site, idx) => ({ ...site, displayOrder: idx }));
      });
  };
  
  const togglePause = (id: string) => {
    let shouldCheck = false;
    setWebsites(current => {
        const newWebsites = current.map(s => {
            if (s.id === id) {
                const isNowPaused = !s.isPaused;
                if (!isNowPaused) {
                    shouldCheck = true;
                }
                const updatedSite = { ...s, isPaused: isNowPaused, status: isNowPaused ? 'Paused' as const : 'Idle' as const };
                
                if (isNowPaused) {
                    if (timeoutsRef.current.has(id)) {
                        clearTimeout(timeoutsRef.current.get(id));
                        timeoutsRef.current.delete(id);
                    }
                }

                return updatedSite;
            }
            return s;
        });
        return newWebsites;
    });

     if (shouldCheck) {
        setTimeout(() => manualCheck(id), 0);
    }
  };

  const handleNotificationToggle = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    if (enabled && 'Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          toast({ title: "Notifications Enabled", description: "You will now receive desktop notifications." });
        } else {
          toast({ title: "Notifications Blocked", description: "Enable notifications in browser settings.", variant: 'destructive' });
          setNotificationsEnabled(false);
        }
      });
    }
  };

  return {
    websites,
    isLoading,
    pollingInterval,
    setPollingInterval,
    addWebsite,
    editWebsite,
    deleteWebsite,
    moveWebsite,
    togglePause,
    manualCheck,
    notificationsEnabled,
    handleNotificationToggle
  };
}

    