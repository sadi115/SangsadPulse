'use client';

import type { Website } from '@/lib/types';
import { WebsiteCard } from './website-card';
import Image from 'next/image';

type WebsiteListProps = {
  websites: Website[];
  onDelete: (id: string) => void;
  onDiagnose: (id: string) => void;
  onEdit: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onTogglePause: (id: string) => void;
};

export function WebsiteList({ websites, onDelete, onDiagnose, onEdit, onMove, onTogglePause }: WebsiteListProps) {
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

  const nonPausedCount = websites.filter(w => !w.isPaused).length;

  return (
    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {websites.map((website, index) => {
        const nonPausedIndex = websites.slice(0, index + 1).filter(w => !w.isPaused).length -1;
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
            isFirst={isFirst}
            isLast={isLast}
            />
        )
      })}
    </div>
  );
}
