
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Globe, Tag, Hash, Search, Timer, Lock, Book, PauseCircle, Folder, Server, Laptop } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import type { MonitorType, Website, WebsiteFormData } from '@/lib/types';
import { useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

const cloudMonitorTypes: { label: string, value: MonitorType, disabled?: boolean }[] = [
    { label: "HTTP(s)", value: "HTTP(s)" },
    { label: "TCP Port", value: "TCP Port" },
    { label: "Ping", value: "Ping" },
    { label: "HTTP(s) - Keyword", value: "HTTP(s) - Keyword" },
    { label: "DNS Records", value: "DNS Records" },
    { label: "Downtime", value: "Downtime" },
];

const localMonitorTypes: { label: string, value: MonitorType, disabled?: boolean }[] = [
    { label: "HTTP(s)", value: "HTTP(s)" },
    { label: "HTTP(s) - Keyword", value: "HTTP(s) - Keyword" },
];

const allMonitorTypes = [...new Set([...cloudMonitorTypes, ...localMonitorTypes].map(m => m.value))];

const formSchema = z.object({
  name: z.string().min(1, { message: 'Friendly name is required.' }),
  url: z.string().min(1, { message: 'URL/Host is required.' }),
  monitorType: z.enum(allMonitorTypes as [string, ...string[]]),
  monitorLocation: z.enum(['cloud', 'local']),
  port: z.coerce.number().optional(),
  keyword: z.string().optional(),
  pollingInterval: z.coerce.number().positive({ message: 'Interval must be a positive number.' }).optional(),
});

type EditWebsiteDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  website: Website | null;
  onEditWebsite: (id: string, data: WebsiteFormData) => void;
  globalPollingInterval: number;
};

export function EditWebsiteDialog({ isOpen, onOpenChange, website, onEditWebsite, globalPollingInterval }: EditWebsiteDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const monitorType = form.watch('monitorType');
  const monitorLocation = form.watch('monitorLocation');

  const availableMonitorTypes = monitorLocation === 'local' ? localMonitorTypes : cloudMonitorTypes;

  useEffect(() => {
    if (website) {
      form.reset({
        name: website.name,
        url: website.url,
        monitorType: website.monitorType,
        monitorLocation: website.monitorLocation || 'cloud',
        port: website.port,
        keyword: website.keyword,
        pollingInterval: website.pollingInterval,
      });
    }
  }, [website, form, isOpen]);

  useEffect(() => {
    const currentMonitorType = form.getValues('monitorType');
    if (!availableMonitorTypes.some(t => t.value === currentMonitorType)) {
      form.setValue('monitorType', availableMonitorTypes[0].value);
    }
  }, [monitorLocation, availableMonitorTypes, form]);


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
              name="monitorLocation"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Monitor Location</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="cloud" />
                        </FormControl>
                         <FormLabel className="font-normal flex items-center gap-2"><Server className="h-4 w-4" /> Cloud</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="local" />
                        </FormControl>
                        <FormLabel className="font-normal flex items-center gap-2"><Laptop className="h-4 w-4" /> Local Browser</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                                {availableMonitorTypes.map(type => (
                                    <SelectItem key={type.value} value={type.value} disabled={type.disabled}>
                                        <div className="flex items-center gap-2">
                                            {type.value === 'HTTP(s)' && <Globe className="h-4 w-4" />}
                                            {type.value === 'HTTP(s) - Keyword' && <Search className="h-4 w-4" />}
                                            {type.value === 'TCP Port' && <Hash className="h-4 w-4" />}
                                            {type.value === 'Ping' && <Timer className="h-4 w-4" />}
                                            {type.value === 'DNS Records' && <Book className="h-4 w-4" />}
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
                  <FormLabel>{monitorType === 'TCP Port' || monitorType === 'Ping' || monitorType === 'DNS Records' ? 'Hostname or IP' : 'URL'}</FormLabel>
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
             {monitorType === 'TCP Port' && monitorLocation === 'cloud' && (
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
