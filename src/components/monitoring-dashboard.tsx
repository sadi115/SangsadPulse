
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Website } from '@/lib/types';
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
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { addWebsite, updateWebsite, deleteWebsite, moveWebsite, seedInitialData } from '@/lib/firestore';
import type { WebsiteFormData, StatusHistory } from '@/lib/types';

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

export default function MonitoringDashboard() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [pollingInterval, setPollingInterval] = useState(30);
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null);
  const [historyWebsite, setHistoryWebsite] = useState<Website | null>(null);
  const [deletingWebsite, setDeletingWebsite] = useState<Website | null>(null);
  const [view, setView] = useState<'card' | 'list'>('card');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  const { toast } = useToast();
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Load view preference from localStorage
  useEffect(() => {
    try {
      const savedView = localStorage.getItem('monitoring-view') as 'card' | 'list';
      if (savedView) setView(savedView);
    } catch (error) {
      console.warn("Could not read view from localStorage", error);
    }
  }, []);

  // Save view preference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('monitoring-view', view);
    } catch (error) {
      console.warn("Could not save view to localStorage", error);
    }
  }, [view]);


  // Subscribe to Firestore data
  useEffect(() => {
    seedInitialData(initialWebsites);
    
    const q = query(collection(db, 'websites'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const sites: Website[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        sites.push({ 
            ...data, 
            id: doc.id,
            // Convert Firestore Timestamps to strings if they exist
            lastChecked: data.lastChecked ? new Date(data.lastChecked).toISOString() : undefined,
            lastDownTime: data.lastDownTime ? new Date(data.lastDownTime).toISOString() : undefined,
            createdAt: data.createdAt, // Keep as is
        } as Website);
      });
      setWebsites(sites.map(s => ({...s, isLoading: false })));
      setIsLoaded(true);
    }, (error) => {
        console.error("Error fetching websites:", error);
        toast({ title: "Error", description: "Could not connect to the database.", variant: "destructive"});
    });

    return () => unsubscribe();
  }, [toast]);
  

  const calculateUptime = (history: { time: string; latency: number }[]) => {
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

  const updateWebsiteInDb = useCallback(async (id: string, updates: Partial<Website>) => {
    const site = websites.find(s => s.id === id);
    if (!site) return;

    const { ...restUpdates } = updates;

    const newLatencyHistory = [
      ...(site.latencyHistory || []),
      ...(updates.latency !== undefined ? [{ time: new Date().toISOString(), latency: updates.latency }] : []),
    ].slice(-MAX_LATENCY_HISTORY);

    let newStatusHistory = [...(site.statusHistory || [])];
    if (updates.status) {
      const lastStatus = newStatusHistory[newStatusHistory.length - 1]?.status;
      const newStatusHistoryEntry: StatusHistory = {
        time: new Date().toISOString(),
        status: updates.status === 'Up' ? 'Up' : 'Down',
        latency: updates.latency ?? 0,
        reason: updates.httpResponse ?? '',
      };
      if (newStatusHistoryEntry.status !== lastStatus) {
        newStatusHistory.push(newStatusHistoryEntry);
      }
    }
    newStatusHistory = newStatusHistory.slice(-MAX_STATUS_HISTORY);

    let averageLatency, lowestLatency, highestLatency;
    if (newLatencyHistory.length > 0) {
      const upHistory = newLatencyHistory.filter(h => h.latency > 0);
      if (upHistory.length > 0) {
        const totalLatency = upHistory.reduce((acc, curr) => acc + curr.latency, 0);
        averageLatency = Math.round(totalLatency / upHistory.length);
        lowestLatency = Math.min(...upHistory.map(h => h.latency));
        highestLatency = Math.max(...upHistory.map(h => h.latency));
      }
    }

    const uptimeData = calculateUptime(newLatencyHistory);

    const finalUpdates: Partial<Website> = {
      ...restUpdates,
      latencyHistory: newLatencyHistory,
      statusHistory: newStatusHistory,
      averageLatency,
      lowestLatency,
      highestLatency,
      uptimeData,
    };

    if (updates.status === 'Down' && site.status !== 'Down') {
      finalUpdates.lastDownTime = new Date().toISOString();
    }
    
    await updateWebsite(id, finalUpdates);
  }, [websites]);

  const scheduleNextPoll = useCallback((website: Website) => {
    if (timeoutsRef.current.has(website.id)) {
      clearTimeout(timeoutsRef.current.get(website.id)!);
    }
    const interval = (website.pollingInterval || pollingInterval) * 1000;
    const timeoutId = setTimeout(() => pollWebsite(website.id), interval);
    timeoutsRef.current.set(website.id, timeoutId);
  }, [pollingInterval]);

  const pollWebsite = useCallback(async (websiteId: string) => {
    const siteToCheck = websites.find(w => w.id === websiteId);
    if (!siteToCheck) return;

    if (siteToCheck.isPaused || siteToCheck.monitorType === 'Downtime') {
      await updateWebsite(websiteId, {
        status: siteToCheck.monitorType === 'Downtime' ? 'Down' : 'Paused',
        httpResponse: siteToCheck.monitorType === 'Downtime' ? 'In scheduled downtime.' : 'Monitoring is paused.',
      });
      return;
    }

    await updateWebsite(websiteId, { status: 'Checking' });

    try {
      const result = await checkStatus(siteToCheck);
      let ttfbResult;
      if (result.status === 'Up' && (siteToCheck.monitorType === 'HTTP(s)' || siteToCheck.monitorType === 'HTTP(s) - Keyword')) {
        ttfbResult = await getTtfb({ url: siteToCheck.url });
      }
      await updateWebsiteInDb(websiteId, { ...result, ttfb: ttfbResult?.ttfb });
    } catch (error) {
      console.error(`Failed to check status for ${siteToCheck.url}`, error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      await updateWebsiteInDb(websiteId, { status: 'Down', httpResponse: `Failed to check status: ${errorMessage}` });
    }
  }, [websites, updateWebsiteInDb]);

  useEffect(() => {
    if (!isLoaded) return;
    
    websites.forEach(site => {
        if (!timeoutsRef.current.has(site.id)) {
             const initialDelay = Math.random() * 5000;
             const timeoutId = setTimeout(() => pollWebsite(site.id), initialDelay);
             timeoutsRef.current.set(site.id, timeoutId);
        } else {
             scheduleNextPoll(site);
        }
    });

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, [websites, isLoaded, pollWebsite, scheduleNextPoll]);


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

  useEffect(() => {
    if (!isLoaded) return;
    const downSites = websites.filter(site => site.status === 'Down');
    downSites.forEach(site => {
      const lastStatus = site.statusHistory?.[site.statusHistory.length - 2]?.status;
      if (site.status === 'Down' && lastStatus === 'Up') {
        showNotification(site);
      }
    });
  }, [websites, isLoaded, showNotification]);

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

  const handleAddWebsite = useCallback(async (data: WebsiteFormData) => {
    if (websites.some(site => site.url === data.url && site.port === data.port)) {
      toast({ title: 'Duplicate Service', description: 'This service is already being monitored.', variant: 'destructive' });
      return;
    }
    await addWebsite(data);
    toast({ title: "Service Added", description: `${data.name} has been added.` });
  }, [websites, toast]);

  const handleDeleteWebsite = useCallback(async (id: string) => {
    const siteToDelete = websites.find(site => site.id === id);
    if (siteToDelete) {
      if (timeoutsRef.current.has(id)) {
        clearTimeout(timeoutsRef.current.get(id)!);
        timeoutsRef.current.delete(id);
      }
      await deleteWebsite(id);
      toast({ title: "Service Removed", description: `"${siteToDelete.name}" has been removed.` });
    }
  }, [websites, toast]);

  const handleEditWebsite = async (id: string, data: WebsiteFormData) => {
    if (timeoutsRef.current.has(id)) {
        clearTimeout(timeoutsRef.current.get(id)!);
        timeoutsRef.current.delete(id);
    }
    const updates = {
      ...data,
      status: 'Idle',
      latencyHistory: [],
      statusHistory: [],
      uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null },
      lastDownTime: undefined,
      diagnosis: undefined,
    };
    await updateWebsite(id, updates);
    toast({ title: "Service Updated", description: `${data.name} has been updated.` });
  };

  const handleManualCheck = useCallback((id: string) => {
    const website = websites.find(site => site.id === id);
    if (website) {
      toast({ title: 'Manual Check', description: `Requesting a manual status check for ${website.name}.` });
      if (timeoutsRef.current.has(id)) {
        clearTimeout(timeoutsRef.current.get(id)!);
      }
      pollWebsite(website.id);
    }
  }, [websites, pollWebsite, toast]);

  const handleDiagnose = useCallback(async (id: string) => {
    const website = websites.find(site => site.id === id);
    if (!website || !website.httpResponse) return;
    try {
      await updateWebsite(id, { diagnosis: 'AI is analyzing...' });
      const { diagnosis } = await getAIDiagnosis({ url: website.url, httpResponse: website.httpResponse });
      await updateWebsite(id, { diagnosis });
    } catch (error) {
      console.error('Diagnosis failed for', website.url, error);
      await updateWebsite(id, { diagnosis: 'AI analysis failed.' });
      toast({ title: 'Diagnosis Failed', description: 'Could not get AI analysis.', variant: 'destructive' });
    }
  }, [websites, toast]);

  const handleIntervalChange = () => {
    if (pollingInterval > 0) {
      setPollingInterval(pollingInterval);
      toast({ title: 'Settings Saved', description: `Global interval updated to ${pollingInterval} seconds.` });
    } else {
      toast({ title: 'Invalid Interval', description: 'Interval must be > 0.', variant: 'destructive' });
    }
  };

  const handleTogglePause = useCallback(async (id: string) => {
    const site = websites.find(s => s.id === id);
    if (!site) return;
    const isNowPaused = !site.isPaused;
    if (isNowPaused) {
      if (timeoutsRef.current.has(id)) {
        clearTimeout(timeoutsRef.current.get(id)!);
      }
      await updateWebsite(id, { isPaused: true, status: 'Paused' });
    } else {
      await updateWebsite(id, { isPaused: false, status: 'Idle' });
    }
  }, [websites]);

  const filteredWebsites = websites.filter(site =>
    site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-secondary/50 dark:bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
               <Image 
                src="/emblem.png"
                alt="Parliament Logo"
                width={40}
                height={40}
                className="h-10 w-10"
                data-ai-hint="emblem"
              />
              <h1 className="text-xl font-bold text-foreground hidden md:block">
                Bangladesh Parliament Web Service Monitor System
              </h1>
            </div>
            <div className="flex items-center gap-4">
                <LiveClock />
                <ThemeToggle />
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="container mx-auto p-4 md:p-8 space-y-8">
          <SummaryOverview websites={websites} />
          
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h2 className="text-2xl font-bold text-foreground">Monitored Services</h2>
              <div className="flex items-center gap-4">
                <div className="w-full md:w-64">
                    <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Search services..."
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
            </div>

            {view === 'card' ? (
              <WebsiteCardView 
                websites={filteredWebsites}
                onDelete={(id) => setDeletingWebsite(websites.find(w => w.id === id) || null)}
                onDiagnose={handleDiagnose}
                onEdit={(id) => setEditingWebsite(websites.find(w => w.id === id) || null)}
                onMove={(id, dir) => moveWebsite(id, websites, dir)}
                onTogglePause={handleTogglePause}
                onShowHistory={(id) => setHistoryWebsite(websites.find(w => w.id === id) || null)}
                onManualCheck={handleManualCheck}
              />
            ) : (
              <WebsiteListView
                websites={filteredWebsites}
                onDelete={(id) => setDeletingWebsite(websites.find(w => w.id === id) || null)}
                onDiagnose={handleDiagnose}
                onEdit={(id) => setEditingWebsite(websites.find(w => w.id === id) || null)}
                onMove={(id, dir) => moveWebsite(id, websites, dir)}
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
                                            value={pollingInterval}
                                            onChange={(e) => setPollingInterval(Number(e.target.value))}
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
                                    onCheckedChange={handleNotificationToggle}
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
