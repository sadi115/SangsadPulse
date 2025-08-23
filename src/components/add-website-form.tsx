
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Globe, Tag, Hash, Search, Timer, Lock, Book, PauseCircle, Folder } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import type { MonitorType, WebsiteFormData } from '@/lib/types';

const monitorTypes: { label: string, value: MonitorType, disabled?: boolean }[] = [
    { label: "HTTP(s)", value: "HTTP(s)" },
    { label: "TCP Port", value: "TCP Port" },
    { label: "Ping", value: "Ping" },
    { label: "HTTP(s) - Keyword", value: "HTTP(s) - Keyword" },
    { label: "Downtime", value: "Downtime" },
];

const advancedMonitorTypes: { label: string, value: MonitorType, disabled?: boolean }[] = [
     { label: "DNS Records", value: "DNS Records" },
]

const formSchema = z.object({
  name: z.string().min(1, { message: 'Friendly name is required.' }),
  url: z.string().min(1, { message: 'URL/Host is required.' }),
  monitorType: z.custom<MonitorType>(),
  port: z.coerce.number().optional(),
  keyword: z.string().optional(),
  pollingInterval: z.coerce.number().positive({ message: 'Interval must be a positive number.' }).optional(),
});

type AddWebsiteFormProps = {
  onAddWebsite: (data: WebsiteFormData) => void;
  globalPollingInterval: number;
};

export function AddWebsiteForm({ onAddWebsite, globalPollingInterval }: AddWebsiteFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      url: '',
      monitorType: 'HTTP(s)',
      port: undefined,
      keyword: '',
      pollingInterval: undefined,
    },
  });

  const monitorType = form.watch('monitorType');

  function onSubmit(values: z.infer<typeof formSchema>) {
    onAddWebsite(values);
    form.reset();
  }

  return (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="monitorType"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Monitor Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a monitor type" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>General Monitors</SelectLabel>
                                    {monitorTypes.map(type => (
                                        <SelectItem key={type.value} value={type.value} disabled={type.disabled}>
                                            <div className="flex items-center gap-2">
                                                {type.value === 'HTTP(s)' && <Globe className="h-4 w-4" />}
                                                {type.value === 'HTTP(s) - Keyword' && <Search className="h-4 w-4" />}
                                                {type.value === 'TCP Port' && <Hash className="h-4 w-4" />}
                                                {type.value === 'Ping' && <Timer className="h-4 w-4" />}
                                                {type.value === 'Downtime' && <PauseCircle className="h-4 w-4" />}
                                                {type.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                                <SelectGroup>
                                     <SelectLabel>Advanced Monitors</SelectLabel>
                                     {advancedMonitorTypes.map(type => (
                                        <SelectItem key={type.value} value={type.value} disabled={type.disabled}>
                                            <div className="flex items-center gap-2">
                                                {type.value === 'DNS Records' && <Book className="h-4 w-4" />}
                                                {type.label}
                                            </div>
                                        </SelectItem>
                                     ))}
                                </SelectGroup>
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
            </div>

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                   <FormLabel>{monitorType === 'TCP Port' || monitorType === 'Ping' || monitorType === 'DNS Records' ? 'Hostname or IP' : 'URL'}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input placeholder="https://example.com or 8.8.8.8" {...field} className="pl-10" />
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
                        placeholder={`Optional (Global: ${globalPollingInterval}s)`}
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
            
            <div className="flex justify-end">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                Add Monitor
                </Button>
            </div>
          </form>
        </Form>
  );
}
