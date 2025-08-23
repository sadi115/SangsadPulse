
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Website, WebsiteFormData, StatusHistory } from '@/lib/types';
import { checkStatus, getAIDiagnosis, getTtfb } from '@/lib/actions';
import { getWebsites, addWebsite as addWebsiteFS, updateWebsite, deleteWebsiteFS, seedInitialData } from '@/lib/firestore';

const initialWebsites: Omit<Website, 'id' | 'statusHistory' | 'latencyHistory' | 'uptimeData'>[] = [
  { name: 'Parliament Website', url: 'https://www.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, isPaused: false, displayOrder: 0 },
  { name: 'PRP Parliament', url: 'https://prp.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, isPaused: false, displayOrder: 1 },
  { name: 'QAMS Parliament', url: 'https://qams.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, isPaused: false, displayOrder: 2 },
  { name: 'CMIS Parliament', url: 'https://cmis.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, isPaused: false, displayOrder: 3 },
  { name: 'Debate Parliament', url: 'https://debate.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, isPaused: false, displayOrder: 4 },
  { name: 'DRM Parliament', url: 'https://drm.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, isPaused: false, displayOrder: 5 },
  { name: 'eBilling Parliament', url: 'https://ebilling.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, isPaused: false, displayOrder: 6 },
  { name: 'Sitting Parliament', url: 'https://sitting.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, isPaused: false, displayOrder: 7 },
  { name: 'eBook Parliament', url: 'https://ebook.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, isPaused: false, displayOrder: 8 },
  { name: 'Broadcast Parliament', url: 'https://broadcast.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, isPaused: false, displayOrder: 9 },
  { name: 'Library Parliament', url: 'https://library.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, isPaused: false, displayOrder: 10 },
  { name: 'Google', url: 'https://www.google.com', status: 'Idle', monitorType: 'HTTP(s)', port: 443, isPaused: false, displayOrder: 11 },
  { name: 'Google DNS', url: '8.8.8.8', status: 'Idle', monitorType: 'DNS Records', isPaused: false, displayOrder: 12 },
  { name: 'Cloudflare DNS', url: '1.1.1.1', status: 'Idle', monitorType: 'DNS Records', isPaused: false, displayOrder: 13 },
];

const MAX_LATENCY_HISTORY = 50;
const MAX_STATUS_HISTORY = 100;

export function useWebsiteMonitoring() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [pollingInterval, setPollingInterval] = useState(30);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { toast } = useToast();
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const [isLoading, setIsLoading] = useState(true);

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
    
    setWebsites(currentWebsites => 
        currentWebsites.map(s => s.id === siteId ? { ...s, status: 'Checking' } : s)
    );
    
    // Get the latest version of the site from the state
    const siteToCheck = (await getWebsites()).find(s => s.id === siteId);
    if (!siteToCheck || siteToCheck.isPaused || siteToCheck.monitorType === 'Downtime') {
        setWebsites(currentWebsites => 
            currentWebsites.map(s => s.id === siteId ? { ...s } : s)
        );
        return;
    }
    
    try {
        const result = await checkStatus(siteToCheck);
        let ttfbResult;
        if (result.status === 'Up' && (siteToCheck.monitorType === 'HTTP(s)' || siteToCheck.monitorType === 'HTTP(s) - Keyword')) {
            ttfbResult = await getTtfb({ url: siteToCheck.url });
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

        const currentSiteState = (await getWebsites()).find(s => s.id === siteToCheck.id);
        if (!currentSiteState) return;


        const newLatencyHistory = [...(currentSiteState.latencyHistory || []), { time: new Date().toISOString(), latency: result.latency ?? 0 }].slice(-MAX_LATENCY_HISTORY);
      
        let newStatusHistory = [...(currentSiteState.statusHistory || [])];
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

        if (result.status === 'Down' && currentSiteState.status !== 'Down') {
            showNotification(currentSiteState);
        }

        const updatedSiteFields: Partial<Website> = {
          ...result,
          ttfb: ttfbResult?.ttfb,
          latencyHistory: newLatencyHistory,
          statusHistory: newStatusHistory,
          averageLatency,
          lowestLatency,
          highestLatency,
          uptimeData: calculateUptime(newStatusHistory),
          lastDownTime: result.status === 'Down' && currentSiteState.status !== 'Down' ? new Date().toISOString() : currentSiteState.lastDownTime,
        };

        await updateWebsite(siteToCheck.id, updatedSiteFields);
        setWebsites(currentWebsites => 
            currentWebsites.map(s => s.id === siteToCheck.id ? { ...s, ...updatedSiteFields } : s)
        );

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        const updatedSite = { status: 'Down' as const, httpResponse: `Poll failed: ${errorMessage}` };
        await updateWebsite(siteToCheck.id, updatedSite);
        setWebsites(currentWebsites => 
            currentWebsites.map(s => s.id === siteToCheck.id ? { ...s, ...updatedSite } : s)
        );
    }
  }, [showNotification, toast]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        let sitesFromDB = await getWebsites();
        if (sitesFromDB.length === 0) {
            await seedInitialData(initialWebsites);
            sitesFromDB = await getWebsites();
        }
        setWebsites(sitesFromDB);
      } catch (error) {
        console.error("Could not load data from Firestore", error);
        toast({ title: 'Error', description: 'Could not load monitoring data from the database.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [toast]);
  

  useEffect(() => {
    if (isLoading) {
      return;
    }

    Object.values(timeoutsRef.current).forEach(clearTimeout);
    timeoutsRef.current = {};

    websites.forEach(site => {
      if (site.isPaused) return;

      const pollAndReschedule = () => {
        pollWebsite(site.id);
        const interval = (site.pollingInterval || pollingInterval) * 1000;
        timeoutsRef.current[site.id] = setTimeout(pollAndReschedule, interval);
      };
      
      // Stagger initial checks
      const initialDelay = Math.random() * 5000; 
      timeoutsRef.current[site.id] = setTimeout(pollAndReschedule, initialDelay); 
    });
    
    return () => {
      Object.values(timeoutsRef.current).forEach(clearTimeout);
    };
  }, [isLoading, websites, pollingInterval, pollWebsite]); 

  const handleNotificationToggle = useCallback((enabled: boolean) => {
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
  }, [toast]);

  const addWebsite = useCallback(async (data: WebsiteFormData) => {
    const currentWebsites = await getWebsites();
    if (currentWebsites.some(site => site.url === data.url && site.port === data.port)) {
        toast({ title: 'Duplicate Service', description: 'This service is already being monitored.', variant: 'destructive' });
        return;
    }
    const newId = `${Date.now()}`;
    const newWebsite: Website = {
        id: newId,
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
        displayOrder: currentWebsites.length > 0 ? Math.max(...currentWebsites.map(w => w.displayOrder || 0)) + 1 : 0,
    };
    
    await addWebsiteFS(newWebsite);
    setWebsites(current => [...current, newWebsite]);
  }, [toast]);
  
  const editWebsite = useCallback(async (id: string, data: WebsiteFormData) => {
      const siteToEdit = (await getWebsites()).find(s => s.id === id);
      if (!siteToEdit) return;

      const wasPaused = siteToEdit.isPaused;
      const updatedData = {
          ...data,
          status: wasPaused ? 'Paused' as const : 'Idle' as const,
          lastChecked: undefined,
      };
      
      await updateWebsite(id, updatedData);
      setWebsites(currentWebsites => 
          currentWebsites.map(s => s.id === id ? { ...s, ...updatedData } : s)
      );
  }, []);

  const deleteWebsite = useCallback(async (id: string) => {
    if (timeoutsRef.current[id]) {
      clearTimeout(timeoutsRef.current[id]);
      delete timeoutsRef.current[id];
    }
    await deleteWebsiteFS(id);
    setWebsites(currentWebsites => currentWebsites.filter(s => s.id !== id));
  }, []);

  const moveWebsite = useCallback(async (id: string, direction: 'up' | 'down') => {
      const currentSites = await getWebsites();
      const sites = [...currentSites].sort((a,b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      const index = sites.findIndex(site => site.id === id);

      if (index === -1) return;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;

      if (newIndex < 0 || newIndex >= sites.length) return;

      const [movedItem] = sites.splice(index, 1);
      sites.splice(newIndex, 0, movedItem);

      const updatedSites = sites.map((site, idx) => ({ ...site, displayOrder: idx }));
      
      const updates = updatedSites.map(site => updateWebsite(site.id, { displayOrder: site.displayOrder }));
      await Promise.all(updates);

      setWebsites(updatedSites);
  }, []);
  
  const togglePause = useCallback(async (id: string) => {
    const site = (await getWebsites()).find(s => s.id === id);
    if (!site) return;

    const isNowPaused = !site.isPaused;
    const newStatus = isNowPaused ? 'Paused' as const : 'Idle' as const;

    if (isNowPaused && timeoutsRef.current[id]) {
      clearTimeout(timeoutsRef.current[id]);
      delete timeoutsRef.current[id];
    }

    await updateWebsite(id, { isPaused: isNowPaused, status: newStatus });
    setWebsites(currentWebsites =>
      currentWebsites.map(s => (s.id === id ? { ...s, isPaused: isNowPaused, status: newStatus } : s))
    );
  }, []);
  
  const manualCheck = useCallback((id: string) => {
    const site = websites.find(s => s.id === id);
    if (site) {
        if (timeoutsRef.current[id]) {
            clearTimeout(timeoutsRef.current[id]);
        }
        toast({ title: 'Manual Check', description: `Requesting a manual status check for ${site.name}.` });
        
        // Immediately start a poll and then reschedule it
        pollWebsite(site.id).then(() => {
            if (!site.isPaused) {
                const interval = (site.pollingInterval || pollingInterval) * 1000;
                timeoutsRef.current[id] = setTimeout(() => pollWebsite(site.id), interval);
            }
        });
    }
  }, [websites, pollWebsite, toast, pollingInterval]);
  
  const diagnose = useCallback(async (id: string) => {
    const website = (await getWebsites()).find(s => s.id === id);
    if (!website || !website.httpResponse) return;

    setWebsites(current => current.map(s => s.id === id ? { ...s, diagnosis: 'AI is analyzing...' } : s));

    try {
        const { diagnosis } = await getAIDiagnosis({ url: website.url, httpResponse: website.httpResponse });
        await updateWebsite(id, { diagnosis });
        setWebsites(prevWebsites => 
            prevWebsites.map(s => s.id === id ? { ...s, diagnosis } : s)
        );
    } catch (error) {
        toast({ title: 'Diagnosis Failed', description: 'Could not get AI analysis.', variant: 'destructive' });
        setWebsites(current => current.map(s => s.id === id ? { ...s, diagnosis: 'AI analysis failed.' } : s));
    }
  }, [toast]);

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
    diagnose,
    notificationsEnabled,
    handleNotificationToggle
  };
}
