
'use client';

import type { Website } from '@/lib/types';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { WebsiteListItem } from './website-list-item';
import { Skeleton } from './ui/skeleton';

type WebsiteListViewProps = {
  websites: Website[];
  onDelete: (id: string) => void;
  onDiagnose: (id: string) => void;
  onEdit: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onTogglePause: (id: string) => void;
  onShowHistory: (id: string) => void;
  onManualCheck: (id: string) => void;
};

const ListSkeleton = () => (
    <div className="p-4">
        <div className="flex items-center gap-4">
            <Skeleton className="w-2 h-8 rounded-full" />
            <div className="flex-1 grid grid-cols-12 items-center gap-4">
                <div className="col-span-4 flex items-center gap-3">
                    <Skeleton className="w-24 h-6 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <div className="col-span-4 flex items-center justify-end h-6 gap-px">
                     {Array.from({ length: 50 }).map((_, index) => (
                         <Skeleton key={index} className="w-1.5 h-full rounded-sm" />
                     ))}
                </div>
                 <div className="col-span-2 text-right">
                    <Skeleton className="h-4 w-12 ml-auto" />
                </div>
                <div className="col-span-1 text-right">
                    <Skeleton className="h-4 w-16 ml-auto" />
                </div>
                 <div className="col-span-1 flex items-center justify-end gap-2">
                     <Skeleton className="h-8 w-8 rounded-md" />
                 </div>
            </div>
        </div>
    </div>
)

export function WebsiteListView({ websites, onDelete, onDiagnose, onEdit, onMove, onTogglePause, onShowHistory, onManualCheck }: WebsiteListViewProps) {
  if (websites.length === 0) {
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

  const nonPausedWebsites = websites.filter(w => !w.isPaused);
  const nonPausedCount = nonPausedWebsites.length;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="hidden md:flex items-center p-4 gap-4 border-b text-xs font-semibold text-muted-foreground">
            <div className="w-2 h-8"></div>
            <div className="flex-1 grid grid-cols-12 items-center gap-4">
                <div className="col-span-4">SERVICE</div>
                <div className="col-span-4 text-center">UPTIME</div>
                <div className="col-span-2 text-right">LATENCY</div>
                <div className="col-span-1 text-right">LAST CHECK</div>
                <div className="col-span-1 text-right">ACTIONS</div>
            </div>
        </div>
        <div className="divide-y divide-border">
            {websites.map((website) => {
                 if (website.isLoading) {
                    return <ListSkeleton key={website.id} />;
                 }
                const nonPausedIndex = !website.isPaused 
                    ? nonPausedWebsites.findIndex(w => w.id === website.id) 
                    : -1;
                
                const isFirst = nonPausedIndex === 0;
                const isLast = nonPausedIndex === nonPausedCount - 1;

                return (
                    <WebsiteListItem
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
      </CardContent>
    </Card>
  );
}
