
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatDate as formatDateFn } from 'date-fns';
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
import Image from 'next/image';

const formSchema = z.object({
  serviceId: z.string(),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }),
  format: z.enum(['pdf', 'excel']),
  reportType: z.enum(['summary', 'detail']),
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
      reportType: 'summary',
    },
  });

  const generatePdf = async (data: any[], fileName: string, startDate: string, endDate: string, serviceName: string, reportType: 'summary' | 'detail') => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const generationTime = formatDateFn(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Emblem_of_the_Jatiya_Sangsad.svg/500px-Emblem_of_the_Jatiya_Sangsad.svg.png';
    let yPos = 15;
    let logoDataUri: string | ArrayBuffer | null = null;

    // Fetch and add logo
    try {
        const response = await fetch(logoUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        await new Promise(resolve => {
            reader.onloadend = () => {
                logoDataUri = reader.result;
                doc.addImage(logoDataUri as string, 'PNG', (pageW / 2) - 10, yPos, 20, 20);
                resolve(true);
            };
        });
        yPos += 25;
    } catch (e) {
        console.error("Failed to load logo for PDF", e);
    }
    
    doc.setFontSize(18);
    doc.text('Bangladesh Parliament Web Services Monitoring Report', pageW / 2, yPos, { align: 'center'});
    yPos += 7;
    doc.setFontSize(12);
    doc.text(reportType === 'summary' ? 'Summary Report' : 'Detail Report', pageW / 2, yPos, { align: 'center' });
    yPos += 15;

    doc.setFontSize(10);
    doc.text(`Service(s): ${serviceName.replace(/_/g, ' ')}`, 14, yPos);
    doc.text(`Date Range: ${startDate} to ${endDate}`, 14, yPos + 6);

    yPos += 15;


    data.forEach(site => {
        if (yPos > 250) { 
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(14);
        doc.text(site.name, 14, yPos);
        yPos += 6;
        doc.setFontSize(10);
        doc.setTextColor(60);
        doc.text(site.url, 14, yPos);
        doc.setTextColor(0);
        yPos += 10;

        if (reportType === 'summary') {
            autoTable(doc, {
                startY: yPos,
                body: site.summaryData,
                theme: 'plain',
                styles: { fontSize: 10 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
            });
            yPos = (doc as any).lastAutoTable.finalY + 15;
        } else { // Detail Report
            if (site.history.length > 0) {
                autoTable(doc, {
                    startY: yPos,
                    head: [['Time', 'Status', 'Latency (ms)']],
                    body: site.history.map((h: any) => [h.time, h.status, h.latency]),
                    theme: 'striped',
                    headStyles: { fillColor: [41, 128, 185] },
                });
                yPos = (doc as any).lastAutoTable.finalY + 15;
            } else {
                doc.text('No historical data available for this period.', 14, yPos);
                yPos += 10;
            }
        }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Add watermark
        if (logoDataUri) {
            doc.saveGraphicsState();
            doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
            doc.addImage(logoDataUri as string, 'PNG', (pageW / 2) - 50, (pageH / 2) - 50, 100, 100);
            doc.restoreGraphicsState();
        }

        doc.setFontSize(8);
        doc.setTextColor(150);
        const footerText = `System Generated Report. Generated on: ${generationTime}`;
        doc.text(footerText, pageW / 2, 285, { align: 'center' });
        doc.text(`Page ${i} of ${pageCount}`, pageW - 14, 285, { align: 'right'});
    }


    doc.save(`${fileName}.pdf`);
  };

  const generateExcel = (data: any[], fileName: string, reportType: 'summary' | 'detail') => {
    const wb = XLSX.utils.book_new();

    data.forEach(site => {
        let wsData;
        if (reportType === 'summary') {
            wsData = [
                ['Service Name', site.name],
                ['URL', site.url],
                [],
                ['Metric', 'Value'],
                ...site.summaryData
            ];
        } else { // Detail
            if (site.history.length > 0) {
                wsData = [
                    ['Service Name', site.name],
                    ['URL', site.url],
                    [],
                    ['Time', 'Status', 'Latency (ms)'],
                    ...site.history.map((h: any) => [h.time, h.status, h.latency])
                ];
            }
        }

        if(wsData) {
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

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const { serviceId, format: fileFormat, reportType } = values;
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
    
    let reportData;

    if (reportType === 'summary') {
        reportData = selectedWebsites.map(site => {
            const historyInRange = (site.latencyHistory || []).filter(h => {
                const hDate = new Date(h.time);
                return hDate >= from && hDate <= adjustedTo;
            });
            
            const upCount = historyInRange.filter(h => h.latency > 0).length;
            const uptimePercentage = historyInRange.length > 0 ? (upCount / historyInRange.length) * 100 : 0;
            const downCount = (site.statusHistory || []).filter(h => {
                const hDate = new Date(h.time);
                return h.status === 'Down' && hDate >= from && hDate <= adjustedTo;
            }).length;

            const latencies = historyInRange.filter(h => h.latency > 0).map(h => h.latency);
            const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
            const highestLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
            const lowestLatency = latencies.length > 0 ? Math.min(...latencies) : 0;


            return {
                name: site.name,
                url: site.url,
                summaryData: [
                    ['Current Status', site.status],
                    ['Uptime', `${uptimePercentage.toFixed(2)}%`],
                    ['Down Occurrences', downCount],
                    ['Average Latency', `${avgLatency.toFixed(0)} ms`],
                    ['Highest Latency', `${highestLatency} ms`],
                    ['Lowest Latency', `${lowestLatency} ms`],
                ]
            };
        });
    } else { // Detail Report
        reportData = selectedWebsites.map(site => {
            const historyInRange = (site.latencyHistory || []).filter(h => {
                const hDate = new Date(h.time);
                return hDate >= from && hDate <= adjustedTo;
            });

            return {
                name: site.name,
                url: site.url,
                monitorType: site.monitorType,
                history: historyInRange.map(h => ({
                    time: formatDateFn(new Date(h.time), 'yyyy-MM-dd hh:mm:ss a'),
                    latency: h.latency > 0 ? h.latency : 'N/A',
                    status: h.latency > 0 ? 'Up' : 'Down',
                })),
            };
        });

        if (reportData.every(d => d.history.length === 0)) {
            toast({ title: "No Data Available", description: "No monitoring data found for the selected services in the chosen date range.", variant: "destructive" });
            return;
        }
    }
    
    const startDate = formatDateFn(from, 'yyyy-MM-dd');
    const endDate = formatDateFn(to, 'yyyy-MM-dd');
    const serviceName = serviceId === 'all' ? 'All_Services' : selectedWebsites[0]?.name.replace(/\s+/g, '_') || 'Service';
    const reportTypeName = reportType === 'summary' ? 'Summary' : 'Detail';
    const fileName = `Monitoring_Report_${reportTypeName}_${serviceName}_${startDate}_to_${endDate}`;

    if (fileFormat === 'pdf') {
      generatePdf(reportData, fileName, startDate, endDate, serviceName, reportType);
    } else {
      generateExcel(reportData, fileName, reportType);
    }
  };
  

  return (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
               <FormField
                control={form.control}
                name="reportType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex items-center space-x-4 pt-2"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="summary" />
                          </FormControl>
                          <FormLabel className="font-normal">Summary</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="detail" />
                          </FormControl>
                          <FormLabel className="font-normal">Detail</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                                {formatDateFn(date.from, "LLL dd, y")} -{" "}
                                {formatDateFn(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                formatDateFn(date.from, "LLL dd, y")
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
