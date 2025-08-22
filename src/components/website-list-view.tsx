'use client';

import type { Website } from '@/lib/types';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { WebsiteListItem } from './website-list-item';

type WebsiteListViewProps = {
  websites: Website[];
  onDelete: (id: string) => void;
  onDiagnose: (id: string) => void;
  onEdit: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onTogglePause: (id: string) => void;
  onShowHistory: (id: string) => void;
};

export function WebsiteListView({ websites, onDelete, onDiagnose, onEdit, onMove, onTogglePause, onShowHistory }: WebsiteListViewProps) {
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
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
            {websites.map((website, index) => {
                const nonPausedIndex = websites.slice(0, index + 1).filter(w => !w.isPaused).length -1;
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
