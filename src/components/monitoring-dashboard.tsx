'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Website, MonitorType } from '@/lib/types';
import { AddWebsiteForm } from './add-website-form';
import { WebsiteList } from './website-list';
import { checkStatus, getAIDiagnosis } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { SummaryOverview } from './summary-overview';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from './ui/button';

const initialWebsites: Website[] = [
  { id: '1', name: 'Parliament Website', url: 'https://www.parliament.gov.bd', status: 'Idle', monitorType: 'HTTP(s)' },
  { id: '2', name: 'PRP Parliament', url: 'https://prp.parliament.gov.bd', status: 'Idle', monitorType: 'HTTP(s)' },
  { id: '3', name: 'QAMS Parliament', url: 'https://qams.parliament.gov.bd', status: 'Idle', monitorType: 'HTTP(s)' },
  { id: '4', name: 'CMIS Parliament', url: 'https://cmis.parliament.gov.bd', status: 'Idle', monitorType: 'HTTP(s)' },
  { id: '5', name: 'Debate Parliament', url: 'https://debate.parliament.gov.bd', status: 'Idle', monitorType: 'HTTP(s)' },
  { id: '6', name: 'DRM Parliament', url: 'https://drm.parliament.gov.bd', status: 'Idle', monitorType: 'HTTP(s)' },
  { id: '7', name: 'eBilling Parliament', url: 'https://ebilling.parliament.gov.bd', status: 'Idle', monitorType: 'HTTP(s)' },
  { id: '8', name: 'Sitting Parliament', url: 'https://sitting.parliament.gov.bd', status: 'Idle', monitorType: 'HTTP(s)' },
  { id: '9', name: 'eBook Parliament', url: 'https://ebook.parliament.gov.bd', status: 'Idle', monitorType: 'HTTP(s)' },
  { id: '10', name: 'Broadcast Parliament', url: 'https://broadcast.parliament.gov.bd', status: 'Idle', monitorType: 'HTTP(s)' },
  { id: '11', name: 'Library Parliament', url: 'https://library.parliament.gov.bd', status: 'Idle', monitorType: 'HTTP(s)' },
  { id: '12', name: 'Google', url: 'https://www.google.com', status: 'Idle', monitorType: 'HTTP(s)' },
];

export function MonitoringDashboard() {
  const [websites, setWebsites] = useState<Website[]>(initialWebsites);
  const [pollingInterval, setPollingInterval] = useState(30); // in seconds
  const [tempPollingInterval, setTempPollingInterval] = useState(30);
  const { toast } = useToast();
  // Create a ref to hold the websites array for use in the polling interval
  const websitesRef = useRef(websites);
  useEffect(() => {
    websitesRef.current = websites;
  }, [websites]);

  const updateWebsite = useCallback((id: string, updates: Partial<Website>) => {
    setWebsites(prev =>
      prev.map(site => (site.id === id ? { ...site, ...updates } : site))
    );
  }, []);

  const pollWebsites = useCallback(async (sites: Website[]) => {
    if (sites.length === 0) return;
  
    const checks = sites.map(async website => {
      // Don't re-check a site that's already being checked
      if (website.status === 'Checking') return;
      
      updateWebsite(website.id, { status: 'Checking' });
      try {
        const result = await checkStatus(website.url);
        updateWebsite(website.id, result);
      } catch (error) {
        console.error(`Failed to check status for ${website.url}`, error);
        updateWebsite(website.id, { status: 'Down', httpResponse: 'Failed to check status.' });
      }
    });
  
    await Promise.all(checks);
  }, [updateWebsite]);

  useEffect(() => {
    // Initial check
    pollWebsites(websitesRef.current.filter(w => w.status === 'Idle'));
    
    const intervalId = setInterval(() => pollWebsites(websitesRef.current), pollingInterval * 1000);

    return () => clearInterval(intervalId);
  }, [pollingInterval, pollWebsites]);


  const handleAddWebsite = useCallback(({name, url, monitorType}: {name: string, url: string, monitorType: MonitorType}) => {
    // Prevent duplicates
    if (websites.some(site => site.url === url)) {
      toast({
        title: 'Duplicate URL',
        description: 'This website is already being monitored.',
        variant: 'destructive',
      });
      return;
    }

    const newWebsite: Website = {
      id: crypto.randomUUID(),
      name,
      url,
      monitorType,
      status: 'Idle',
    };
    const newWebsites = [...websites, newWebsite];
    setWebsites(newWebsites);
    // Immediately poll the new website
    pollWebsites([newWebsite]);
  }, [websites, toast, pollWebsites]);

  const handleDeleteWebsite = useCallback((id: string) => {
    setWebsites(prev => prev.filter(site => site.id !== id));
  }, []);

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

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <SummaryOverview websites={websites} />
      <AddWebsiteForm onAddWebsite={handleAddWebsite} />
      <WebsiteList
        websites={websites}
        onDelete={handleDeleteWebsite}
        onDiagnose={handleDiagnose}
      />
       <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Customize the monitoring settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Button onClick={handleIntervalChange} className="w-full sm:w-auto mt-0 sm:mt-5">Save Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
