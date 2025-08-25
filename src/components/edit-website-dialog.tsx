

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Globe, Tag, Hash, Search, Timer, Book, PauseCircle, ShieldCheck, ListTree } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MonitorType, Website, WebsiteFormData, MonitorLocation } from '@/lib/types';
import { useEffect } from 'react';

const monitorTypes: { label: string, value: MonitorType, disabledFor?: MonitorLocation[] }[] = [
    { label: "HTTP(s)", value: "HTTP(s)" },
    { label: "TCP Port", value: "TCP Port", disabledFor: ['local', 'agent'] },
    { label: "Ping", value: "Ping", disabledFor: ['local', 'agent'] },
    { label: "HTTP(s) - Keyword", value: "HTTP(s) - Keyword" },
    { label: "DNS Records", value: "DNS Records", disabledFor: ['local', 'agent'] },
    { label: "DNS Lookup", value: "DNS Lookup", disabledFor: ['local', 'agent'] },
    { label: "SSL Certificate", value: "SSL Certificate", disabledFor: ['local', 'agent'] },
    { label: "Downtime", value: "Downtime", disabledFor: ['local', 'agent'] },
];

const allMonitorTypes = monitorTypes.map(m => m.value);

const formSchema = z.object({
  name: z.string().min(1, { message: 'Friendly name is required.' }),
  url: z.string().min(1, { message: 'URL/Host is required.' }),
  monitorType: z.enum(allMonitorTypes as [string, ...string[]]),
  port: z.coerce.number().optional(),
  keyword: z.string().optional(),
  pollingInterval: z.coerce.number().positive({ message: 'Interval must be a positive number.' }).optional(),
});

type EditWebsiteDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  website: Website | null;
  onEditWebsite: (id: string, data: Omit<WebsiteFormData, 'monitorLocation'>) => void;
  globalPollingInterval: number;
  monitorLocation: MonitorLocation;
};

export function EditWebsiteDialog({ isOpen, onOpenChange, website, onEditWebsite, globalPollingInterval, monitorLocation }: EditWebsiteDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const monitorType = form.watch('monitorType');

  useEffect(() => {
    if (website) {
      form.reset({
        name: website.name,
        url: website.url,
        monitorType: website.monitorType,
        port: website.port,
        keyword: website.keyword,
        pollingInterval: website.pollingInterval,
      });
    }
  }, [website, form, isOpen]);


  if (!website) return null;

  function onSubmit(values: z.infer<typeof formSchema>) {
    onEditWebsite(website!.id, values);
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Monitor</DialogTitle>
          <DialogDescription>
            Make changes to your monitored service. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             <FormField
                control={form.control}
                name="monitorType"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Monitor Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a monitor type" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {monitorTypes.map(type => (
                                    <SelectItem key={type.value} value={type.value} disabled={type.disabledFor?.includes(monitorLocation)}>
                                        <div className="flex items-center gap-2">
                                            {type.value === 'HTTP(s)' && <Globe className="h-4 w-4" />}
                                            {type.value === 'HTTP(s) - Keyword' && <Search className="h-4 w-4" />}
                                            {type.value === 'TCP Port' && <Hash className="h-4 w-4" />}
                                            {type.value === 'Ping' && <Timer className="h-4 w-4" />}
                                            {type.value === 'DNS Records' && <Book className="h-4 w-4" />}
                                            {type.value === 'DNS Lookup' && <ListTree className="h-4 w-4" />}
                                            {type.value === 'SSL Certificate' && <ShieldCheck className="h-4 w-4" />}
                                            {type.value === 'Downtime' && <PauseCircle className="h-4 w-4" />}
                                            {type.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
                />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Friendly Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input placeholder="e.g. My Awesome API" {...field} className="pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{monitorType === 'TCP Port' || monitorType === 'Ping' || monitorType === 'DNS Records' || monitorType === 'SSL Certificate' || monitorType === 'DNS Lookup' ? 'Hostname or IP' : 'URL'}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input placeholder="https://example.com" {...field} className="pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             {monitorType === 'TCP Port' && (
                 <FormField
                    control={form.control}
                    name="port"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Port</FormLabel>
                        <FormControl>
                            <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input type="number" placeholder="e.g. 443" {...field} value={field.value ?? ''} className="pl-10" />
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
            )}

             {monitorType === 'HTTP(s) - Keyword' && (
                 <FormField
                    control={form.control}
                    name="keyword"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Keyword</FormLabel>
                        <FormControl>
                            <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input placeholder="e.g. 'verification_code'" {...field} value={field.value ?? ''} className="pl-10" />
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
            )}
             <FormField
              control={form.control}
              name="pollingInterval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monitoring Interval (seconds)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Timer className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type="number"
                        min="1"
                        placeholder={`Default (Global: ${globalPollingInterval}s)`}
                        {...field}
                        value={field.value ?? ''}
                        className="pl-10"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
