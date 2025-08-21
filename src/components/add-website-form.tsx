'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Globe, Type, Tag, Hash, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import type { MonitorType } from '@/lib/types';

const monitorTypes: { label: string, value: MonitorType, disabled?: boolean }[] = [
    { label: "HTTP(s)", value: "HTTP(s)" },
    { label: "TCP Port", value: "TCP Port" },
    { label: "Ping", value: "Ping" },
    { label: "HTTP(s) - Keyword", value: "HTTP(s) - Keyword" },
    { label: "HTTP(s) - Json Query", value: "HTTP(s) - Json Query", disabled: true },
    { label: "gRPC(s) - Keyword", value: "gRPC(s) - Keyword", disabled: true },
    { label: "DNS", value: "DNS", disabled: true },
    { label: "Docker Container", value: "Docker Container", disabled: true },
    { label: "HTTP(s) - Browser Engine", value: "HTTP(s) - Browser Engine (Chrome/Chromium) (Beta)", disabled: true },
];

const formSchema = z.object({
  name: z.string().min(1, { message: 'Friendly name is required.' }),
  url: z.string().min(1, { message: 'URL/Host is required.' }),
  monitorType: z.custom<MonitorType>(),
  port: z.coerce.number().optional(),
  keyword: z.string().optional(),
});

type AddWebsiteFormProps = {
  onAddWebsite: (data: z.infer<typeof formSchema>) => void;
};

export function AddWebsiteForm({ onAddWebsite }: AddWebsiteFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      url: '',
      monitorType: 'HTTP(s)',
    },
  });

  const monitorType = form.watch('monitorType');

  function onSubmit(values: z.infer<typeof formSchema>) {
    onAddWebsite(values);
    form.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a new monitor</CardTitle>
        <CardDescription>Enter the details of the service you want to monitor.</CardDescription>
      </CardHeader>
      <CardContent>
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
                                    <SelectLabel>General Monitor Type</SelectLabel>
                                    {monitorTypes.map(type => (
                                        <SelectItem key={type.value} value={type.value} disabled={type.disabled}>
                                            {type.label}
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
                   <FormLabel>{monitorType === 'TCP Port' || monitorType === 'Ping' ? 'Hostname or IP' : 'URL'}</FormLabel>
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
                            <Input type="number" placeholder="e.g. 443" {...field} className="pl-10" />
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
                            <Input placeholder="e.g. 'verification_code'" {...field} className="pl-10" />
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
            )}
            
            <div className="flex justify-end">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                Add Monitor
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
