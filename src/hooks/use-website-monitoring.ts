
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Website, WebsiteFormData, StatusHistory } from '@/lib/types';
import { checkStatus, getAIDiagnosis, getTtfb } from '@/lib/actions';

const initialWebsites: Omit<Website, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Parliament Website', url: 'https://www.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false, displayOrder: 0 },
  { name: 'PRP Parliament', url: 'https://prp.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false, displayOrder: 1 },
  { name: 'QAMS Parliament', url: 'https://qams.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false, displayOrder: 2 },
  { name: 'CMIS Parliament', url: 'https://cmis.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false, displayOrder: 3 },
  { name: 'Debate Parliament', url: 'https://debate.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false, displayOrder: 4 },
  { name: 'DRM Parliament', url: 'https://drm.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false, displayOrder: 5 },
  { name: 'eBilling Parliament', url: 'https://ebilling.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false, displayOrder: 6 },
  { name: 'Sitting Parliament', url: 'https://sitting.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false, displayOrder: 7 },
  { name: 'eBook Parliament', url: 'https://ebook.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false, displayOrder: 8 },
  { name: 'Broadcast Parliament', url: 'https://broadcast.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false, displayOrder: 9 },
  { name: 'Library Parliament', url: 'https://library.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false, displayOrder: 10 },
  { name: 'Google', url: 'https://www.google.com', status: 'Idle', monitorType: 'HTTP(s)', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false, displayOrder: 11 },
  { name: 'Google DNS', url: '8.8.8.8', status: 'Idle', monitorType: 'DNS Records', latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false, displayOrder: 12 },
  { name: 'Cloudflare DNS', url: '1.1.1.1', status: 'Idle', monitorType: 'DNS Records', latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false, displayOrder: 13 },
];

const MAX_LATENCY_HISTORY = 50;
const MAX_STATUS_HISTORY = 100;

export function useWebsiteMonitoring() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [pollingInterval, setPollingInterval] = useState(30);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { toast } = useToast();
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Load from localStorage on initial render
  useEffect(() => {
    try {
      const storedWebsites = localStorage.getItem('websites');
      const storedInterval = localStorage.getItem('pollingInterval');
      const storedNotifications = localStorage.getItem('notificationsEnabled');

      if (storedWebsites) {
        setWebsites(JSON.parse(storedWebsites));
      } else {
        // Seed with initial data if nothing is in localStorage
        const sitesWithIds = initialWebsites.map((site, index) => ({
            ...site,
            id: `${Date.now()}-${index}`,
        }));
        setWebsites(sitesWithIds);
      }

      if (storedInterval) {
        setPollingInterval(Number(storedInterval));
      }
       if (storedNotifications !== null) {
        setNotificationsEnabled(JSON.parse(storedNotifications));
      }
    } catch (error) {
      console.error("Could not load data from localStorage", error);
      toast({ title: "Error", description: "Could not load saved data.", variant: "destructive" });
    }
  }, [toast]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      if (websites.length > 0) {
        localStorage.setItem('websites', JSON.stringify(websites));
      }
      localStorage.setItem('pollingInterval', String(pollingInterval));
      localStorage.setItem('notificationsEnabled', JSON.stringify(notificationsEnabled));
    } catch (error) {
       console.error("Could not save data to localStorage", error);
       toast({ title: "Error", description: "Could not save settings.", variant: "destructive" });
    }
  }, [websites, pollingInterval, notificationsEnabled, toast]);
  
  const showNotification = useCallback((site: Website) => {
    if (!notificationsEnabled) return;
    toast({
      title: 'Service Down',
      description: `${site.name} is currently down.`,
      variant: 'destructive',
    });
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      new Notification('Service Alert', {
        body: `${site.name} is currently down.`,
        icon: '/favicon.ico',
      });
    }
  }, [notificationsEnabled, toast]);

  const pollWebsite = useCallback(async (siteId: string) => {
    const siteToCheck = websites.find(s => s.id === siteId);
    if (!siteToCheck || siteToCheck.isPaused || siteToCheck.monitorType === 'Downtime') return;
    
    setWebsites(currentWebsites => 
        currentWebsites.map(s => s.id === siteId ? { ...s, status: 'Checking' } : s)
    );
    
    try {
        const result = await checkStatus(siteToCheck);
        let ttfbResult;
        if (result.status === 'Up' && (siteToCheck.monitorType === 'HTTP(s)' || siteToCheck.monitorType === 'HTTP(s) - Keyword')) {
            ttfbResult = await getTtfb({ url: siteToCheck.url });
        }

        setWebsites(currentWebsites => {
            const siteToUpdate = currentWebsites.find(s => s.id === siteId);
            if (!siteToUpdate) return currentWebsites;

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

            const newLatencyHistory = [...(siteToUpdate.latencyHistory || []), { time: new Date().toISOString(), latency: result.latency ?? 0 }].slice(-MAX_LATENCY_HISTORY);
          
            let newStatusHistory = [...(siteToUpdate.statusHistory || [])];
            const lastStatus = newStatusHistory[newStatusHistory.length - 1]?.status;
            const newStatusEntry: StatusHistory = {
                time: new Date().toISOString(),
                status: result.status === 'Up' ? 'Up' : 'Down',
                latency: result.latency ?? 0,
                reason: result.httpResponse ?? '',
            };

            if (newStatusHistory.length === 0 || newStatusEntry.status !== lastStatus) {
                newStatusHistory.push(newStatusEntry);
            }
            newStatusHistory = newStatusHistory.slice(-MAX_STATUS_HISTORY);

            const upHistory = newLatencyHistory.filter(h => h.latency > 0);
            const averageLatency = upHistory.length > 0 ? Math.round(upHistory.reduce((acc, curr) => acc + curr.latency, 0) / upHistory.length) : undefined;
            const lowestLatency = upHistory.length > 0 ? Math.min(...upHistory.map(h => h.latency)) : undefined;
            const highestLatency = upHistory.length > 0 ? Math.max(...upHistory.map(h => h.latency)) : undefined;

            if (result.status === 'Down' && siteToUpdate.status !== 'Down') {
                showNotification(siteToUpdate);
            }

            const updatedSite: Website = {
                ...siteToUpdate,
                ...result,
                ttfb: ttfbResult?.ttfb,
                latencyHistory: newLatencyHistory,
                statusHistory: newStatusHistory,
                averageLatency,
                lowestLatency,
                highestLatency,
                uptimeData: calculateUptime(newStatusHistory),
                lastDownTime: result.status === 'Down' && siteToUpdate.status !== 'Down' ? new Date().toISOString() : siteToUpdate.lastDownTime,
            };
            
            return currentWebsites.map(s => s.id === siteId ? updatedSite : s);
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        setWebsites(currentWebsites => 
            currentWebsites.map(s => s.id === siteId ? { ...s, status: 'Down', httpResponse: `Poll failed: ${errorMessage}` } : s)
        );
    }
  }, [websites, showNotification]);

  useEffect(() => {
    // Clear all existing timeouts when component unmounts or dependencies change
    const cleanup = () => {
      Object.values(timeoutsRef.current).forEach(clearTimeout);
      timeoutsRef.current = {};
    };

    const pollAndReschedule = async (site: Website) => {
        if (site.isPaused || site.monitorType === 'Downtime') {
          return;
        }
        await pollWebsite(site.id);
        
        const interval = (site.pollingInterval || pollingInterval) * 1000;
        timeoutsRef.current[site.id] = setTimeout(() => pollAndReschedule(site), interval);
    };

    cleanup();
    websites.forEach(site => pollAndReschedule(site));

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websites, pollingInterval]);


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

  const addWebsite = async (data: WebsiteFormData) => {
    if (websites.some(site => site.url === data.url && site.port === data.port)) {
        toast({ title: 'Duplicate Service', description: 'This service is already being monitored.', variant: 'destructive' });
        return;
    }

    const newWebsite: Website = {
        id: `${Date.now()}`,
        name: data.name,
        url: data.url,
        monitorType: data.monitorType,
        port: data.port,
        keyword: data.keyword,
        pollingInterval: data.pollingInterval,
        status: 'Idle',
        isPaused: false,
        latencyHistory: [],
        statusHistory: [],
        uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null },
        displayOrder: websites.length > 0 ? Math.max(...websites.map(w => w.displayOrder || 0)) + 1 : 0,
    };
    
    setWebsites(currentWebsites => [...currentWebsites, newWebsite]);
  };
  
  const editWebsite = async (id: string, data: WebsiteFormData) => {
      setWebsites(currentWebsites => 
          currentWebsites.map(s => {
              if (s.id === id) {
                  return {
                    ...s,
                    ...data,
                    status: 'Idle', // Reset status to trigger a new poll cycle
                    lastChecked: undefined, // Force immediate re-poll
                  };
              }
              return s;
          })
      );
  };

  const deleteWebsite = async (id: string) => {
    if (timeoutsRef.current[id]) {
      clearTimeout(timeoutsRef.current[id]);
      delete timeoutsRef.current[id];
    }
    setWebsites(currentWebsites => currentWebsites.filter(s => s.id !== id));
  };

  const moveWebsite = async (id: string, direction: 'up' | 'down') => {
      setWebsites(currentWebsites => {
          const sites = [...currentWebsites].sort((a,b) => (a.displayOrder || 0) - (b.displayOrder || 0));
          const index = sites.findIndex(site => site.id === id);

          if (index === -1) return sites;
          
          const newIndex = direction === 'up' ? index - 1 : index + 1;

          if (newIndex < 0 || newIndex >= sites.length) return sites;

          const [movedItem] = sites.splice(index, 1);
          sites.splice(newIndex, 0, movedItem);

          // Re-assign displayOrder
          return sites.map((site, idx) => ({ ...site, displayOrder: idx }));
      });
  };
  
  const togglePause = async (id: string) => {
    setWebsites(currentWebsites => 
        currentWebsites.map(s => {
            if (s.id === id) {
                const isNowPaused = !s.isPaused;
                if (isNowPaused) {
                    if (timeoutsRef.current[id]) {
                      clearTimeout(timeoutsRef.current[id]);
                    }
                    return { ...s, isPaused: true, status: 'Paused' };
                } else {
                    return { ...s, isPaused: false, status: 'Idle' };
                }
            }
            return s;
        })
    );
  };
  
  const manualCheck = (id: string) => {
    const website = websites.find(site => site.id === id);
    if (website) {
      if (timeoutsRef.current[id]) {
        clearTimeout(timeoutsRef.current[id]);
      }
      toast({ title: 'Manual Check', description: `Requesting a manual status check for ${website.name}.` });
      
      const pollAndReschedule = async () => {
        await pollWebsite(id);
        const site = websites.find(s => s.id === id);
        if(site) {
            const interval = (site.pollingInterval || pollingInterval) * 1000;
            timeoutsRef.current[id] = setTimeout(() => pollAndReschedule(), interval);
        }
      };
      pollAndReschedule();
    }
  };
  
  const diagnose = async (id: string) => {
    const website = websites.find(site => site.id === id);
    if (!website || !website.httpResponse) return;
    try {
      setWebsites(currentWebsites => 
        currentWebsites.map(s => s.id === id ? { ...s, diagnosis: 'AI is analyzing...' } : s)
      );
      const { diagnosis } = await getAIDiagnosis({ url: website.url, httpResponse: website.httpResponse });
      setWebsites(currentWebsites => 
        currentWebsites.map(s => s.id === id ? { ...s, diagnosis } : s)
      );
    } catch (error) {
       setWebsites(currentWebsites => 
        currentWebsites.map(s => s.id === id ? { ...s, diagnosis: 'AI analysis failed.' } : s)
      );
      toast({ title: 'Diagnosis Failed', description: 'Could not get AI analysis.', variant: 'destructive' });
    }
  };

  return {
    websites,
    pollingInterval,
    setPollingInterval,
    addWebsite,
    editWebsite,
    deleteWebsite,
    moveWebsite,
    togglePause,
    manualCheck,
    diagnose,
    notificationsEnabled,
    handleNotificationToggle
  };
}

    