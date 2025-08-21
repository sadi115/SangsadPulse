'use client';

import { useState } from 'react';
import type { Website, WebsiteStatus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertCircle, CheckCircle2, AlertTriangle, Hourglass, MoreVertical, Trash2, Wand2, Loader2, Link as LinkIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Progress } from './ui/progress';

type WebsiteCardProps = {
  website: Website;
  onDelete: (id: string) => void;
  onDiagnose: (id: string) => void;
};

const StatusDisplay = ({ status }: { status: WebsiteStatus }) => {
  const statusInfo = {
    Up: {
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      text: 'Up',
      textColor: 'text-green-500',
      progress: 100,
      progressColor: 'bg-green-500',
    },
    Down: {
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
      text: 'Down',
      textColor: 'text-red-500',
      progress: 100,
      progressColor: 'bg-red-500',
    },
    Checking: {
      icon: <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />,
      text: 'Checking...',
      textColor: 'text-yellow-500',
      progress: 50,
      progressColor: 'bg-yellow-500 animate-pulse',
    },
    Idle: {
      icon: <Hourglass className="h-5 w-5 text-muted-foreground" />,
      text: 'Idle',
      textColor: 'text-muted-foreground',
      progress: 0,
      progressColor: 'bg-muted',
    },
  };

  const currentStatus = statusInfo[status];

  return (
     <div className="space-y-2">
      <div className={`flex items-center gap-2 font-semibold ${currentStatus.textColor}`}>
        {currentStatus.icon}
        <span className="text-lg">{currentStatus.text}</span>
      </div>
      <Progress value={currentStatus.progress} className="h-2 [&>div]:bg-transparent" />
     </div>
  );
};

export function WebsiteCard({ website, onDelete, onDiagnose }: WebsiteCardProps) {
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const handleDiagnoseClick = async () => {
    setIsDiagnosing(true);
    await onDiagnose(website.id);
    setIsDiagnosing(false);
  };

  const getStatusColor = (status: WebsiteStatus) => {
    switch (status) {
      case 'Up': return 'border-green-500';
      case 'Down': return 'border-red-500';
      case 'Checking': return 'border-yellow-500';
      default: return 'border-border';
    }
  }

  return (
    <Card className={`flex flex-col transition-all duration-300 ease-in-out border-l-4 ${getStatusColor(website.status)}`}>
      <CardHeader className="flex-row items-start gap-4 space-y-0 pb-4">
        <div className="flex-1">
          <CardTitle className="text-lg font-semibold break-all">
            <a href={website.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              {new URL(website.url).hostname}
            </a>
          </CardTitle>
          <CardDescription className="break-all text-xs">{website.url}</CardDescription>
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
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{website.httpResponse ? `Response: ${website.httpResponse}`: 'No response yet'}</span>
          {website.lastChecked && (
            <span>
              {formatDistanceToNow(new Date(website.lastChecked), { addSuffix: true })}
            </span>
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
      {website.diagnosis && (
        <CardFooter>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>AI Diagnosis</AccordionTrigger>
              <AccordionContent className="space-y-4 text-sm">
                   <div className="flex items-start gap-3">
                    <Wand2 className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                    <p className="text-muted-foreground">{website.diagnosis}</p>
                   </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardFooter>
      )}
    </Card>
  );
}
