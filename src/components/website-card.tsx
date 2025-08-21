'use client';

import { useState, useMemo } from 'react';
import type { Website, WebsiteStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2, Wand2, Pencil, ArrowUp, ArrowDown, PauseCircle, PlayCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { UptimeBar } from './uptime-bar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { WebsiteCardDetails } from './website-card-details';
import { Card } from './ui/card';

type StatusDisplayProps = {
  status: WebsiteStatus;
  uptimePercentage?: number;
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
      {status === 'Up' || status === 'Down' ? `${uptimePercentage?.toFixed(0) ?? 100}%` : current.text}
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
    isFirst: boolean;
    isLast: boolean;
};

export function WebsiteCard({ website, onDelete, onDiagnose, onEdit, onMove, onTogglePause, isFirst, isLast }: WebsiteCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  
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
    <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
        <Card className="group transition-all">
          <div className="flex items-center p-4 gap-4">
              <div className={`w-2 h-8 rounded-full ${statusColor} transition-colors`}></div>
              <div className="flex-1 flex items-center gap-4">
                <div className="flex items-center gap-3 w-1/3">
                    <StatusBadge status={website.status} uptimePercentage={website.uptimePercentage} />
                    <span className="font-semibold truncate text-foreground" title={website.name}>{website.name}</span>
                </div>
                 <div className="flex-1">
                    <UptimeBar history={website.latencyHistory} max-items={50} />
                </div>
              </div>
               <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                    {website.latency !== undefined ? `${website.latency} ms` : ''}
                </span>
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </CollapsibleTrigger>
              </div>
          </div>
          <CollapsibleContent>
            <WebsiteCardDetails website={website} />
          </CollapsibleContent>
        </Card>
    </Collapsible>
  );
}
