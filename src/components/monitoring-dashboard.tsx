

'use client';

import { useState, useMemo } from 'react';
import type { Website, WebsiteFormData, MonitorLocation } from '@/lib/types';
import { AddWebsiteForm } from '@/components/add-website-form';
import { SummaryOverview } from '@/components/summary-overview';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EditWebsiteDialog } from '@/components/edit-website-dialog';
import { ReportGenerator } from '@/components/report-generator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LayoutGrid, List, Bell, Search, Server, Laptop } from 'lucide-react';
import { WebsiteCardView, CardSkeleton } from '@/components/website-card-view';
import { WebsiteListView, ListSkeleton } from '@/components/website-list-view';
import Image from 'next/image';
import { HistoryDialog } from './history-dialog';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useWebsiteMonitoring } from '@/hooks/use-website-monitoring';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

export default function MonitoringDashboard() {
  const {
    websites,
    isLoading,
    pollingInterval,
    setPollingInterval,
    monitorLocation,
    setMonitorLocation,
    addWebsite,
    editWebsite,
    deleteWebsite,
    clearHistory,
    moveWebsite,
    togglePause,
    manualCheck,
    notificationsEnabled,
    handleNotificationToggle
  } = useWebsiteMonitoring();

  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null);
  const [historyWebsite, setHistoryWebsite] = useState<Website | null>(null);
  const [deletingWebsite, setDeletingWebsite] = useState<Website | null>(null);
  const [view, setView] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const handleEditWebsite = async (id: string, data: WebsiteFormData) => {
    editWebsite(id, data);
    toast({ title: "Service Updated", description: `${data.name} has been updated.` });
  };
  
  const handleAddWebsite = async (data: WebsiteFormData) => {
    addWebsite(data);
    toast({ title: "Service Added", description: `${data.name} has been added.` });
  };
  
  const handleDeleteWebsite = async (id: string) => {
    const siteName = websites.find(w => w.id === id)?.name || 'Service';
    deleteWebsite(id);
    toast({ title: "Service Removed", description: `"${siteName}" has been removed.` });
  };
  
  const handleClearHistory = (id: string) => {
    const siteName = websites.find(w => w.id === id)?.name || 'Service';
    clearHistory(id);
    toast({ title: "History Cleared", description: `The history for "${siteName}" has been cleared.` });
  };


  const handleIntervalChange = () => {
    if (pollingInterval > 0) {
      setPollingInterval(pollingInterval);
      toast({ title: 'Settings Saved', description: `Global interval updated to ${pollingInterval} seconds.` });
    } else {
      toast({ title: 'Invalid Interval', description: 'Interval must be > 0.', variant: 'destructive' });
    }
  };
  
  const sortedAndFilteredWebsites = useMemo(() => {
    let sortableItems = [...websites].filter(site =>
        site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.url.toLowerCase().includes(searchTerm.toLowerCase())
    );

    sortableItems.sort((a, b) => {
      return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    });

    return sortableItems;
  }, [websites, searchTerm]);

  const renderContent = () => {
    if (isLoading) {
      if (view === 'card') {
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        )
      }
      return (
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => <ListSkeleton key={i} />)}
          </CardContent>
        </Card>
      );
    }

    if (sortedAndFilteredWebsites.length === 0) {
      return (
        <div className="text-center py-16 px-4 border-2 border-dashed rounded-lg">
          <div className="mx-auto h-24 w-24 relative">
            <Image src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Emblem_of_the_Jatiya_Sangsad.svg/500px-Emblem_of_the_Jatiya_Sangsad.svg.png" alt="Empty list illustration" layout="fill" objectFit="contain" data-ai-hint="magnifying glass analytics" />
          </div>
          <h2 className="mt-6 text-xl font-medium text-foreground">
            {searchTerm ? 'No services found' : 'No websites yet'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchTerm ? 'Try a different search term.' : 'Add a website using the form below to start monitoring.'}
          </p>
        </div>
      );
    }

    return view === 'card' ? (
      <WebsiteCardView
        websites={sortedAndFilteredWebsites}
        onDelete={(id) => setDeletingWebsite(websites.find(w => w.id === id) || null)}
        onEdit={(id) => setEditingWebsite(websites.find(w => w.id === id) || null)}
        onMove={moveWebsite}
        onTogglePause={togglePause}
        onShowHistory={(id) => setHistoryWebsite(websites.find(w => w.id === id) || null)}
        onClearHistory={handleClearHistory}
        onManualCheck={manualCheck}
        monitorLocation={monitorLocation}
      />
    ) : (
      <WebsiteListView
        websites={sortedAndFilteredWebsites}
        onDelete={(id) => setDeletingWebsite(websites.find(w => w.id === id) || null)}
        onEdit={(id) => setEditingWebsite(websites.find(w => w.id === id) || null)}
        onMove={moveWebsite}
        onTogglePause={togglePause}
        onShowHistory={(id) => setHistoryWebsite(websites.find(w => w.id === id) || null)}
        onClearHistory={handleClearHistory}
        onManualCheck={manualCheck}
      />
    );
  };


  return (
    <>
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        <SummaryOverview websites={websites} isLoading={isLoading} />
        
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

          {renderContent()}
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
                              <AddWebsiteForm onAddWebsite={handleAddWebsite} globalPollingInterval={pollingInterval} monitorLocation={monitorLocation}/>
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
                                  <Label>Network Type</Label>
                                  <RadioGroup
                                    onValueChange={(value) => setMonitorLocation(value as MonitorLocation)}
                                    value={monitorLocation}
                                    className="flex space-x-4 pt-1"
                                    >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="cloud" id="loc-cloud" />
                                        <Label htmlFor="loc-cloud" className="font-normal flex items-center gap-2"><Server className="h-4 w-4" /> Cloud Network</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="local" id="loc-local" />
                                        <Label htmlFor="loc-local" className="font-normal flex items-center gap-2"><Laptop className="h-4 w-4" /> Local Network</Label>
                                    </div>
                                    </RadioGroup>
                              </div>
                              <div className="space-y-2">
                                  <Label htmlFor="polling-interval">Global Monitoring Interval (seconds)</Label>
                                  <div className="flex items-center gap-2">
                                      <Input
                                          id="polling-interval"
                                          type="number"
                                          min="1"
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
          monitorLocation={monitorLocation}
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
    </>
  );
}
