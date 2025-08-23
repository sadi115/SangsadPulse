
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Website, WebsiteFormData, StatusHistory } from '@/lib/types';
import { checkStatus, getAIDiagnosis, getTtfb } from '@/lib/actions';

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

type NotificationInfo = {
  title: string;
  description: string;
  variant: 'destructive';
};


export function useWebsiteMonitoring() {
  const [websites, setWebsites] = useState<Website[]>(initialWebsites);
  const [isLoading, setIsLoading] = useState(false); 
  const [pollingInterval, setPollingInterval] = useState(30);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationQueue, setNotificationQueue] = useState<NotificationInfo[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    if (notificationQueue.length > 0) {
      const [notification, ...rest] = notificationQueue;
      toast(notification);
      setNotificationQueue(rest);
    }
  }, [notificationQueue, toast]);


  const showNotification = useCallback((site: Website) => {
    if (!notificationsEnabled) return;
    
    const newNotification: NotificationInfo = {
      title: 'Service Down',
      description: `${site.name} is currently down.`,
      variant: 'destructive',
    };
    setNotificationQueue(q => [...q, newNotification]);

    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      new Notification('Service Alert', {
        body: `${site.name} is currently down.`,
        icon: '/favicon.ico',
      });
    }
  }, [notificationsEnabled]);

  const updateWebsiteState = useCallback((id: string, updates: Partial<Website>) => {
    setWebsites(current => {
        const siteToUpdate = current.find(s => s.id === id);
        if (!siteToUpdate) return current;

        const newLatencyHistory = updates.latency !== undefined 
            ? [...(siteToUpdate.latencyHistory || []), { time: new Date().toISOString(), latency: updates.latency }].slice(-MAX_LATENCY_HISTORY)
            : siteToUpdate.latencyHistory;
        
        let newStatusHistory = [...(siteToUpdate.statusHistory || [])];
        const lastStatus = newStatusHistory.length > 0 ? newStatusHistory[newStatusHistory.length - 1].status : null;
        
        if (updates.status && updates.status !== 'Checking' && updates.status !== 'Idle' && updates.status !== lastStatus) {
            newStatusHistory.push({
                time: new Date().toISOString(),
                status: updates.status === 'Up' ? 'Up' : 'Down',
                latency: updates.latency ?? 0,
                reason: updates.httpResponse ?? '',
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
        
        if (updates.status === 'Down' && siteToUpdate.status !== 'Down') {
            showNotification(siteToUpdate);
        }

        const updatedSite: Website = {
            ...siteToUpdate,
            ...updates,
            latencyHistory: newLatencyHistory,
            statusHistory: newStatusHistory,
            averageLatency,
            lowestLatency,
            highestLatency,
            uptimeData: calculateUptime(newStatusHistory),
            lastDownTime: updates.status === 'Down' && siteToUpdate.status !== 'Down' ? new Date().toISOString() : siteToUpdate.lastDownTime,
        };
        
        return current.map(s => s.id === id ? updatedSite : s);
    });
  }, [showNotification]);

  const manualCheck = useCallback(async (id: string) => {
    const siteToCheck = websites.find(s => s.id === id);
    if (!siteToCheck || siteToCheck.isPaused || siteToCheck.monitorType === 'Downtime') {
        return;
    }
    
    updateWebsiteState(id, { status: 'Checking' });
    
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
  }, [websites, updateWebsiteState]);


  useEffect(() => {
    const pollAllWebsites = () => {
        websites.forEach(site => {
            if (!site.isPaused) {
                manualCheck(site.id);
            }
        });
    };

    // Initial check on load
    setTimeout(pollAllWebsites, 1000); 

    const intervalId = setInterval(pollAllWebsites, pollingInterval * 1000);
    return () => clearInterval(intervalId);
  }, [pollingInterval, manualCheck]);


  const addWebsite = useCallback((data: WebsiteFormData) => {
    setWebsites(currentWebsites => {
        if (currentWebsites.some(site => site.url === data.url && site.port === data.port)) {
            toast({ title: 'Duplicate Service', description: 'This service is already being monitored.', variant: 'destructive' });
            return currentWebsites;
        }
        const newWebsite: Website = {
            ...data,
            id: `${Date.now()}`,
            status: 'Idle',
            isPaused: false,
            latencyHistory: [],
            statusHistory: [],
            uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null },
            displayOrder: currentWebsites.length > 0 ? Math.max(...currentWebsites.map(w => w.displayOrder || 0)) + 1 : 0,
        };
        // Immediately check the new website
        manualCheck(newWebsite.id);
        return [...currentWebsites, newWebsite];
    });
  }, [toast, manualCheck]);
  
  const editWebsite = useCallback((id: string, data: WebsiteFormData) => {
      setWebsites(currentWebsites => {
          const siteToEdit = currentWebsites.find(s => s.id === id);
          if (!siteToEdit) return currentWebsites;

          const wasPaused = siteToEdit.isPaused;
          const updatedSite = {
              ...siteToEdit,
              ...data,
              status: wasPaused ? 'Paused' as const : 'Idle' as const,
          };
          const finalSites = currentWebsites.map(s => s.id === id ? updatedSite : s);
          if (!wasPaused) {
            manualCheck(id);
          }
          return finalSites;
      });
  }, [manualCheck]);

  const deleteWebsite = useCallback((id: string) => {
    setWebsites(currentWebsites => currentWebsites.filter(s => s.id !== id));
  }, []);

  const moveWebsite = useCallback((id: string, direction: 'up' | 'down') => {
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
  }, []);
  
  const togglePause = useCallback((id: string) => {
    setWebsites(current => current.map(s => {
        if (s.id === id) {
            const isNowPaused = !s.isPaused;
            return { ...s, isPaused: isNowPaused, status: isNowPaused ? 'Paused' : 'Idle' };
        }
        return s;
    }));
  }, []);
  
  const diagnose = useCallback(async (id: string) => {
    const website = websites.find(s => s.id === id);
    if (!website || !website.httpResponse) return;

    updateWebsiteState(id, { diagnosis: 'AI is analyzing...' });

    try {
        const { diagnosis } = await getAIDiagnosis({ url: website.url, httpResponse: website.httpResponse });
        updateWebsiteState(id, { diagnosis });
    } catch (error) {
        toast({ title: 'Diagnosis Failed', description: 'Could not get AI analysis.', variant: 'destructive' });
        updateWebsiteState(id, { diagnosis: 'AI analysis failed.' });
    }
  }, [websites, toast, updateWebsiteState]);

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

    

    