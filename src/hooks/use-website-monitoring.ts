
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { addWebsite as addWebsiteToDb, updateWebsite as updateWebsiteInDb, deleteWebsite as deleteWebsiteFromDb, moveWebsite as moveWebsiteInDb, seedInitialData } from '@/lib/firestore';
import type { Website, WebsiteFormData, StatusHistory } from '@/lib/types';
import { checkStatus, getAIDiagnosis, getTtfb } from '@/lib/actions';

const initialWebsites: Omit<Website, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Parliament Website', url: 'https://www.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false },
  { name: 'PRP Parliament', url: 'https://prp.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false },
  { name: 'QAMS Parliament', url: 'https://qams.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false },
  { name: 'CMIS Parliament', url: 'https://cmis.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false },
  { name: 'Debate Parliament', url: 'https://debate.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false },
  { name: 'DRM Parliament', url: 'https://drm.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false },
  { name: 'eBilling Parliament', url: 'https://ebilling.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false },
  { name: 'Sitting Parliament', url: 'https://sitting.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false },
  { name: 'eBook Parliament', url: 'https://ebook.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false },
  { name: 'Broadcast Parliament', url: 'https://broadcast.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false },
  { name: 'Library Parliament', url: 'https://library.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false },
  { name: 'Google', url: 'https://www.google.com', status: 'Idle', monitorType: 'HTTP(s)', port: 443, latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false },
  { name: 'Google DNS', url: '8.8.8.8', status: 'Idle', monitorType: 'DNS Records', latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false },
  { name: 'Cloudflare DNS', url: '1.1.1.1', status: 'Idle', monitorType: 'DNS Records', latencyHistory: [], statusHistory: [], uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null }, isPaused: false },
];

const MAX_LATENCY_HISTORY = 50;
const MAX_STATUS_HISTORY = 100;

export function useWebsiteMonitoring() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [pollingInterval, setPollingInterval] = useState(30);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { toast } = useToast();
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Seed data once on initial load if the database is empty
  useEffect(() => {
    const checkAndSeed = async () => {
      try {
        const q = query(collection(db, 'websites'));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          console.log("Database is empty, seeding initial data...");
          await seedInitialData(initialWebsites);
        }
      } catch (error) {
        console.error("Error checking or seeding data:", error);
      }
    };
    checkAndSeed();
  }, []);

  // Subscribe to Firestore data
  useEffect(() => {
    const q = query(collection(db, 'websites'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const sites: Website[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        const convertTimestamp = (field: any): string | undefined => {
          if (field instanceof Timestamp) {
              return field.toDate().toISOString();
          }
          return typeof field === 'string' ? field : undefined;
        };
        
        const site: Website = {
          id: doc.id,
          name: data.name,
          url: data.url,
          monitorType: data.monitorType,
          status: data.status,
          createdAt: data.createdAt,
          updatedAt: convertTimestamp(data.updatedAt),
          isPaused: data.isPaused,
          isLoading: data.isLoading, 
          httpResponse: data.httpResponse,
          lastChecked: convertTimestamp(data.lastChecked),
          diagnosis: data.diagnosis,
          latency: data.latency,
          ttfb: data.ttfb,
          averageLatency: data.averageLatency,
          lowestLatency: data.lowestLatency,
          highestLatency: data.highestLatency,
          uptimeData: data.uptimeData || { '1h': null, '24h': null, '30d': null, 'total': null },
          latencyHistory: data.latencyHistory || [],
          statusHistory: (data.statusHistory || []).map((h: any) => ({...h, time: convertTimestamp(h.time)})),
          lastDownTime: convertTimestamp(data.lastDownTime),
          port: data.port,
          keyword: data.keyword,
          pollingInterval: data.pollingInterval,
        };
        sites.push(site);
      });
      setWebsites(sites);
    }, (error) => {
        console.error("Error fetching websites:", error);
        toast({ title: "Error", description: "Could not connect to the database.", variant: "destructive"});
    });

    return () => unsubscribe();
  }, [toast]);
  
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

  const pollWebsite = useCallback(async (website: Website) => {
    if (website.isPaused || website.monitorType === 'Downtime') return;
    
    await updateWebsiteInDb(website.id, { status: 'Checking' });
    
    try {
      const result = await checkStatus(website);
      let ttfbResult;
      if (result.status === 'Up' && (website.monitorType === 'HTTP(s)' || website.monitorType === 'HTTP(s) - Keyword')) {
        ttfbResult = await getTtfb({ url: website.url });
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

      const newLatencyHistory = [...(website.latencyHistory || []), { time: new Date().toISOString(), latency: result.latency ?? 0 }].slice(-MAX_LATENCY_HISTORY);
      
      let newStatusHistory = [...(website.statusHistory || [])];
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

      const finalUpdates: Partial<Website> = {
        ...result,
        ttfb: ttfbResult?.ttfb,
        latencyHistory: newLatencyHistory,
        statusHistory: newStatusHistory,
        averageLatency,
        lowestLatency,
        highestLatency,
        uptimeData: calculateUptime(newStatusHistory),
        lastDownTime: result.status === 'Down' && website.status !== 'Down' ? new Date().toISOString() : website.lastDownTime
      };

      if (finalUpdates.lastDownTime === website.lastDownTime && result.status === 'Up' && website.status === 'Down') {
        // If it's coming back up, we don't need to change lastDownTime. But we do need to handle notification.
      } else if (result.status === 'Down' && website.status !== 'Down') {
          showNotification(website);
      }
      
      await updateWebsiteInDb(website.id, finalUpdates);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      await updateWebsiteInDb(website.id, { status: 'Down', httpResponse: `Poll failed: ${errorMessage}` });
    }
  }, [showNotification]);

  // Effect to manage polling timeouts
  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current.clear();

    websites.forEach(website => {
      if (!website.isPaused) {
        const interval = (website.pollingInterval || pollingInterval) * 1000;
        const timeoutId = setTimeout(() => pollWebsite(website), interval);
        timeoutsRef.current.set(website.id, timeoutId);
      }
    });

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, [websites, pollingInterval, pollWebsite]);

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
    const newSiteRef = await addWebsiteToDb(data);
    const newWebsiteData = { ...data, id: newSiteRef.id, status: 'Idle', isPaused: false, createdAt: Timestamp.now() } as Website;
    pollWebsite(newWebsiteData);
  };
  
  const editWebsite = async (id: string, data: WebsiteFormData) => {
      const updates = {
          ...data,
          status: 'Idle',
          latencyHistory: [],
          statusHistory: [],
          uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null },
          lastDownTime: null,
          diagnosis: null,
      };
      await updateWebsiteInDb(id, updates);
      const updatedSite = { ...websites.find(w => w.id === id)!, ...updates } as Website;
      pollWebsite(updatedSite);
  };

  const deleteWebsite = async (id: string) => {
    await deleteWebsiteFromDb(id);
  };

  const moveWebsite = async (id: string, direction: 'up' | 'down') => {
      await moveWebsiteInDb(id, websites, direction);
  };
  
  const togglePause = async (id: string) => {
    const site = websites.find(s => s.id === id);
    if (!site) return;
    const isNowPaused = !site.isPaused;
    if (isNowPaused) {
      await updateWebsiteInDb(id, { isPaused: true, status: 'Paused' });
    } else {
      await updateWebsiteInDb(id, { isPaused: false, status: 'Idle' });
      pollWebsite({ ...site, isPaused: false, status: 'Idle' });
    }
  };
  
  const manualCheck = (id: string) => {
    const website = websites.find(site => site.id === id);
    if (website) {
      toast({ title: 'Manual Check', description: `Requesting a manual status check for ${website.name}.` });
      pollWebsite(website);
    }
  };
  
  const diagnose = async (id: string) => {
    const website = websites.find(site => site.id === id);
    if (!website || !website.httpResponse) return;
    try {
      await updateWebsiteInDb(id, { diagnosis: 'AI is analyzing...' });
      const { diagnosis } = await getAIDiagnosis({ url: website.url, httpResponse: website.httpResponse });
      await updateWebsiteInDb(id, { diagnosis });
    } catch (error) {
      await updateWebsiteInDb(id, { diagnosis: 'AI analysis failed.' });
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

    