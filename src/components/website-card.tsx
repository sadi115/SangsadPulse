'use client';

import { useState } from 'react';
import type { Website, WebsiteStatus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle2, AlertTriangle, Hourglass, MoreVertical, Trash2, Wand2, Loader2, Link as LinkIcon, BarChart3, Clock } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
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
  };

  const current = statusInfo[status];

  return (
    <div className="flex flex-col gap-2">
      <div className={`flex items-center gap-2 font-semibold ${current.color}`}>
        {current.icon}
        <span className="text-lg">{current.text}</span>
      </div>
      <div className="w-full bg-secondary rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${current.barColor} ${status === 'Checking' ? 'animate-pulse' : ''}`} style={{ width: status === 'Idle' ? '0%' : '100%' }}></div>
      </div>
    </div>
  );
};

type WebsiteCardProps = {
    website: Website;
    onDelete: (id: string) => void;
    onDiagnose: (id: string) => void;
};


export function WebsiteCard({ website, onDelete, onDiagnose }: WebsiteCardProps) {
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const handleDiagnoseClick = async () => {
    setIsDiagnosing(true);
    await onDiagnose(website.id);
    setIsDiagnosing(false);
  };

  const getStatusBorderColor = (status: WebsiteStatus) => {
    switch (status) {
      case 'Up': return 'border-green-500';
      case 'Down': return 'border-red-500';
      case 'Checking': return 'border-yellow-500';
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
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
                    <span>Last checked: {formatDistanceToNow(new Date(website.lastChecked), { addSuffix: true })}</span>
                 </div>
            )}
        </div>
        
         {website.status === 'Down' && (
          <Button onClick={handleDiagnoseClick} disabled={isDiagnosing} variant="destructive" size="sm" className="w-full">
            {isDiagnosing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            {isDiagnosing ? 'Analyzing...' : 'Diagnose with AI'}
          </Button>
        )}
      </CardContent>
      {hasContentForFooter && (
        <CardFooter>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1" className="border-t pt-4">
              <AccordionTrigger>Details</AccordionTrigger>
              <AccordionContent className="space-y-4 text-sm pt-4">
                   {website.diagnosis && (
                    <div className="flex items-start gap-3">
                      <Wand2 className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <p className="text-muted-foreground">{website.diagnosis}</p>
                    </div>
                   )}
                   {website.latencyHistory && website.latencyHistory.length > 0 && (
                     <div className="flex items-start gap-3">
                        <BarChart3 className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                        <div className="w-full">
                             <p className="font-semibold mb-2">Latency (ms)</p>
                             <div className="h-24 w-full">
                                <LatencyChart data={website.latencyHistory} />
                             </div>
                        </div>
                     </div>
                   )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardFooter>
      )}
    </Card>
  );
}
