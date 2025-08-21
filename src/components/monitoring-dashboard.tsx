
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Website, MonitorType } from '@/lib/types';
import { AddWebsiteForm } from './add-website-form';
import { checkStatus, getAIDiagnosis } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { SummaryOverview } from './summary-overview';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from './ui/button';
import { EditWebsiteDialog } from './edit-website-dialog';
import { ReportGenerator } from './report-generator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LayoutGrid, List } from 'lucide-react';
import { WebsiteCardView } from './website-card-view';
import { WebsiteListView } from './website-list-view';

const initialWebsites: Omit<Website, 'displayOrder'>[] = [
  { id: '1', name: 'Parliament Website', url: 'https://www.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [] },
  { id: '2', name: 'PRP Parliament', url: 'https://prp.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [] },
  { id: '3', name: 'QAMS Parliament', url: 'https://qams.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [] },
  { id: '4', name: 'CMIS Parliament', url: 'https://cmis.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [] },
  { id: '5', name: 'Debate Parliament', url: 'https://debate.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [] },
  { id: '6', name: 'DRM Parliament', url: 'https://drm.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [] },
  { id: '7', name: 'eBilling Parliament', url: 'https://ebilling.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [] },
  { id: '8', name: 'Sitting Parliament', url: 'https://sitting.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [] },
  { id: '9', name: 'eBook Parliament', url: 'https://ebook.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [] },
  { id: '10', name: 'Broadcast Parliament', url: 'https://broadcast.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [] },
  { id: '11', name: 'Library Parliament', url: 'https://library.parliament.gov.bd', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [] },
  { id: '12', name: 'Google', url: 'https://www.google.com', status: 'Idle', monitorType: 'TCP Port', port: 443, latencyHistory: [] },
];

const MAX_LATENCY_HISTORY = 50;

type WebsiteFormData = {
    name: string;
    url: string;
    monitorType: MonitorType;
    port?: number;
    keyword?: string;
}

export function MonitoringDashboard() {
  const [websites, setWebsites] = useState<Website[]>(() => 
    initialWebsites.map((site, index) => ({ ...site, displayOrder: index }))
  );
  const [pollingInterval, setPollingInterval] = useState(30);
  const [tempPollingInterval, setTempPollingInterval] = useState(30);
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null);
  const [view, setView] = useState<'card' | 'list'>('card');


  const { toast } = useToast();
  const websitesRef = useRef(websites);
  useEffect(() => {
    websitesRef.current = websites;
  }, [websites]);

  const updateWebsite = useCallback((id: string, updates: Partial<Website>) => {
    setWebsites(prev =>
      prev.map(site => {
        if (site.id === id) {
          const newHistory = [
            ...(site.latencyHistory || []),
            ...(updates.latency !== undefined ? [{ time: new Date().toISOString(), latency: updates.latency }] : []),
          ].slice(-MAX_LATENCY_HISTORY);
          
          let averageLatency;
          let uptimePercentage;
          if (newHistory.length > 0) {
            const upHistory = newHistory.filter(h => h.latency > 0);
            if(upHistory.length > 0) {
              const totalLatency = upHistory.reduce((acc, curr) => acc + curr.latency, 0);
              averageLatency = Math.round(totalLatency / upHistory.length);
            }
            uptimePercentage = (upHistory.length / newHistory.length) * 100;
          }

          const newSite = { ...site, ...updates, latencyHistory: newHistory, averageLatency, uptimePercentage };
          
          if (updates.status === 'Down' && site.status !== 'Down') {
            newSite.lastDownTime = new Date().toISOString();
          }

          return newSite;
        }
        return site;
      })
    );
  }, []);

  const pollWebsites = useCallback(async (sites: Website[]) => {
    if (sites.length === 0) return;
  
    const checks = sites.map(async website => {
      if (website.status === 'Checking' || website.isPaused) return;
      
      updateWebsite(website.id, { status: 'Checking' });
      try {
        const result = await checkStatus(website);
        updateWebsite(website.id, result);
      } catch (error) {
        console.error(`Failed to check status for ${website.url}`, error);
        updateWebsite(website.id, { status: 'Down', httpResponse: 'Failed to check status.' });
      }
    });
  
    await Promise.all(checks);
  }, [updateWebsite]);

  useEffect(() => {
    pollWebsites(websitesRef.current.filter(w => w.status === 'Idle' && !w.isPaused));
    
    const intervalId = setInterval(() => pollWebsites(websitesRef.current.filter(w => !w.isPaused)), pollingInterval * 1000);

    return () => clearInterval(intervalId);
  }, [pollingInterval, pollWebsites]);


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
      displayOrder: websites.length > 0 ? Math.max(...websites.map(w => w.displayOrder)) + 1 : 0,
    };
    const newWebsites = [...websites, newWebsite];
    setWebsites(newWebsites);
    pollWebsites([newWebsite]);
  }, [websites, toast, pollWebsites]);

  const handleDeleteWebsite = useCallback((id: string) => {
    setWebsites(prev => prev.filter(site => site.id !== id));
  }, []);
  
  const handleEditWebsite = (id: string, data: WebsiteFormData) => {
    setWebsites(prev =>
      prev.map(site =>
        site.id === id
          ? { ...site, ...data }
          : site
      )
    );
    toast({
        title: "Service Updated",
        description: `${data.name} has been updated successfully.`
    })
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
        toast({
            title: 'Settings Saved',
            description: `Monitoring interval updated to ${tempPollingInterval} seconds.`,
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
    setWebsites(prev =>
      prev.map(site => {
        if (site.id === id) {
          const isPaused = !site.isPaused;
          return {
            ...site,
            isPaused,
            status: isPaused ? 'Paused' : 'Idle',
          };
        }
        return site;
      })
    );
  }, []);

  const sortedWebsites = useMemo(() => {
    return [...websites].sort((a, b) => {
      if (a.isPaused && !b.isPaused) return 1;
      if (!a.isPaused && b.isPaused) return -1;
      return a.displayOrder - b.displayOrder;
    });
  }, [websites]);

  return (
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
            onDelete={handleDeleteWebsite}
            onDiagnose={handleDiagnose}
            onEdit={(id) => setEditingWebsite(websites.find(w => w.id === id) || null)}
            onMove={moveWebsite}
            onTogglePause={handleTogglePause}
          />
        ) : (
          <WebsiteListView
            websites={sortedWebsites}
            onDelete={handleDeleteWebsite}
            onDiagnose={handleDiagnose}
            onEdit={(id) => setEditingWebsite(websites.find(w => w.id === id) || null)}
            onMove={moveWebsite}
            onTogglePause={handleTogglePause}
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
                            <AddWebsiteForm onAddWebsite={handleAddWebsite} />
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
                                    <Label htmlFor="polling-interval" className="mb-2 block">Monitoring Interval (seconds)</Label>
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
                        </Header>
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
      />
    </div>
  );
}

    