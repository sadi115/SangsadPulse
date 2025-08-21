'use client';

import { useState } from 'react';
import type { Website, WebsiteStatus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertCircle, CheckCircle2, AlertTriangle, Hourglass, MoreVertical, Trash2, Wand2, Loader2, Link as LinkIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type WebsiteCardProps = {
  website: Website;
  onDelete: (id: string) => void;
  onDiagnose: (id: string) => void;
};

const StatusDisplay = ({ status }: { status: WebsiteStatus }) => {
  const statusInfo = {
    Up: {
      icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      text: 'Up',
      textColor: 'text-green-500',
    },
    Down: {
      icon: <AlertTriangle className="h-4 w-4 text-accent" />,
      text: 'Down',
      textColor: 'text-accent',
    },
    Checking: {
      icon: <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />,
      text: 'Checking...',
      textColor: 'text-yellow-500',
    },
    Idle: {
      icon: <Hourglass className="h-4 w-4 text-muted-foreground" />,
      text: 'Idle',
      textColor: 'text-muted-foreground',
    },
  };

  const currentStatus = statusInfo[status];

  return (
    <div className={`flex items-center gap-2 font-medium ${currentStatus.textColor}`}>
      {currentStatus.icon}
      <span>{currentStatus.text}</span>
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

  return (
    <Card className="flex flex-col">
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
            <DropdownMenuItem onClick={() => onDelete(website.id)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="flex items-center justify-between">
          <StatusDisplay status={website.status} />
          {website.lastChecked && (
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(website.lastChecked), { addSuffix: true })}
            </p>
          )}
        </div>
        {website.status === 'Down' && (
          <Button onClick={handleDiagnoseClick} disabled={isDiagnosing} className="w-full bg-accent hover:bg-accent/90">
            {isDiagnosing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            {isDiagnosing ? 'Analyzing...' : 'Diagnose with AI'}
          </Button>
        )}
      </CardContent>
      {(website.diagnosis || website.httpResponse) && (
        <CardFooter>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>Details</AccordionTrigger>
              <AccordionContent className="space-y-4 text-sm">
                {website.diagnosis && (
                   <div>
                    <h4 className="font-semibold flex items-center gap-2"><Wand2 className="h-4 w-4 text-primary" /> AI Diagnosis</h4>
                    <p className="text-muted-foreground mt-1 pl-6">{website.diagnosis}</p>
                   </div>
                )}
                 {website.httpResponse && (
                   <div>
                    <h4 className="font-semibold flex items-center gap-2"><AlertCircle className="h-4 w-4 text-muted-foreground" /> HTTP Response</h4>
                    <p className="text-muted-foreground mt-1 pl-6 font-mono text-xs">{website.httpResponse}</p>
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
