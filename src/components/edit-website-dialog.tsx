import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Globe, Tag } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import type { MonitorType, Website } from '@/lib/types';
import { useEffect } from 'react';

const monitorTypes: { label: string, value: MonitorType, disabled?: boolean }[] = [
    { label: "HTTP(s)", value: "HTTP(s)" },
    { label: "TCP Port", value: "TCP Port", disabled: true },
    { label: "Ping", value: "Ping", disabled: true },
    { label: "HTTP(s) - Keyword", value: "HTTP(s) - Keyword", disabled: true },
    { label: "HTTP(s) - Json Query", value: "HTTP(s) - Json Query", disabled: true },
    { label: "gRPC(s) - Keyword", value: "gRPC(s) - Keyword", disabled: true },
    { label: "DNS", value: "DNS", disabled: true },
    { label: "Docker Container", value: "Docker Container", disabled: true },
    { label: "HTTP(s) - Browser Engine", value: "HTTP(s) - Browser Engine (Chrome/Chromium) (Beta)", disabled: true },
];

const formSchema = z.object({
  name: z.string().min(1, { message: 'Friendly name is required.' }),
  url: z.string().url({ message: 'Please enter a valid URL.' }).refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'URL must start with http:// or https://' }
  ),
  monitorType: z.custom<MonitorType>(),
});

type EditWebsiteDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  website: Website | null;
  onEditWebsite: (id: string, data: z.infer<typeof formSchema>) => void;
};

export function EditWebsiteDialog({ isOpen, onOpenChange, website, onEditWebsite }: EditWebsiteDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      url: '',
      monitorType: 'HTTP(s)',
    },
  });

  useEffect(() => {
    if (website) {
      form.reset({
        name: website.name,
        url: website.url,
        monitorType: website.monitorType,
      });
    }
  }, [website, form]);

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
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
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
            <DialogFooter>
                <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
