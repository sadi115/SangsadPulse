
'use client';

import type { Website } from '@/lib/types';
import { WebsiteCard } from './website-card';
import Image from 'next/image';
import { Skeleton } from './ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

type WebsiteCardViewProps = {
  groupedWebsites: Record<string, Website[]>;
  onDelete: (id: string) => void;
  onDiagnose: (id: string) => void;
  onEdit: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onTogglePause: (id: string) => void;
  onShowHistory: (id: string) => void;
  onManualCheck: (id: string) => void;
};

const CardSkeleton = () => (
    <div className="p-4 border rounded-lg shadow-sm bg-card">
        <div className="flex items-center gap-4">
            <Skeleton className="w-2 h-8 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
        </div>
    </div>
);

export function WebsiteCardView({ groupedWebsites, onDelete, onDiagnose, onEdit, onMove, onTogglePause, onShowHistory, onManualCheck }: WebsiteCardViewProps) {
  if (Object.keys(groupedWebsites).length === 0) {
    return (
      <div className="text-center py-16 px-4 border-2 border-dashed rounded-lg">
        <div className="mx-auto h-24 w-24 relative">
             <Image src="https://placehold.co/128x128.png" alt="Empty list illustration" layout="fill" objectFit="contain" data-ai-hint="magnifying glass analytics" />
        </div>
        <h2 className="mt-6 text-xl font-medium text-foreground">No websites yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add a website above to start monitoring its status.
        </p>
      </div>
    );
  }

  const groupOrder = Object.keys(groupedWebsites).sort((a, b) => {
    if (a === 'Ungrouped') return 1;
    if (b === 'Ungrouped') return -1;
    return a.localeCompare(b);
  });

  return (
     <Accordion type="multiple" className="w-full space-y-4" defaultValue={groupOrder}>
      {groupOrder.map(groupName => {
        const websites = groupedWebsites[groupName];
        const nonPausedWebsites = websites.filter(w => !w.isPaused);
        const nonPausedCount = nonPausedWebsites.length;

        return (
          <AccordionItem value={groupName} key={groupName} className="border-none">
            <AccordionTrigger className="text-xl font-bold text-foreground hover:no-underline px-2 py-2 bg-muted rounded-md">
                <div className="flex items-center gap-2">
                    <span>{groupName}</span>
                    <span className="text-sm font-normal text-muted-foreground">({websites.length})</span>
                </div>
            </AccordionTrigger>
            <AccordionContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                    {websites.map((website) => {
                        if (website.isLoading) {
                            return <CardSkeleton key={website.id} />;
                        }
                        
                        const nonPausedIndex = !website.isPaused 
                            ? nonPausedWebsites.findIndex(w => w.id === website.id) 
                            : -1;
                            
                        const isFirst = nonPausedIndex === 0;
                        const isLast = nonPausedIndex === nonPausedCount - 1;

                        return (
                            <WebsiteCard
                            key={website.id}
                            website={website}
                            onDelete={onDelete}
                            onDiagnose={onDiagnose}
                            onEdit={onEdit}
                            onMove={onMove}
                            onTogglePause={onTogglePause}
                            onShowHistory={onShowHistory}
                            onManualCheck={onManualCheck}
                            isFirst={isFirst}
                            isLast={isLast}
                            />
                        )
                    })}
                </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  );
}
