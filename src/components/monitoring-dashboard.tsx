
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Website, MonitorType, StatusHistory, UptimeData } from '@/lib/types';
import { AddWebsiteForm } from '@/components/add-website-form';
import { checkStatus, getAIDiagnosis } from '@/lib/actions';
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
import { LayoutGrid, List } from 'lucide-react';
import { WebsiteCardView } from '@/components/website-card-view';
import { WebsiteListView } from '@/components/website-list-view';
import Image from 'next/image';
import { LiveClock } from '@/components/live-clock';
import { ThemeToggle } from '@/components/theme-toggle';
import { HistoryDialog } from './history-dialog';
import { DeleteConfirmDialog } from './delete-confirm-dialog';


const initialWebsites: Omit<Website, 'displayOrder' | 'uptimeData'>[] = [
  { id: '1', name: 'Parliament Website', url: 'https://www.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [] },
  { id: '2', name: 'PRP Parliament', url: 'https://prp.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [] },
  { id: '3', name: 'QAMS Parliament', url: 'https://qams.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [] },
  { id: '4', name: 'CMIS Parliament', url: 'https://cmis.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [] },
  { id: '5', name: 'Debate Parliament', url: 'https://debate.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [] },
  { id: '6', name: 'DRM Parliament', url: 'https://drm.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [] },
  { id: '7', name: 'eBilling Parliament', url: 'https://ebilling.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [] },
  { id: '8', name: 'Sitting Parliament', url: 'https://sitting.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [] },
  { id: '9', name: 'eBook Parliament', url: 'https://ebook.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [] },
  { id: '10', name: 'Broadcast Parliament', url: 'https://broadcast.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [] },
  { id: '11', name: 'Library Parliament', url: 'https://library.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [] },
  { id: '12', name: 'Google', url: 'https://www.google.com', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [], statusHistory: [] },
];

const MAX_LATENCY_HISTORY = 50;
const MAX_STATUS_HISTORY = 100;

type WebsiteFormData = {
    name: string;
    url: string;
    monitorType: MonitorType;
    port?: number;
    keyword?: string;
    pollingInterval?: number;
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
  const [websites, setWebsites] = useState<Website[]>(() => 
    initialWebsites.map((site, index) => ({ 
        ...site, 
        displayOrder: index, 
        isLoading: true,
        uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null },
    }))
  );
  const [pollingInterval, setPollingInterval] = useState(30);
  const [tempPollingInterval, setTempPollingInterval] = useState(30);
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null);
  const [historyWebsite, setHistoryWebsite] = useState<Website | null>(null);
  const [deletingWebsite, setDeletingWebsite] = useState<Website | null>(null);
  const [view, setView] = useState<'card' | 'list'>('card');


  const { toast } = useToast();
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

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
          
          const newStatusHistory = [
            ...(site.statusHistory || []),
            ...(newStatusHistoryEntry ? [newStatusHistoryEntry] : []),
          ].slice(-MAX_STATUS_HISTORY);

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

  const pollWebsite = useCallback(async (website: Website) => {
    if (website.status === 'Checking' || website.isPaused) return;

    updateWebsite(website.id, { status: 'Checking' });
    try {
        const result = await checkStatus(website);

        const lastStatus = website.statusHistory?.[website.statusHistory.length - 1]?.status;
        const newStatus = result.status === 'Up' ? 'Up' : 'Down';
        let newStatusHistoryEntry: StatusHistory | undefined;

        if (newStatus !== lastStatus) {
            newStatusHistoryEntry = {
                time: result.lastChecked,
                status: newStatus,
                latency: result.latency,
                reason: result.httpResponse,
            };
        }
        
        updateWebsite(website.id, { ...result, newStatusHistoryEntry });

    } catch (error) {
        console.error(`Failed to check status for ${website.url}`, error);
        updateWebsite(website.id, { status: 'Down', httpResponse: 'Failed to check status.' });
    }
  }, [updateWebsite]);


  const schedulePoll = useCallback((website: Website) => {
      if (timeoutsRef.current.has(website.id)) {
          clearTimeout(timeoutsRef.current.get(website.id));
          timeoutsRef.current.delete(website.id);
      }

      if (website.isPaused) return;

      const interval = (website.pollingInterval || pollingInterval) * 1000;
      
      const run = async () => {
          // Find the latest state of the website before polling
          let currentWebsite: Website | undefined;
          setWebsites(prev => {
              currentWebsite = prev.find(w => w.id === website.id);
              return prev;
          });

          if (currentWebsite) {
              await pollWebsite(currentWebsite);
          }
          
          const timeoutId = setTimeout(run, interval);
          timeoutsRef.current.set(website.id, timeoutId);
      };

      // Stagger initial checks to avoid overwhelming the server
      const initialDelay = Math.random() * 5000; // 0-5 seconds
      const initialTimeoutId = setTimeout(run, initialDelay);
      timeoutsRef.current.set(website.id, initialTimeoutId);

  }, [pollWebsite, pollingInterval]);

  useEffect(() => {
      websites.forEach(site => {
        if (!site.isPaused) {
            schedulePoll(site);
        }
      });
      return () => {
          timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
          timeoutsRef.current.clear();
      };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount to initialize all polls

  const handleAddWebsite = useCallback((data: WebsiteFormData) => {
    if (websites.some(site => site.url === data.url && site.port === data.port)) {
      toast({
        title: 'Duplicate Service',
        description: 'This service is already being monitored.',
        variant: 'destructive',
      });
      return;
    }

    const newWebsite: Website = {
      id: crypto.randomUUID(),
      ...data,
      status: 'Idle',
      latencyHistory: [],
      statusHistory: [],
      uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null },
      displayOrder: websites.length > 0 ? Math.max(...websites.map(w => w.displayOrder)) + 1 : 0,
      isLoading: true,
    };
    setWebsites(prev => [...prev, newWebsite]);
    schedulePoll(newWebsite);
  }, [websites, toast, schedulePoll]);

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
    const siteToEdit = websites.find(w => w.id === id);
    if (!siteToEdit) return;

    if (timeoutsRef.current.has(id)) {
        clearTimeout(timeoutsRef.current.get(id)!);
        timeoutsRef.current.delete(id);
    }
    
    const updatedSite: Website = {
      ...siteToEdit,
      ...data,
      status: 'Idle',
      latencyHistory: [],
      statusHistory: [],
      uptimeData: { '1h': null, '24h': null, '30d': null, 'total': null },
      isLoading: true,
      lastDownTime: undefined,
      diagnosis: undefined,
      latency: undefined,
      averageLatency: undefined,
      lowestLatency: undefined,
      highestLatency: undefined,
    };

    setWebsites(prev => prev.map(s => s.id === id ? updatedSite : s));
    schedulePoll(updatedSite);
    
    toast({
        title: "Service Updated",
        description: `${data.name} has been updated successfully.`
    });
  };

  const handleDiagnose = useCallback(async (id: string) => {
    const website = websites.find(site => site.id === id);
    if (!website || !website.httpResponse) return;

    try {
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
        websites.forEach(site => {
            if (!site.pollingInterval) { // Reschedule only sites using global interval
                schedulePoll(site);
            }
        });
        toast({
            title: 'Settings Saved',
            description: `Global monitoring interval updated to ${tempPollingInterval} seconds.`,
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
    const site = websites.find(s => s.id === id);
    if (!site) return;

    const isNowPaused = !site.isPaused;
    
    if (isNowPaused) {
        if (timeoutsRef.current.has(id)) {
            clearTimeout(timeoutsRef.current.get(id)!);
            timeoutsRef.current.delete(id);
        }
        setWebsites(prev => prev.map(s => s.id === id ? { ...s, isPaused: true, status: 'Paused' } : s));
    } else {
        const unpausedSite = { ...site, isPaused: false, status: 'Idle', isLoading: true };
        setWebsites(prev => prev.map(s => s.id === id ? unpausedSite : s));
        schedulePoll(unpausedSite);
    }
  }, [websites, schedulePoll]);

  const sortedWebsites = useMemo(() => {
    return [...websites].sort((a, b) => {
      if (a.isPaused && !b.isPaused) return 1;
      if (!a.isPaused && b.isPaused) return -1;
      return a.displayOrder - b.displayOrder;
    });
  }, [websites]);

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
                websites={sortedWebsites}
                onDelete={(id) => setDeletingWebsite(websites.find(w => w.id === id) || null)}
                onDiagnose={handleDiagnose}
                onEdit={(id) => setEditingWebsite(websites.find(w => w.id === id) || null)}
                onMove={moveWebsite}
                onTogglePause={handleTogglePause}
                onShowHistory={(id) => setHistoryWebsite(websites.find(w => w.id === id) || null)}
              />
            ) : (
              <WebsiteListView
                websites={sortedWebsites}
                onDelete={(id) => setDeletingWebsite(websites.find(w => w.id === id) || null)}
                onDiagnose={handleDiagnose}
                onEdit={(id) => setEditingWebsite(websites.find(w => w.id === id) || null)}
                onMove={moveWebsite}
                onTogglePause={handleTogglePause}
                onShowHistory={(id) => setHistoryWebsite(websites.find(w => w.id === id) || null)}
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
            <Accordion type="single" collapsible className="w-full md:col-span-1">
                <AccordionItem value="add-service">
                    <AccordionTrigger>Add Service</AccordionTrigger>
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
                    <AccordionTrigger>Settings</AccordionTrigger>
                    <AccordionContent>
                        <Card>
                            <CardHeader>
                            <CardTitle>Settings</CardTitle>
                            <CardDescription>Customize the monitoring settings.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <div className='w-full sm:w-auto'>
                                        <Label htmlFor="polling-interval" className="mb-2 block">Global Monitoring Interval (seconds)</Label>
                                        <Input
                                        id="polling-interval"
                                        type="number"
                                        value={tempPollingInterval}
                                        onChange={(e) => setTempPollingInterval(Number(e.target.value))}
                                        placeholder="e.g. 30"
                                        className="w-full sm:w-48"
                                        />
                                    </div>
                                    <Button onClick={handleIntervalChange} className="w-full sm:w-auto self-end">Save Settings</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <Accordion type="single" collapsible className="w-full md:col-span-1">
                <AccordionItem value="report-generator">
                    <AccordionTrigger>Generate Report</AccordionTrigger>
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

    

    