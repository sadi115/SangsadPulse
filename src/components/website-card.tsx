
'use client';

import { useMemo } from 'react';
import type { Website, WebsiteStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2, Wand2, Pencil, ArrowUp, ArrowDown, PauseCircle, PlayCircle, History, ChevronDown, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WebsiteCardDetails } from './website-card-details';
import { Card } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { cn } from '@/lib/utils';

type StatusDisplayProps = {
  status: WebsiteStatus;
};

const StatusBadge = ({ status }: StatusDisplayProps) => {
  const current = useMemo(() => {
    const statusInfo = {
      Up: { text: 'Up', variant: 'success' as const, className: '' },
      Down: { text: 'Down', variant: 'destructive' as const, className: '' },
      Checking: { text: 'Checking', variant: 'secondary' as const, className: 'bg-yellow-500 text-yellow-900 dark:bg-yellow-500/20 dark:text-yellow-400' },
      Idle: { text: 'Idle', variant: 'secondary' as const, className: 'bg-gray-500/20 text-gray-500' },
      Paused: { text: 'Paused', variant: 'outline' as const, className: '' },
    };
    return statusInfo[status];
  }, [status]);

  if (!current) {
    return null;
  }

  return (
    <Badge variant={current.variant} className={cn("w-24 justify-center text-sm font-semibold", current.className)}>
      {current.text}
    </Badge>
  );
};


type WebsiteCardProps = {
    website: Website;
    onDelete: (id: string) => void;
    onEdit: (id: string) => void;
    onMove: (id: string, direction: 'up' | 'down') => void;
    onTogglePause: (id: string) => void;
    onShowHistory: (id: string) => void;
    onManualCheck: (id: string) => void;
    isFirst: boolean;
    isLast: boolean;
};

export function WebsiteCard({ website, onDelete, onEdit, onMove, onTogglePause, onShowHistory, onManualCheck, isFirst, isLast }: WebsiteCardProps) {
  
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
    <Card className={cn(
        "group transition-all flex flex-col shadow-md hover:shadow-xl",
        website.isPaused && "opacity-60 hover:opacity-100"
    )}>
      <Collapsible>
        <div className="flex items-center p-4 gap-4">
            <div className={`w-2 h-8 rounded-full ${statusColor} transition-colors`}></div>
            <div className="flex-1 grid grid-cols-[1fr_auto] md:grid-cols-4 items-center gap-4">
                <div className="flex flex-col col-span-1 md:col-span-2">
                    <span className="font-semibold truncate text-foreground" title={website.name}>{website.name}</span>
                    <span className="text-sm text-muted-foreground truncate" title={website.url}>{website.url}</span>
                </div>

                <div className="hidden md:flex justify-center">
                  <StatusBadge status={website.status} />
                </div>
                
                <div className="flex items-center justify-end gap-1">
                     <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground">
                            <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                            <span className="sr-only">Toggle details</span>
                        </Button>
                    </CollapsibleTrigger>
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
        <div className="px-4 pb-2 md:hidden">
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-center">
                    <StatusBadge status={website.status} />
                </div>
                 <div className="flex items-center justify-center font-medium text-muted-foreground">
                    {website.latency !== undefined ? `${website.latency} ms` : 'N/A'}
                </div>
            </div>
        </div>
        <CollapsibleContent>
            <WebsiteCardDetails website={website} />
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
