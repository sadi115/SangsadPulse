'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Website } from '@/lib/types';
import { AddWebsiteForm } from './add-website-form';
import { WebsiteList } from './website-list';
import { checkStatus, getAIDiagnosis } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

const POLLING_INTERVAL = 30000; // 30 seconds

const initialWebsites: Website[] = [
  { id: '1', url: 'https://www.parliament.gov.bd', status: 'Idle' },
  { id: '2', url: 'https://prp.parliament.gov.bd', status: 'Idle' },
  { id: '3', url: 'https://qams.parliament.gov.bd', status: 'Idle' },
  { id: '4', url: 'https://cmis.parliament.gov.bd', status: 'Idle' },
  { id: '5', url: 'https://debate.parliament.gov.bd', status: 'Idle' },
  { id: '6', url: 'https://drm.parliament.gov.bd', status: 'Idle' },
  { id: '7', url: 'https://ebilling.parliament.gov.bd', status: 'Idle' },
  { id: '8', url: 'https://sitting.parliament.gov.bd', status: 'Idle' },
  { id: '9', url: 'https://ebook.parliament.gov.bd', status: 'Idle' },
  { id: '10', url: 'https://broadcast.parliament.gov.bd', status: 'Idle' },
  { id: '11', url: 'https://library.parliament.gov.bd', status: 'Idle' },
  { id: '12', url: 'https://www.google.com', status: 'Idle' },
];

export function MonitoringDashboard() {
  const [websites, setWebsites] = useState<Website[]>(initialWebsites);
  const { toast } = useToast();

  const updateWebsite = useCallback((id: string, updates: Partial<Website>) => {
    setWebsites(prev =>
      prev.map(site => (site.id === id ? { ...site, ...updates } : site))
    );
  }, []);

  useEffect(() => {
    const poll = async () => {
      if (websites.length === 0) return;

      const checks = websites.map(async website => {
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
    };

    poll(); // Initial check
    const intervalId = setInterval(poll, POLLING_INTERVAL);

    return () => clearInterval(intervalId);
  }, [websites, updateWebsite]);


  const handleAddWebsite = useCallback((url: string) => {
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
      url,
      status: 'Idle',
    };
    setWebsites(prev => [...prev, newWebsite]);
  }, [websites, toast]);

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

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <AddWebsiteForm onAddWebsite={handleAddWebsite} />
      <WebsiteList
        websites={websites}
        onDelete={handleDeleteWebsite}
        onDiagnose={handleDiagnose}
      />
    </div>
  );
}
