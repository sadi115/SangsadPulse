
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Website, MonitorType, StatusHistory, UptimeData } from '@/lib/types';
import { AddWebsiteForm } from '@/components/add-website-form';
import { checkStatus, getAIDiagnosis, getTtfb } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { SummaryOverview } from '@/components/summary-overview';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EditWebsiteDialog } from '@/components/edit-website-dialog';
import { ReportGenerator } from '@/components/report-generator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LayoutGrid, List, Bell, Search } from 'lucide-react';
import { WebsiteCardView } from '@/components/website-card-view';
import { WebsiteListView } from '@/components/website-list-view';
import Image from 'next/image';
import { LiveClock } from '@/components/live-clock';
import { ThemeToggle } from '@/components/theme-toggle';
import { HistoryDialog } from './history-dialog';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
import { Switch } from '@/components/ui/switch';


const initialWebsites: Omit<Website, 'displayOrder' | 'uptimeData'>[] = [
  { id: '1', name: 'Parliament Website', url: 'https://www.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], group: 'Bangladesh Parliament' },
  { id: '2', name: 'PRP Parliament', url: 'https://prp.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], group: 'Bangladesh Parliament' },
  { id: '3', name: 'QAMS Parliament', url: 'https://qams.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], group: 'Bangladesh Parliament' },
  { id: '4', name: 'CMIS Parliament', url: 'https://cmis.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], group: 'Bangladesh Parliament' },
  { id: '5', name: 'Debate Parliament', url: 'https://debate.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], group: 'Bangladesh Parliament' },
  { id: '6', name: 'DRM Parliament', url: 'https://drm.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], group: 'Bangladesh Parliament' },
  { id: '7', name: 'eBilling Parliament', url: 'https://ebilling.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], group: 'Bangladesh Parliament' },
  { id: '8', name: 'Sitting Parliament', url: 'https://sitting.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], group: 'Bangladesh Parliament' },
  { id: '9', name: 'eBook Parliament', url: 'https://ebook.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], group: 'Bangladesh Parliament' },
  { id: '10', name: 'Broadcast Parliament', url: 'https://broadcast.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], group: 'Bangladesh Parliament' },
  { id: '11', name: 'Library Parliament', url: 'https://library.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [], group: 'Bangladesh Parliament' },
  { id: '12', name: 'Google', url: 'https://www.google.com', status: 'Idle', monitorType: 'HTTP(s)', port: 443, latencyHistory: [], statusHistory: [], group: 'External Services' },
  { id: '13', name: 'Google DNS', url: '8.8.8.8', status: 'Idle', monitorType: 'DNS Records', latencyHistory: [], statusHistory: [], group: 'External Services' },
  { id: '14', name: 'Cloudflare DNS', url: '1.1.1.1', status: 'Idle', monitorType: 'DNS Records', latencyHistory: [], statusHistory: [], group: 'External Services' },
];

const MAX_LATENCY_HISTORY = 50;
const MAX_STATUS_HISTORY = 100;
const LOCAL_STORAGE_KEY = 'monitoring-websites';

type WebsiteFormData = {
    name: string;
    url: string;
    monitorType: MonitorType;
    port?: number;
    keyword?: string;
    pollingInterval?: number;
    group?: string;
}

const calculateUptime = (history: { time: string; latency: number }[]): UptimeData => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const calculatePercentage = (data: { time: string; latency: number }[]) => {
        if (data.length === 0) return null;
        const upCount = data.filter(h => h.latency > 0).length;
        return (upCount / data.length) * 100;
    };
    
    const last1h = history.filter(h => new Date(h.time) >= oneHourAgo);
    const last24h = history.filter(h => new Date(h.time) >= twentyFourHoursAgo);
    const last30d = history.filter(h => new Date(h.time) >= thirtyDaysAgo);

    return {
        '1h': calculatePercentage(last1h),
        '24h': calculatePercentage(last24h),
        '30d': calculatePercentage(last30d),
        'total': calculatePercentage(history),
    };
};

export default function MonitoringDashboard() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [pollingInterval, setPollingInterval] = useState(30);
  const [tempPollingInterval, setTempPollingInterval] = useState(30);
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null);
  const [historyWebsite, setHistoryWebsite] = useState<Website | null>(null);
  const [deletingWebsite, setDeletingWebsite] = useState<Website | null>(null);
  const [view, setView] = useState<'card' | 'list'>('card');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);


  const { toast } = useToast();
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const previousWebsitesRef = useRef<Website[]>([]);
  const pollingIntervalRef = useRef(pollingInterval);


   useEffect(() => {
    pollingIntervalRef.current = pollingInterval;
  }, [pollingInterval]);

   useEffect(() => {
    try {
      const savedView = localStorage.getItem('monitoring-view') as 'card' | 'list';
      if (savedView) {
        setView(savedView);
      }
    } catch (error) {
        console.warn("Could not read view from localStorage", error)
    }
  }, []);

  useEffect(() => {
    try {
        const savedWebsites = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedWebsites) {
            const parsed = JSON.parse(savedWebsites);
            // Reset runtime state on load
            setWebsites(parsed.map((site: Website) => ({
                ...site,
                status: 'Idle',
                isLoading: true,
                latency: undefined,
                lastDownTime: undefined,
                httpResponse: undefined,
            })));
        } else {
            setWebsites(initialWebsites.map((site, index) => ({ 
                ...site, 
                displayOrder: index, 
                isLoading: true,
                uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null },
            })));
        }
    } catch (error) {
        console.warn("Could not load websites from localStorage", error);
        setWebsites(initialWebsites.map((site, index) => ({ 
            ...site, 
            displayOrder: index, 
            isLoading: true,
            uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null },
        })));
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
        // We only want to store the "config" of the websites, not their runtime state
        const sitesToSave = websites.map(({ 
            status, lastChecked, httpResponse, diagnosis, latency, averageLatency, lowestLatency, highestLatency, lastDownTime, ttfb, isLoading, ...rest 
        }) => rest);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sitesToSave));
    } catch (error) {
        console.warn("Could not save websites to localStorage", error);
    }
  }, [websites, isLoaded]);

  useEffect(() => {
    try {
      localStorage.setItem('monitoring-view', view);
    } catch (error) {
        console.warn("Could not save view to localStorage", error)
    }
  }, [view]);

  const updateWebsite = useCallback((id: string, updates: Partial<Website> & { newStatusHistoryEntry?: StatusHistory }) => {
    setWebsites(prev =>
      prev.map(site => {
        if (site.id === id) {
          const { newStatusHistoryEntry, ...restUpdates } = updates;
          
          const newLatencyHistory = [
            ...(site.latencyHistory || []),
            ...(updates.latency !== undefined ? [{ time: new Date().toISOString(), latency: updates.latency }] : []),
          ].slice(-MAX_LATENCY_HISTORY);
          
          let newStatusHistory = [...(site.statusHistory || [])];
          if(newStatusHistoryEntry) {
              const lastStatus = newStatusHistory[newStatusHistory.length - 1]?.status;
              if (newStatusHistoryEntry.status !== lastStatus) {
                  newStatusHistory.push(newStatusHistoryEntry);
              }
          }
          newStatusHistory = newStatusHistory.slice(-MAX_STATUS_HISTORY);

          let averageLatency, lowestLatency, highestLatency;
          if (newLatencyHistory.length > 0) {
            const upHistory = newLatencyHistory.filter(h => h.latency > 0);
            if(upHistory.length > 0) {
              const totalLatency = upHistory.reduce((acc, curr) => acc + curr.latency, 0);
              averageLatency = Math.round(totalLatency / upHistory.length);
              lowestLatency = Math.min(...upHistory.map(h => h.latency));
              highestLatency = Math.max(...upHistory.map(h => h.latency));
            }
          }

          const uptimeData = calculateUptime(newLatencyHistory);

          const newSite = { 
            ...site, 
            ...restUpdates, 
            latencyHistory: newLatencyHistory,
            statusHistory: newStatusHistory, 
            averageLatency, 
            lowestLatency,
            highestLatency,
            uptimeData,
            isLoading: false,
          };
          
          if (updates.status === 'Down' && site.status !== 'Down') {
            newSite.lastDownTime = new Date().toISOString();
          }

          return newSite;
        }
        return site;
      })
    );
  }, []);

  const scheduleNextPoll = useCallback((website: Website) => {
    const interval = (website.pollingInterval || pollingIntervalRef.current) * 1000;
    const timeoutId = setTimeout(() => pollWebsite(website), interval);
    timeoutsRef.current.set(website.id, timeoutId);
  }, []);

  const pollWebsite = useCallback(async (website: Website) => {
    if (website.isPaused || website.monitorType === 'Downtime') {
      updateWebsite(website.id, {
        status: website.monitorType === 'Downtime' ? 'Down' : 'Paused',
        httpResponse: website.monitorType === 'Downtime' ? 'In scheduled downtime.' : 'Monitoring is paused.',
        isLoading: false
      });
      return;
    }

    updateWebsite(website.id, { status: 'Checking' });

    try {
      const result = await checkStatus(website);
      let ttfbResult;
      if (result.status === 'Up' && (website.monitorType === 'HTTP(s)' || website.monitorType === 'HTTP(s) - Keyword')) {
        ttfbResult = await getTtfb({ url: website.url });
      }

      const newStatusHistoryEntry: StatusHistory = {
        time: result.lastChecked,
        status: result.status === 'Up' ? 'Up' : 'Down',
        latency: result.latency,
        reason: result.httpResponse,
      };

      updateWebsite(website.id, { ...result, ttfb: ttfbResult?.ttfb, newStatusHistoryEntry });
    } catch (error) {
      console.error(`Failed to check status for ${website.url}`, error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      updateWebsite(website.id, { status: 'Down', httpResponse: `Failed to check status: ${errorMessage}` });
    }

    // After the check, schedule the next one.
    // Use setWebsites' functional update to get the latest site config.
    setWebsites(currentWebsites => {
        const siteToReschedule = currentWebsites.find(w => w.id === website.id);
        if (siteToReschedule) {
            scheduleNextPoll(siteToReschedule);
        }
        return currentWebsites;
    });
  }, [updateWebsite, scheduleNextPoll]);

  useEffect(() => {
    if (!isLoaded) return;

    // Start polling for all websites.
    websites.forEach(website => {
      if (!timeoutsRef.current.has(website.id)) {
        // Stagger initial polls to avoid a thundering herd
        const initialDelay = Math.random() * 5000; 
        const timeoutId = setTimeout(() => pollWebsite(website), initialDelay);
        timeoutsRef.current.set(website.id, timeoutId);
      }
    });

    // Cleanup function
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
    // This effect should only run when the component mounts and `isLoaded` becomes true.
    // The polling loop is now self-sustaining via `scheduleNextPoll`.
  }, [isLoaded, pollWebsite]);
  
  useEffect(() => {
    if (!notificationsEnabled) return;
    
    const prevWebsites = previousWebsitesRef.current;
    websites.forEach((site) => {
        const prevSite = prevWebsites.find(p => p.id === site.id);
        if (prevSite && prevSite.status !== 'Down' && site.status === 'Down') {
            toast({
                title: 'Service Down',
                description: `${site.name} is currently down.`,
                variant: 'destructive',
            });
        }
    });
    previousWebsitesRef.current = websites;
  }, [websites, toast, notificationsEnabled]);

  const handleAddWebsite = useCallback((data: WebsiteFormData) => {
    setWebsites(prev => {
        if (prev.some(site => site.url === data.url && site.port === data.port)) {
          toast({
            title: 'Duplicate Service',
            description: 'This service is already being monitored.',
            variant: 'destructive',
          });
          return prev;
        }

        const newWebsite: Website = {
          id: crypto.randomUUID(),
          ...data,
          status: 'Idle',
          latencyHistory: [],
          statusHistory: [],
          uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null },
          displayOrder: prev.length > 0 ? Math.max(...prev.map(w => w.displayOrder)) + 1 : 0,
          isLoading: true,
        };
        
        // Immediately start polling for the new site
        const timeoutId = setTimeout(() => pollWebsite(newWebsite), 1000);
        timeoutsRef.current.set(newWebsite.id, timeoutId);
        
        return [...prev, newWebsite];
    });
  }, [pollWebsite, toast]);

  const handleDeleteWebsite = useCallback((id: string) => {
    const siteToDelete = websites.find(site => site.id === id);
    if (siteToDelete) {
        if (timeoutsRef.current.has(id)) {
            clearTimeout(timeoutsRef.current.get(id)!);
            timeoutsRef.current.delete(id);
        }
        setWebsites(prev => prev.filter(site => site.id !== id));
        toast({
            title: "Service Removed",
            description: `"${siteToDelete.name}" has been removed from monitoring.`,
        });
    }
  }, [websites, toast]);
  
  const handleEditWebsite = (id: string, data: WebsiteFormData) => {
    if (timeoutsRef.current.has(id)) {
        clearTimeout(timeoutsRef.current.get(id)!);
        timeoutsRef.current.delete(id);
    }

    let editedSite: Website | undefined;
    setWebsites(prev => prev.map(s => {
      if (s.id === id) {
          editedSite = {
            ...s,
            ...data,
            status: 'Idle',
            isLoading: true,
            latencyHistory: [],
            statusHistory: [],
            uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null },
            lastDownTime: undefined,
            diagnosis: undefined,
            latency: undefined,
            averageLatency: undefined,
            lowestLatency: undefined,
            highestLatency: undefined,
          };
          return editedSite;
      }
      return s;
    }));

    if (editedSite) {
        const initialDelay = 1000;
        const timeoutId = setTimeout(() => pollWebsite(editedSite!), initialDelay);
        timeoutsRef.current.set(editedSite.id, timeoutId);
        toast({
            title: "Service Updated",
            description: `${data.name} has been updated successfully.`
        });
    }
  };

  const handleManualCheck = useCallback((id: string) => {
    const website = websites.find(site => site.id === id);
    if (website) {
        toast({
            title: 'Manual Check',
            description: `Requesting a manual status check for ${website.name}.`,
        });
        
        if (timeoutsRef.current.has(id)) {
            clearTimeout(timeoutsRef.current.get(id)!);
            timeoutsRef.current.delete(id);
        }
        // Poll immediately, the regular schedule will resume after.
        pollWebsite(website);
    }
  }, [websites, pollWebsite, toast]);

  const handleDiagnose = useCallback(async (id: string) => {
    const website = websites.find(site => site.id === id);
    if (!website || !website.httpResponse) return;

    try {
      updateWebsite(id, { diagnosis: 'AI is analyzing...' });
      const { diagnosis } = await getAIDiagnosis({
        url: website.url,
        httpResponse: website.httpResponse,
      });
      updateWebsite(id, { diagnosis });
    } catch (error) {
      console.error('Diagnosis failed for', website.url, error);
      updateWebsite(id, { diagnosis: 'AI analysis failed.' });
      toast({
        title: 'Diagnosis Failed',
        description: 'Could not get AI analysis for the website.',
        variant: 'destructive',
      });
    }
  }, [websites, updateWebsite, toast]);

  const handleIntervalChange = () => {
    if(tempPollingInterval > 0) {
        setPollingInterval(tempPollingInterval);
        
        toast({
            title: 'Settings Saved',
            description: `Global monitoring interval updated to ${tempPollingInterval} seconds. This will apply to each service on its next check.`,
        });
    } else {
        toast({
            title: 'Invalid Interval',
            description: 'Polling interval must be greater than 0.',
            variant: 'destructive'
        });
    }
  };

  const moveWebsite = (id: string, direction: 'up' | 'down') => {
    setWebsites(prev => {
        const sites = [...prev].sort((a,b) => a.displayOrder - b.displayOrder);
        const index = sites.findIndex(site => site.id === id);
  
        if (index === -1) return prev;
    
        const newIndex = direction === 'up' ? index - 1 : index + 1;
    
        if (newIndex < 0 || newIndex >= sites.length) return prev;
  
        const newWebsites = [...sites];
        const item = newWebsites[index];
        const otherItem = newWebsites[newIndex];
  
        // Swap displayOrder
        [item.displayOrder, otherItem.displayOrder] = [otherItem.displayOrder, item.displayOrder];

        return newWebsites;
      });
  };

  const handleTogglePause = useCallback((id: string) => {
     setWebsites(prev => prev.map(s => {
        if (s.id === id) {
            const isNowPaused = !s.isPaused;
            if (isNowPaused) {
                if (timeoutsRef.current.has(id)) {
                    clearTimeout(timeoutsRef.current.get(id)!);
                    timeoutsRef.current.delete(id);
                }
                return { ...s, isPaused: true, status: 'Paused', isLoading: false };
            } else {
                 const siteToResume = { ...s, isPaused: false, status: 'Idle', isLoading: true };
                 // Immediately start polling for the resumed site
                 const timeoutId = setTimeout(() => pollWebsite(siteToResume), 1000);
                 timeoutsRef.current.set(id, timeoutId);
                 return siteToResume;
            }
        }
        return s;
    }));
  }, [pollWebsite]);

  const groupedAndFilteredWebsites = useMemo(() => {
    const filtered = websites.filter(site => 
        site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.url.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sorted = filtered.sort((a, b) => {
      if (a.isPaused && !b.isPaused) return 1;
      if (!a.isPaused && b.isPaused) return -1;
      return a.displayOrder - b.displayOrder;
    });

    return sorted.reduce((acc, site) => {
        const groupName = site.group || 'Ungrouped';
        if (!acc[groupName]) {
            acc[groupName] = [];
        }
        acc[groupName].push(site);
        return acc;
    }, {} as Record<string, Website[]>);

  }, [websites, searchTerm]);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-24">
            <div className="w-auto md:w-48 flex justify-start">
                <LiveClock />
            </div>
            <div className="flex flex-col items-center gap-1 md:gap-2 text-center">
               <Image 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Emblem_of_the_Jatiya_Sangsad.svg/500px-Emblem_of_the_Jatiya_Sangsad.svg.png"
                alt="Parliament Logo"
                width={40}
                height={40}
                className="h-8 w-8 md:h-10 md:w-10"
                data-ai-hint="emblem"
              />
              <h1 className="text-base md:text-xl font-bold text-foreground">
                Bangladesh Parliament Web Services Monitoring Dashboard
              </h1>
            </div>
            <div className="w-auto md:w-48 flex justify-end">
                <ThemeToggle />
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="container mx-auto p-4 md:p-8 space-y-8">
          <SummaryOverview websites={websites} />
          
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              <h2 className="text-2xl font-bold text-foreground">Monitored Services</h2>
              <div className="w-full max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    placeholder="Search by name or URL..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <ToggleGroup
                type="single"
                value={view}
                onValueChange={(value) => value && setView(value as 'card' | 'list')}
                aria-label="View mode"
              >
                <ToggleGroupItem value="card" aria-label="Card view">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="List view">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {view === 'card' ? (
              <WebsiteCardView 
                groupedWebsites={groupedAndFilteredWebsites}
                onDelete={(id) => setDeletingWebsite(websites.find(w => w.id === id) || null)}
                onDiagnose={handleDiagnose}
                onEdit={(id) => setEditingWebsite(websites.find(w => w.id === id) || null)}
                onMove={moveWebsite}
                onTogglePause={handleTogglePause}
                onShowHistory={(id) => setHistoryWebsite(websites.find(w => w.id === id) || null)}
                onManualCheck={handleManualCheck}
              />
            ) : (
              <WebsiteListView
                groupedWebsites={groupedAndFilteredWebsites}
                onDelete={(id) => setDeletingWebsite(websites.find(w => w.id === id) || null)}
                onDiagnose={handleDiagnose}
                onEdit={(id) => setEditingWebsite(websites.find(w => w.id === id) || null)}
                onMove={moveWebsite}
                onTogglePause={handleTogglePause}
                onShowHistory={(id) => setHistoryWebsite(websites.find(w => w.id === id) || null)}
                 onManualCheck={handleManualCheck}
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
            <Accordion type="single" collapsible className="w-full md:col-span-1">
                <AccordionItem value="add-service">
                    <AccordionTrigger>Add a New Service</AccordionTrigger>
                    <AccordionContent>
                        <Card>
                            <CardHeader>
                                <CardTitle>Add a New Service</CardTitle>
                                <CardDescription>Add a new website or service to the monitoring list.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AddWebsiteForm onAddWebsite={handleAddWebsite} globalPollingInterval={pollingInterval} />
                            </CardContent>
                        </Card>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <Accordion type="single" collapsible className="w-full md:col-span-1">
                <AccordionItem value="settings">
                    <AccordionTrigger>Monitoring Settings</AccordionTrigger>
                    <AccordionContent>
                        <Card>
                            <CardHeader>
                            <CardTitle>Settings</CardTitle>
                            <CardDescription>Customize the monitoring settings.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="polling-interval">Global Monitoring Interval (seconds)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="polling-interval"
                                            type="number"
                                            value={tempPollingInterval}
                                            onChange={(e) => setTempPollingInterval(Number(e.target.value))}
                                            placeholder="e.g. 30"
                                            className="w-full"
                                        />
                                        <Button onClick={handleIntervalChange}>Save</Button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                  <div className="space-y-0.5">
                                    <Label htmlFor="notifications-switch" className="flex items-center gap-2">
                                      <Bell className="h-4 w-4" />
                                      Notifications
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                      Enable or disable service down notifications.
                                    </p>
                                  </div>
                                  <Switch
                                    id="notifications-switch"
                                    checked={notificationsEnabled}
                                    onCheckedChange={setNotificationsEnabled}
                                  />
                                </div>
                            </CardContent>
                        </Card>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <Accordion type="single" collapsible className="w-full md:col-span-1">
                <AccordionItem value="report-generator">
                    <AccordionTrigger>Generate Reports</AccordionTrigger>
                    <AccordionContent>
                        <Card>
                             <CardHeader>
                                <CardTitle>Generate Report</CardTitle>
                                 <CardDescription>Download a monitoring report for your services.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ReportGenerator websites={websites} />
                            </CardContent>
                        </Card>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
          </div>
          
          <EditWebsiteDialog 
            isOpen={!!editingWebsite}
            onOpenChange={(isOpen) => !isOpen && setEditingWebsite(null)}
            website={editingWebsite}
            onEditWebsite={handleEditWebsite}
            globalPollingInterval={pollingInterval}
          />
          <HistoryDialog
            isOpen={!!historyWebsite}
            onOpenChange={(isOpen) => !isOpen && setHistoryWebsite(null)}
            website={historyWebsite}
          />
          <DeleteConfirmDialog
            isOpen={!!deletingWebsite}
            onOpenChange={(isOpen) => !isOpen && setDeletingWebsite(null)}
            website={deletingWebsite}
            onConfirmDelete={() => {
                if (deletingWebsite) {
                    handleDeleteWebsite(deletingWebsite.id);
                }
                setDeletingWebsite(null);
            }}
          />
        </div>
      </main>
      <footer className="bg-card border-t py-4">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>Developed by Network &amp; Operation Section, Bangladesh Parliament Secretariat</p>
        </div>
      </footer>
    </div>
  );
}
