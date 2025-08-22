
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format as formatDate } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import type { Website } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { DateRange } from 'react-day-picker';

const formSchema = z.object({
  serviceId: z.string(),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }),
  format: z.enum(['pdf', 'excel']),
});

type ReportGeneratorProps = {
  websites: Website[];
};

export function ReportGenerator({ websites }: ReportGeneratorProps) {
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    setDate({
      from: new Date(new Date().setDate(new Date().getDate() - 7)),
      to: new Date(),
    });
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceId: 'all',
      dateRange: { from: undefined, to: undefined },
      format: 'pdf',
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const { serviceId, format: reportFormat } = values;
    const { from, to } = date || {};

    if (!from || !to) {
        toast({ title: "Date range required", description: "Please select a start and end date.", variant: "destructive"});
        return;
    }
    
    const adjustedTo = new Date(to);
    adjustedTo.setHours(23, 59, 59, 999);


    const selectedWebsites = serviceId === 'all'
      ? websites
      : websites.filter(w => w.id === serviceId);
    
    if (selectedWebsites.length === 0) {
        toast({ title: "No data", description: "No services selected for the report.", variant: "destructive"});
        return;
    }
    
    const reportData = selectedWebsites.map(site => {
        const historyInRange = (site.latencyHistory || []).filter(h => {
            const hDate = new Date(h.time);
            return hDate >= from && hDate <= adjustedTo;
        });

        return {
            name: site.name,
            url: site.url,
            monitorType: site.monitorType,
            history: historyInRange.map(h => ({
                time: formatDate(new Date(h.time), 'yyyy-MM-dd hh:mm:ss a'),
                latency: h.latency > 0 ? h.latency : 'N/A',
                status: h.latency > 0 ? 'Up' : 'Down',
            })),
        };
    });

    if (reportData.every(d => d.history.length === 0)) {
        toast({ title: "No Data Available", description: "No monitoring data found for the selected services in the chosen date range.", variant: "destructive" });
        return;
    }


    const startDate = formatDate(from, 'yyyy-MM-dd');
    const endDate = formatDate(to, 'yyyy-MM-dd');
    const serviceName = serviceId === 'all' ? 'All_Services' : selectedWebsites[0]?.name.replace(/\s+/g, '_') || 'Service';
    const fileName = `WebWatch_Report_${serviceName}_${startDate}_to_${endDate}`;

    if (reportFormat === 'pdf') {
      generatePdf(reportData, fileName, startDate, endDate, serviceName.replace(/_/g, ' '));
    } else {
      generateExcel(reportData, fileName);
    }
  };
  
  const generatePdf = (data: any[], fileName: string, startDate: string, endDate: string, serviceName: string) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Web Service Monitoring Report', 14, 22);
    doc.setFontSize(11);
    doc.text(`Service(s): ${serviceName}`, 14, 32);
    doc.text(`Date Range: ${startDate} to ${endDate}`, 14, 38);

    let yPos = 50;

    data.forEach(site => {
      if (yPos > 250) { 
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.text(site.name, 14, yPos);
      yPos += 6;
      doc.setFontSize(10);
      doc.text(site.url, 14, yPos);
      yPos += 10;
      
      if(site.history.length > 0) {
        autoTable(doc, {
            startY: yPos,
            head: [['Time', 'Status', 'Latency (ms)']],
            body: site.history.map((h: any) => [h.time, h.status, h.latency]),
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
      } else {
        doc.text('No data available for this period.', 14, yPos);
        yPos += 10;
      }
    });

    doc.save(`${fileName}.pdf`);
  };

  const generateExcel = (data: any[], fileName: string) => {
    const wb = XLSX.utils.book_new();

    data.forEach(site => {
        if(site.history.length > 0) {
            const wsData = [
                ['Service Name', site.name],
                ['URL', site.url],
                [],
                ['Time', 'Status', 'Latency (ms)'],
                ...site.history.map((h: any) => [h.time, h.status, h.latency])
            ];
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            XLSX.utils.book_append_sheet(wb, ws, site.name.replace(/[/\\?*:[\]]/g, '').substring(0, 31));
        }
    });

    if (wb.SheetNames.length > 0) {
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    } else {
        toast({ title: "No Data Available", description: "No monitoring data found for the selected services in the chosen date range.", variant: "destructive" });
    }
  };

  return (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              <FormField
                control={form.control}
                name="serviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a service" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Services</SelectItem>
                        {websites.map(site => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.name}
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
                name="dateRange"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Date Range</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                            date.to ? (
                                <>
                                {formatDate(date.from, "LLL dd, y")} -{" "}
                                {formatDate(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                formatDate(date.from, "LLL dd, y")
                            )
                            ) : (
                            <span>Pick a date range</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
                 )}
            />

              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Format</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex items-center space-x-4 pt-2"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="pdf" />
                          </FormControl>
                          <FormLabel className="font-normal">PDF</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="excel" />
                          </FormControl>
                          <FormLabel className="font-normal">Excel</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit">Generate Report</Button>
            </div>
          </form>
        </Form>
  );
}
