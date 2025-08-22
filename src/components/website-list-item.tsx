
'use client';

import { useMemo } from 'react';
import type { Website, WebsiteStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2, Wand2, Pencil, ArrowUp, ArrowDown, PauseCircle, PlayCircle, History, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { UptimeBar } from './uptime-bar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

type StatusDisplayProps = {
  status: WebsiteStatus;
  uptimePercentage?: number | null;
};

const StatusBadge = ({ status, uptimePercentage }: StatusDisplayProps) => {
  const statusInfo = {
    Up: { text: 'Up', variant: 'success' as const },
    Down: { text: 'Down', variant: 'destructive' as const },
    Checking: { text: 'Checking', variant: 'secondary' as const },
    Idle: { text: 'Idle', variant: 'secondary' as const },
    Paused: { text: 'Paused', variant: 'outline' as const },
  };

  const current = statusInfo[status];

  return (
    <Badge variant={current.variant} className="w-24 justify-center text-sm font-semibold">
      {(status === 'Up' || status === 'Down') && uptimePercentage !== null && uptimePercentage !== undefined 
        ? `${uptimePercentage?.toFixed(0)}%` 
        : current.text}
    </Badge>
  );
};

type WebsiteListItemProps = {
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

export function WebsiteListItem({ website, onDelete, onDiagnose, onEdit, onMove, onTogglePause, onShowHistory, isFirst, isLast }: WebsiteListItemProps) {
  
  const statusColor = useMemo(() => {
    switch (website.status) {
      case 'Up': return 'bg-green-500';
      case 'Down': return 'bg-red-500';
      case 'Checking': return 'bg-yellow-500 animate-pulse';
      case 'Paused': return 'bg-gray-500';
      default: return 'bg-muted';
    }
  }, [website.status]);
  
  const lastCheckedTimeAgo = website.lastChecked 
    ? formatDistanceToNow(new Date(website.lastChecked), { addSuffix: true })
    : 'N/A';

  return (
      <div className={cn(
          "group transition-all",
           website.isPaused && "opacity-60 hover:opacity-100"
      )}>
          <div className="flex items-center p-4 gap-4">
              <div className={`w-2 h-8 rounded-full ${statusColor} transition-colors`}></div>
              <div className="flex-1 grid grid-cols-12 items-center gap-4">
                <div className="col-span-12 md:col-span-4 flex items-center gap-3">
                    <StatusBadge status={website.status} uptimePercentage={website.uptimeData?.['24h']} />
                    <span className="font-semibold truncate text-foreground" title={website.name}>{website.name}</span>
                </div>
                 <div className="hidden md:block col-span-4">
                    <UptimeBar history={website.latencyHistory} max-items={50} />
                </div>
                 <div className="hidden md:block col-span-2 text-sm text-muted-foreground font-medium">
                    {website.latency !== undefined ? `${website.latency} ms` : 'N/A'}
                 </div>
                <div className="hidden md:block col-span-1 text-sm text-muted-foreground truncate" title={website.lastChecked}>
                    {lastCheckedTimeAgo}
                </div>
                <div className="flex items-center justify-end gap-1 col-span-12 md:col-span-1">
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
      </div>
  );
}
