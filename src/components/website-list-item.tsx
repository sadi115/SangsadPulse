
'use client';

import { useMemo } from 'react';
import type { Website, WebsiteStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2, Pencil, ArrowUp, ArrowDown, PauseCircle, PlayCircle, History, RefreshCw, Eraser } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { UptimeBar } from './uptime-bar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type StatusDisplayProps = {
  status: WebsiteStatus;
  isPaused?: boolean;
  uptimePercentage?: number | null;
};

const StatusBadge = ({ status, isPaused, uptimePercentage }: StatusDisplayProps) => {
  const current = useMemo(() => {
    if (isPaused) {
      return { text: 'Paused', variant: 'outline' as const };
    }
    const statusInfo = {
      Up: { text: 'Up', variant: 'success' as const },
      Down: { text: 'Down', variant: 'destructive' as const },
      Checking: { text: 'Checking', variant: 'secondary' as const },
      Idle: { text: 'Idle', variant: 'secondary' as const },
      Paused: { text: 'Paused', variant: 'outline' as const },
    };
    return statusInfo[status];
  }, [status, isPaused]);


  return (
    <Badge variant={current.variant} className="w-24 justify-center text-sm font-semibold">
      {isPaused ? current.text :
       (status === 'Up' || status === 'Down') && uptimePercentage !== null && uptimePercentage !== undefined 
        ? `${uptimePercentage?.toFixed(0)}%` 
        : current.text}
    </Badge>
  );
};

type WebsiteListItemProps = {
    website: Website;
    onDelete: (id: string) => void;
    onEdit: (id: string) => void;
    onMove: (id: string, direction: 'up' | 'down') => void;
    onTogglePause: (id: string) => void;
    onShowHistory: (id: string) => void;
    onClearHistory: (id: string) => void;
    onManualCheck: (id: string) => void;
    isFirst: boolean;
    isLast: boolean;
};

export function WebsiteListItem({ website, onDelete, onEdit, onMove, onTogglePause, onShowHistory, onClearHistory, onManualCheck, isFirst, isLast }: WebsiteListItemProps) {
  
  const statusColor = useMemo(() => {
    if (website.isPaused) return 'bg-gray-500';
    switch (website.status) {
      case 'Up': return 'bg-green-500';
      case 'Down': return 'bg-red-500';
      case 'Checking': return 'bg-yellow-500 animate-pulse';
      case 'Paused': return 'bg-gray-500';
      default: return 'bg-muted';
    }
  }, [website.status, website.isPaused]);
  
  const lastCheckedTime = website.lastChecked 
    ? format(new Date(website.lastChecked), 'hh:mm:ss a')
    : 'N/A';

  return (
      <div className={cn(
          "group transition-all",
           website.isPaused && "opacity-60 hover:opacity-100"
      )}>
          <div className="flex items-center p-4 gap-4">
              <div className={`w-2 h-8 rounded-full ${statusColor} transition-colors`}></div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 items-center gap-4">
                <div className="md:col-span-4 flex items-center justify-start gap-3">
                    <StatusBadge status={website.status} isPaused={website.isPaused} uptimePercentage={website.uptimeData?.total} />
                    <span className="font-semibold truncate text-foreground" title={website.name}>{website.name}</span>
                </div>
                 <div className="hidden md:block md:col-span-4">
                    <UptimeBar history={website.latencyHistory} max-items={50} />
                </div>
                 <div className="hidden md:block md:col-span-2 text-sm text-muted-foreground font-medium text-center">
                    {website.latency !== undefined ? `${website.latency} ms` : 'N/A'}
                 </div>
                <div className="hidden md:block md:col-span-1 text-sm text-muted-foreground truncate text-left" title={website.lastChecked ? new Date(website.lastChecked).toLocaleString() : ''}>
                    {lastCheckedTime}
                </div>
                <div className="flex items-center justify-end gap-1 ml-auto md:col-span-1">
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                         <DropdownMenuItem onClick={() => onManualCheck(website.id)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Check Now
                         </DropdownMenuItem>
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
                         <DropdownMenuItem onClick={() => onClearHistory(website.id)}>
                          <Eraser className="mr-2 h-4 w-4" />
                          Clear History
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
