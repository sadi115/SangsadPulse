
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Website } from '@/lib/types';
import { format, isValid } from 'date-fns';
import { Badge } from './ui/badge';
import { useMemo } from 'react';
import { Card, CardContent } from './ui/card';

type HistoryDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    website: Website | null;
};

const MAX_HISTORY_ITEMS = 50;

const StatusBadge = ({ status }: { status: 'Up' | 'Down' }) => {
    const variant = status === 'Up' ? 'success' : 'destructive';
    return <Badge variant={variant}>{status}</Badge>
}

export function HistoryDialog({ isOpen, onOpenChange, website }: HistoryDialogProps) {
    if (!website) return null;
    
    const displayedHistory = useMemo(() => {
        const history = website.latencyHistory ? [...website.latencyHistory].reverse() : [];
        return history.slice(0, MAX_HISTORY_ITEMS);
    }, [website.latencyHistory]);
    
    const summaryStats = useMemo(() => {
        if (!website.statusHistory || website.statusHistory.length === 0) {
            return { uptime: null, downEvents: 0 };
        }
        const upCount = website.statusHistory.filter(h => h.status === 'Up').length;
        const downEvents = website.statusHistory.filter(h => h.status === 'Down').length;

        const uptime = (upCount / website.statusHistory.length) * 100;
        return { uptime, downEvents };
    }, [website.statusHistory]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>History: {website.name}</DialogTitle>
                    <DialogDescription>
                        Showing the last {displayedHistory.length} status checks for this service.
                    </DialogDescription>
                </DialogHeader>

                <Card className="bg-secondary/50">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                                <p className="text-sm text-muted-foreground">Uptime (Total)</p>
                                <p className="text-2xl font-bold">
                                    {summaryStats.uptime !== null ? `${summaryStats.uptime.toFixed(2)}%` : 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Down Events (Total)</p>
                                <p className="text-2xl font-bold">{summaryStats.downEvents}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="max-h-[50vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Status</TableHead>
                                <TableHead className="w-[180px]">Time</TableHead>
                                <TableHead className="text-right w-[100px]">Latency</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayedHistory.length > 0 ? (
                                displayedHistory.map((item, index) => {
                                    const itemDate = new Date(item.time);
                                    return (
                                        <TableRow key={index}>
                                            <TableCell><StatusBadge status={item.latency > 0 ? 'Up' : 'Down'} /></TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    {isValid(itemDate) ? (
                                                        <span title={format(itemDate, 'PPpp')}>
                                                            {format(itemDate, 'hh:mm:ss a, dd-MMM-yyyy')}
                                                        </span>
                                                    ) : (
                                                        <span>Invalid date</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">{item.latency > 0 ? `${item.latency} ms` : 'N/A'}</TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24">
                                        No history data available yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
