

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Website, WebsiteFormData, StatusHistory, MonitorLocation, HttpClient } from '@/lib/types';
import { checkStatus, getTtfb, getHistoryForWebsite, clearHistoryForWebsite } from '@/lib/actions';

const initialWebsites: Website[] = [
  { id: '1', name: 'Parliament Website', url: 'https://www.parliament.gov.bd', status: 'Idle', monitorType: 'HTTP(s)', isPaused: false, displayOrder: 0, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '2', name: 'PRP Parliament', url: 'https://prp.parliament.gov.bd', status: 'Idle', monitorType: 'HTTP(s)', isPaused: false, displayOrder: 1, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '3', name: 'QAMS Parliament', url: 'https://qams.parliament.gov.bd', status: 'Idle', monitorType: 'HTTP(s)', isPaused: false, displayOrder: 2, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '4', name: 'CMIS Parliament', url: 'https://cmis.parliament.gov.bd', status: 'Idle', monitorType: 'HTTP(s)', isPaused: false, displayOrder: 3, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '5', name: 'Debate Parliament', url: 'https://debate.parliament.gov.bd', status: 'Idle', monitorType: 'HTTP(s)', isPaused: true, displayOrder: 4, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '6', name: 'DRM Parliament', url: 'https://drm.parliament.gov.bd', status: 'Idle', monitorType: 'HTTP(s)', isPaused: true, displayOrder: 5, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '7', name: 'eBilling Parliament', url: 'https://ebilling.parliament.gov.bd', status: 'Idle', monitorType: 'HTTP(s)', isPaused: false, displayOrder: 6, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '8', name: 'Sitting Parliament', url: 'https://sitting.parliament.gov.bd', status: 'Idle', monitorType: 'HTTP(s)', isPaused: true, displayOrder: 7, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '9', name: 'eBook Parliament', url: 'https://ebook.parliament.gov.bd', status: 'Idle', monitorType: 'HTTP(s)', isPaused: true, displayOrder: 8, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '10', name: 'Broadcast Parliament', url: 'https://broadcast.parliament.gov.bd', status: 'Idle', monitorType: 'HTTP(s)', isPaused: false, displayOrder: 9, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '11', name: 'Library Parliament', url: 'https://library.parliament.gov.bd', status: 'Idle', monitorType: 'HTTP(s)', isPaused: false, displayOrder: 10, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '12', name: 'Google', url: 'https://www.google.com', status: 'Idle', monitorType: 'HTTP(s)', isPaused: false, displayOrder: 11, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '13', name: 'Google DNS', url: '8.8.8.8', status: 'Idle', monitorType: 'DNS Records', isPaused: false, displayOrder: 12, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
  { id: '14', name: 'Cloudflare DNS', url: '1.1.1.1', status: 'Idle', monitorType: 'DNS Records', isPaused: false, displayOrder: 13, uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null } },
];

const MAX_LATENCY_HISTORY_UI = 50;

