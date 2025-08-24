

'use client';

import type { Website, MonitorLocation } from '@/lib/types';
import { WebsiteCard } from './website-card';
import Image from 'next/image';
import { Skeleton } from './ui/skeleton';

type WebsiteCardViewProps = {
  websites: Website[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onTogglePause: (id: string) => void;
  onShowHistory: (id: string) => void;
  onClearHistory: (id: string) => void;
  onManualCheck: (id: string) => void;
  monitorLocation: MonitorLocation;
};

export const CardSkeleton = () => (
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

export function WebsiteCardView({ websites, onDelete, onEdit, onMove, onTogglePause, onShowHistory, onClearHistory, onManualCheck, monitorLocation }: WebsiteCardViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
      {websites.map((website, index) => {
        const isFirst = index === 0;
        const isLast = index === websites.length - 1;

        return (
          <WebsiteCard
            key={website.id}
            website={website}
            onDelete={onDelete}
            onEdit={onEdit}
            onMove={onMove}
            onTogglePause={onTogglePause}
            onShowHistory={onShowHistory}
            onClearHistory={onClearHistory}
            onManualCheck={onManualCheck}
            isFirst={isFirst}
            isLast={isLast}
            monitorLocation={monitorLocation}
          />
        );
      })}
    </div>
  );
}
