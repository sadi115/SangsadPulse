'use client';

import { useMemo } from 'react';
import type { Website, WebsiteStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2, Wand2, Pencil, ArrowUp, ArrowDown, PauseCircle, PlayCircle, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WebsiteCardDetails } from './website-card-details';
import { Card } from './ui/card';

type StatusDisplayProps = {
  status: WebsiteStatus;
};

const StatusBadge = ({ status }: StatusDisplayProps) => {
  const statusInfo = {
    Up: { text: 'Up', variant: 'success' as const, className: 'bg-green-500' },
    Down: { text: 'Down', variant: 'destructive' as const, className: 'bg-red-500' },
    Checking: { text: 'Checking', variant: 'secondary' as const, className: 'bg-yellow-500' },
    Idle: { text: 'Idle', variant: 'secondary' as const, className: 'bg-gray-500' },
    Paused: { text: 'Paused', variant: 'outline' as const, className: 'bg-gray-500' },
  };

  const current = statusInfo[status];

  return (
    <Badge variant={current.variant} className="w-24 justify-center text-sm font-semibold">
      {current.text}
    </Badge>
  );
};

type WebsiteCardProps = {
    website: Website;
    onDelete: (id: string) => void;
    onDiagnose: (id: string) => void;
    onEdit: (id: string) => void;
    onMove: (id: string, direction: 'up' | 'down') => void;
    onTogglePause: (id: string) => void;
    onShowHistory: (id: string) => void;
    isFirst: boolean;
    isLast: boolean;
};

export function WebsiteCard({ website, onDelete, onDiagnose, onEdit, onMove, onTogglePause, onShowHistory, isFirst, isLast }: WebsiteCardProps) {
  
  const statusColor = useMemo(() => {
    switch (website.status) {
      case 'Up': return 'bg-green-500';
      case 'Down': return 'bg-red-500';
      case 'Checking': return 'bg-yellow-500 animate-pulse';
      case 'Paused': return 'bg-gray-500';
      default: return 'bg-muted';
    }
  }, [website.status]);

  return (
    <Card className="group transition-all flex flex-col">
      <div className="flex items-center p-4 gap-4">
          <div className={`w-2 h-8 rounded-full ${statusColor} transition-colors`}></div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 items-center gap-4">
              <div className="flex flex-col col-span-2 md:col-span-1">
                  <span className="font-semibold truncate text-foreground" title={website.name}>{website.name}</span>
                  <span className="text-sm text-muted-foreground truncate" title={website.url}>{website.url}</span>
              </div>
              <div className="hidden md:flex justify-center">
                <StatusBadge status={website.status} />
              </div>
              <div className="hidden md:flex justify-center font-medium text-muted-foreground">
                  {website.latency !== undefined ? `${website.latency} ms` : 'N/A'}
              </div>
              <div className="flex items-center justify-end gap-2 col-start-2 md:col-start-4">
                  <div className="md:hidden">
                    <StatusBadge status={website.status} />
                  </div>
                  <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                      <MoreVertical className="h-4 w-4" />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onShowHistory(website.id)}>
                        <History className="mr-2 h-4 w-4" />
                        History
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onTogglePause(website.id)}>
                      {website.isPaused ? <PlayCircle className="mr-2 h-4 w-4" /> : <PauseCircle className="mr-2 h-4 w-4" />}
                      {website.isPaused ? 'Resume' : 'Pause'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(website.id)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onMove(website.id, 'up')} disabled={isFirst || website.isPaused}>
                      <ArrowUp className="mr-2 h-4 w-4" />
                      Move Up
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onMove(website.id, 'down')} disabled={isLast || website.isPaused}>
                      <ArrowDown className="mr-2 h-4 w-4" />
                      Move Down
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onDiagnose(website.id)} disabled={website.status !== 'Down'}>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Diagnose with AI
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onDelete(website.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                      </DropdownMenuItem>
                  </DropdownMenuContent>
                  </DropdownMenu>
              </div>
          </div>
      </div>
      <WebsiteCardDetails website={website} />
    </Card>
  );
}