export function useWebsiteMonitoring() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pollingInterval, setPollingInterval] = useState(30);
  const [monitorLocation, setMonitorLocation] = useState<MonitorLocation>('server');
  const [httpClient, setHttpClient] = useState<HttpClient>('axios');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { toast } = useToast();

  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  const websitesRef = useRef(websites);
  useEffect(() => { websitesRef.current = websites; }, [websites]);
  
  const pollingIntervalRef = useRef(pollingInterval);
  useEffect(() => { pollingIntervalRef.current = pollingInterval; }, [pollingInterval]);

  const httpClientRef = useRef(httpClient);
  useEffect(() => { httpClientRef.current = httpClient; }, [httpClient]);

  const monitorLocationRef = useRef(monitorLocation);
  useEffect(() => { monitorLocationRef.current = monitorLocation; }, [monitorLocation]);

  const notificationsEnabledRef = useRef(notificationsEnabled);
  useEffect(() => { notificationsEnabledRef.current = notificationsEnabled; }, [notificationsEnabled]);

  const scheduleNextCheck = useCallback((site: Website) => {
      if (timeoutsRef.current.has(site.id)) {
        clearTimeout(timeoutsRef.current.get(site.id)!);
        timeoutsRef.current.delete(site.id);
      }
      
      if (site.isPaused) {
        return;
      }
  
      const interval = (site.pollingInterval ?? pollingIntervalRef.current) * 1000;
  
      const timerId = setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        manualCheck(site.id);
      }, interval);
  
      timeoutsRef.current.set(site.id, timerId);
  }, []);

  const calculateUptime = useCallback((history: StatusHistory[]) => {
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
  }, []);

  const updateWebsiteState = useCallback((id: string, update: Partial<Website>) => {
    setWebsites(current => {
      const siteToUpdate = current.find(s => s.id === id);
      if (!siteToUpdate) return current;

      const newLatencyHistory = update.latencyHistory || siteToUpdate.latencyHistory || [];
      const newStatusHistory = update.statusHistory || siteToUpdate.statusHistory || [];

      const upHistory = newLatencyHistory.filter(h => h.latency > 0);
      const averageLatency = upHistory.length > 0 ? Math.round(upHistory.reduce((acc, curr) => acc + curr.latency, 0) / upHistory.length) : undefined;
      const lowestLatency = upHistory.length > 0 ? Math.min(...upHistory.map(h => h.latency)) : undefined;
      const highestLatency = upHistory.length > 0 ? Math.max(...upHistory.map(h => h.latency)) : undefined;
      
      if (update.status === 'Down' && siteToUpdate.status !== 'Down' && notificationsEnabledRef.current) {
         setTimeout(() => {
            toast({
              title: 'Service Down',
              description: `${siteToUpdate.name} is currently down.`,
              variant: 'destructive',
            });
         }, 0);
      }

      if (update.status === 'Up' && siteToUpdate.status === 'Down' && notificationsEnabledRef.current) {
        setTimeout(() => {
          toast({
            title: 'Service Up',
            description: `${siteToUpdate.name} is back online.`,
          });
        }, 0);
      }

      const updatedSite: Website = {
          ...siteToUpdate,
          ...update,
          latencyHistory: newLatencyHistory,
          statusHistory: newStatusHistory,
          averageLatency,
          lowestLatency,
          highestLatency,
          uptimeData: calculateUptime(newStatusHistory),
          lastDownTime: update.status === 'Down' && siteToUpdate.status !== 'Down' ? new Date().toISOString() : siteToUpdate.lastDownTime,
      };
      
      scheduleNextCheck(updatedSite);

      return current.map(s => s.id === id ? updatedSite : s);
    });
  }, [toast, scheduleNextCheck, calculateUptime]);
  
  const manualCheck = useCallback(async (id: string) => {
    const siteToCheck = websitesRef.current.find(s => s.id === id);
    if (!siteToCheck || siteToCheck.isPaused) {
        if (siteToCheck?.isPaused) {
            const history = await getHistoryForWebsite(id);
            updateWebsiteState(id, { status: 'Paused', httpResponse: 'Monitoring is paused.', ...history });
        }
        return;
    }

    setWebsites(current => current.map(s => s.id === id ? { ...s, status: 'Checking' as const } : s));

    try {
        const result = await checkStatus(siteToCheck, httpClientRef.current, monitorLocationRef.current);
        
        let ttfbResult;
        if (result.status === 'Up' && (siteToCheck.monitorType === 'HTTP(s)' || siteToCheck.monitorType === 'HTTP(s) - Keyword') && result.resolvedUrl) {
            ttfbResult = await getTtfb({ url: result.resolvedUrl });
        }

        const history = await getHistoryForWebsite(id);

        updateWebsiteState(id, { ...result, ttfb: ttfbResult?.ttfb, ...history });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        const history = await getHistoryForWebsite(id);
        updateWebsiteState(id, { status: 'Down', httpResponse: `Check failed: ${errorMessage}`, ...history });
    }
  }, [updateWebsiteState]);

  // Load from local storage and DB on initial mount
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const savedWebsitesConfig = localStorage.getItem('monitoring-websites-config');
        const savedInterval = localStorage.getItem('monitoring-interval');
        const savedNotifications = localStorage.getItem('monitoring-notifications');
        const savedLocation = localStorage.getItem('monitoring-location');
        const savedClient = localStorage.getItem('monitoring-client');
        
        let sites: Website[];
        if (savedWebsitesConfig) {
          sites = JSON.parse(savedWebsitesConfig);
        } else {
          sites = initialWebsites;
          localStorage.setItem('monitoring-websites-config', JSON.stringify(sites.map(({latencyHistory, statusHistory, ...rest}) => rest)));
        }

        const sitesWithHistory = await Promise.all(sites.map(async (site) => {
          const history = await getHistoryForWebsite(site.id);
          const upHistory = (history.latencyHistory || []).filter(h => h.latency > 0);
          const averageLatency = upHistory.length > 0 ? Math.round(upHistory.reduce((acc, curr) => acc + curr.latency, 0) / upHistory.length) : undefined;
          const lowestLatency = upHistory.length > 0 ? Math.min(...upHistory.map(h => h.latency)) : undefined;
          const highestLatency = upHistory.length > 0 ? Math.max(...upHistory.map(h => h.latency)) : undefined;
          
          return {
            ...site,
            ...history,
            uptimeData: calculateUptime(history.statusHistory),
            averageLatency,
            lowestLatency,
            highestLatency
          };
        }));
        
        setWebsites(sitesWithHistory);

        if (savedInterval) setPollingInterval(JSON.parse(savedInterval));
        if (savedNotifications) setNotificationsEnabled(JSON.parse(savedNotifications));
        if (savedLocation) setMonitorLocation(JSON.parse(savedLocation));
        if (savedClient) setHttpClient(JSON.parse(savedClient));

      } catch (error) {
        console.error("Failed to load settings", error);
        setWebsites(initialWebsites);
      }
      setIsLoading(false);
    }

    loadInitialData();
  }, [calculateUptime]);

  // Save config to local storage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      const configToSave = websites.map(({ statusHistory, latencyHistory, uptimeData, ...rest }) => rest);
      localStorage.setItem('monitoring-websites-config', JSON.stringify(configToSave));
    }
  }, [websites, isLoading]);
  
  useEffect(() => {
    if (!isLoading) localStorage.setItem('monitoring-interval', JSON.stringify(pollingInterval));
  }, [pollingInterval, isLoading]);
  
  useEffect(() => {
    if (!isLoading) localStorage.setItem('monitoring-location', JSON.stringify(monitorLocation));
  }, [monitorLocation, isLoading]);
  
  useEffect(() => {
    if (!isLoading) localStorage.setItem('monitoring-client', JSON.stringify(httpClient));
  }, [httpClient, isLoading]);

  useEffect(() => {
    if (!isLoading) localStorage.setItem('monitoring-notifications', JSON.stringify(notificationsEnabled));
  }, [notificationsEnabled, isLoading]);

  // Initial check scheduling effect
  useEffect(() => {
    if (isLoading) return;
    
    // Clear any existing timers before setting new ones
    timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutsRef.current.clear();
    
    websites.forEach((site, index) => {
        if (!site.isPaused) {
            // Stagger initial checks to avoid bursting requests
            const staggerDelay = 100 * (index + 1);
            const timerId = setTimeout(() => manualCheck(site.id), staggerDelay);
            timeoutsRef.current.set(site.id, timerId);
        }
    });
    
    // Cleanup function to clear all timers when the component unmounts or dependencies change
    return () => {
      timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    };
  // This effect should run only when the initial data is loaded.
  // PollingInterval changes are handled by the re-scheduling logic inside scheduleNextCheck.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const addWebsite = (data: WebsiteFormData) => {
     const newWebsite: Website = {
         ...data,
         id: `${Date.now()}`,
         status: 'Idle',
         isPaused: false,
         latencyHistory: [],
         statusHistory: [],
         uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null },
         displayOrder: websites.length > 0 ? Math.max(...websites.map(w => w.displayOrder || 0)) + 1 : 0,
     };
     
     setWebsites(currentWebsites => {
         if (currentWebsites.some(site => site.url === data.url && site.port === data.port)) {
             toast({ title: 'Duplicate Service', description: 'This service is already being monitored.', variant: 'destructive' });
             return currentWebsites;
         }
         const newWebsites = [...currentWebsites, newWebsite];
         setTimeout(() => manualCheck(newWebsite.id), 100);
         return newWebsites;
     });
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
        setTimeout(() => manualCheck(id), 100);
        return newWebsites;
    });
  };

  const deleteWebsite = async (id: string) => {
    if (timeoutsRef.current.has(id)) {
        clearTimeout(timeoutsRef.current.get(id)!);
        timeoutsRef.current.delete(id);
    }
    await clearHistoryForWebsite(id);
    setWebsites(currentWebsites => currentWebsites.filter(s => s.id !== id));
  };
  
  const clearHistory = async (id: string) => {
    await clearHistoryForWebsite(id);
    setWebsites(current => current.map(s => {
      if (s.id === id) {
        return { 
          ...s, 
          latencyHistory: [],
          statusHistory: [],
          uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null },
          averageLatency: undefined,
          lowestLatency: undefined,
          highestLatency: undefined,
          lastDownTime: undefined,
        };
      }
      return s;
    }));
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
    setWebsites(current => {
        return current.map(s => {
            if (s.id === id) {
                const isNowPaused = !s.isPaused;
                const updatedSite = { ...s, isPaused: isNowPaused, status: isNowPaused ? 'Paused' as const : 'Idle' as const };
                
                if (isNowPaused) {
                    if (timeoutsRef.current.has(id)) {
                        clearTimeout(timeoutsRef.current.get(id)!);
                        timeoutsRef.current.delete(id);
                    }
                } else {
                    setTimeout(() => manualCheck(updatedSite.id), 100);
                }
                return updatedSite;
            }
            return s;
        });
    });
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
    monitorLocation,
    setMonitorLocation,
    httpClient,
    setHttpClient,
    addWebsite,
    editWebsite,
    deleteWebsite,
    clearHistory,
    moveWebsite,
    togglePause,
    manualCheck,
    notificationsEnabled,
    handleNotificationToggle
  };
}

    

    