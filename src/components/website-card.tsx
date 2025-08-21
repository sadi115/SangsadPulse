'use client';

import { useState, useEffect } from 'react';
import type { Website, WebsiteStatus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { CheckCircle2, AlertTriangle, Hourglass, MoreVertical, Trash2, Wand2, Loader2, Link as LinkIcon, Clock, AlertCircle, Pencil, ArrowUp, ArrowDown, Hash, Search, PauseCircle, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';
import { LatencyChart } from './latency-chart';

type StatusDisplayProps = {
  status: WebsiteStatus;
};

const StatusDisplay = ({ status }: StatusDisplayProps) => {
  const statusInfo = {
    Up: { icon: <CheckCircle2 className="h-5 w-5" />, text: 'Up', color: 'text-green-500', barColor: 'bg-green-500' },
    Down: { icon: <AlertTriangle className="h-5 w-5" />, text: 'Down', color: 'text-red-500', barColor: 'bg-red-500' },
    Checking: { icon: <Loader2 className="h-5 w-5 animate-spin" />, text: 'Checking...', color: 'text-yellow-500', barColor: 'bg-yellow-500' },
    Idle: { icon: <Hourglass className="h-5 w-5" />, text: 'Idle', color: 'text-muted-foreground', barColor: 'bg-muted' },
    Paused: { icon: <PauseCircle className="h-5 w-5" />, text: 'Paused', color: 'text-muted-foreground', barColor: 'bg-muted' },
  };

  const current = statusInfo[status];

  return (
    <div className="flex flex-col gap-2">
      <div className={`flex items-center gap-2 font-semibold ${current.color}`}>
        {current.icon}
        <span className="text-lg">{current.text}</span>
      </div>
      <div className="w-full bg-secondary rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${current.barColor} ${status === 'Checking' ? 'animate-pulse' : ''}`} style={{ width: status === 'Idle' || status === 'Paused' ? '0%' : '100%' }}></div>
      </div>
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
  const [lastCheckedTime, setLastCheckedTime] = useState('');
  const [lastDownTime, setLastDownTime] = useState('');

  useEffect(() => {
    if (website.lastChecked) {
      setLastCheckedTime(format(new Date(website.lastChecked), 'hh:mm:ss a'));
    }
    if (website.lastDownTime) {
      setLastDownTime(format(new Date(website.lastDownTime), 'hh:mm:ss a'));
    }
  }, [website.lastChecked, website.lastDownTime]);


  const getStatusBorderColor = (status: WebsiteStatus) => {
    switch (status) {
      case 'Up': return 'border-green-500';
      case 'Down': return 'border-red-500';
      case 'Checking': return 'border-yellow-500';
      case 'Paused': return 'border-gray-500';
      default: return 'border-transparent';
    }
  }
  
  const hasContentForFooter = website.diagnosis || (website.latencyHistory && website.latencyHistory.length > 0);

  return (
    <Card className={`flex flex-col transition-all duration-300 ease-in-out border-l-4 ${getStatusBorderColor(website.status)}`}>
      <CardHeader className="flex-row items-start gap-4 space-y-0 pb-4">
        <div className="flex-1">
          <CardTitle className="text-xl font-semibold break-all">
            {website.name}
          </CardTitle>
          <CardDescription className="break-all text-xs">
            <a href={website.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-2 text-muted-foreground">
                <LinkIcon className="h-3 w-3" />
                {website.url}
            </a>
          </CardDescription>
          <div className="text-xs text-muted-foreground flex items-center gap-4 mt-1">
             {website.monitorType === 'TCP Port' && website.port && (
              <div className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                <span>Port: {website.port}</span>
              </div>
            )}
             {website.monitorType === 'HTTP(s) - Keyword' && website.keyword && (
              <div className="flex items-center gap-1">
                <Search className="h-3 w-3" />
                <span>Keyword: {website.keyword}</span>
              </div>
            )}
          </div>
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
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <StatusDisplay status={website.status} />
        
        <div className="space-y-2 text-xs text-muted-foreground pt-2">
            <div className="flex items-center justify-between">
                <span>{website.httpResponse ? `Response: ${website.httpResponse}`: 'No response yet'}</span>
                {website.latency !== undefined && <span>{website.latency} ms</span>}
            </div>
            {website.lastChecked && (
                 <div className="flex items-center gap-2" title={format(new Date(website.lastChecked), 'PPpp')}>
                    <Clock className="h-3 w-3" />
                    <span>Last checked: {lastCheckedTime}</span>
                 </div>
            )}
             {website.lastDownTime && (
                <div className="flex items-center gap-2 text-red-500/90" title={format(new Date(website.lastDownTime), 'PPpp')}>
                    <AlertCircle className="h-3 w-3" />
                    <span>Last down: {lastDownTime}</span>
                </div>
            )}
        </div>
      </CardContent>
       <CardFooter className="flex-col items-start pt-4">
           {website.latencyHistory && website.latencyHistory.length > 0 && (
             <div className="w-full">
                 <p className="text-sm font-semibold mb-2">Latency (ms)</p>
                 <div className="h-24 w-full">
                    <LatencyChart data={website.latencyHistory} />
                 </div>
             </div>
           )}
           {website.diagnosis && (
            <div className="flex items-start gap-3 mt-4 text-sm">
              <Wand2 className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
              <p className="text-muted-foreground">{website.diagnosis}</p>
            </div>
           )}
        </CardFooter>
    </Card>
  );
}
