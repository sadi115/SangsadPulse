'use client';

import { useState, useMemo } from 'react';
import type { Website, WebsiteStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2, Wand2, Pencil, ArrowUp, ArrowDown, PauseCircle, PlayCircle, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { WebsiteCardDetails } from './website-card-details';
import { Card } from './ui/card';
import { formatDistanceToNow } from 'date-fns';

type StatusDisplayProps = {
  status: WebsiteStatus;
  uptimePercentage?: number;
};

const StatusBadge = ({ status, uptimePercentage }: StatusDisplayProps) => {
  const statusInfo = {
    Up: { text: 'Up', variant: 'success' as const, className: 'bg-green-500/10 text-green-500 border-green-500/20' },
    Down: { text: 'Down', variant: 'destructive' as const, className: 'bg-red-500/10 text-red-500 border-red-500/20' },
    Checking: { text: 'Checking', variant: 'secondary' as const, className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    Idle: { text: 'Idle', variant: 'secondary' as const, className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
    Paused: { text: 'Paused', variant: 'outline' as const, className: 'text-muted-foreground' },
  };

  const current = statusInfo[status];
  const uptimeText = status === 'Up' || status === 'Down' ? `${uptimePercentage?.toFixed(0) ?? '100'}%` : current.text;

  return (
    <div className={`flex items-center justify-center w-24 text-sm font-semibold px-2.5 py-0.5 rounded-full border ${current.className}`}>
      {current.text === 'Checking' && <div className="h-2 w-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>}
      {current.text === 'Up' && <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>}
      {current.text === 'Down' && <div className="h-2 w-2 bg-red-500 rounded-full mr-2"></div>}
      {current.text === 'Paused' && <div className="h-2 w-2 bg-gray-500 rounded-full mr-2"></div>}
      {current.text === 'Idle' && <div className="h-2 w-2 bg-gray-400 rounded-full mr-2"></div>}
      <span>{uptimeText}</span>
    </div>
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
              <div className={`w-1.5 h-10 rounded-full ${statusColor} transition-colors`}></div>
              <div className="flex-1 grid grid-cols-4 items-center gap-4">
                <div className="col-span-2 md:col-span-1 flex flex-col">
                    <span className="font-semibold truncate text-foreground text-base" title={website.name}>{website.name}</span>
                    <span className="text-xs text-muted-foreground truncate" title={website.url}>{website.url}</span>
                </div>
                 <div className="hidden md:flex col-span-1 items-center gap-3">
                    <StatusBadge status={website.status} uptimePercentage={website.uptimePercentage} />
                 </div>
                 <div className="hidden md:flex col-span-1 flex-col text-right">
                    <span className="font-medium text-muted-foreground text-sm">
                        {website.latency !== undefined ? `${website.latency} ms` : ''}
                    </span>
                     {website.lastDownTime && (
                       <span className="text-xs text-muted-foreground">
                        Down {formatDistanceToNow(new Date(website.lastDownTime), { addSuffix: true })}
                       </span>
                     )}
                </div>
                 <div className="col-span-2 md:col-span-1 flex items-center justify-end gap-2">
                    <div className="md:hidden flex items-center gap-3">
                        <StatusBadge status={website.status} uptimePercentage={website.uptimePercentage} />
                    </div>
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
          </div>
          <CollapsibleContent>
            <WebsiteCardDetails website={website} />
          </CollapsibleContent>
        </Card>
    </Collapsible>
  );
}
