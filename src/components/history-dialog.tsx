
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Website, StatusHistory } from '@/lib/types';
import { format } from 'date-fns';
import { Badge } from './ui/badge';

type HistoryDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    website: Website | null;
};

const StatusBadge = ({ status }: { status: 'Up' | 'Down' }) => {
    const variant = status === 'Up' ? 'success' : 'destructive';
    return <Badge variant={variant}>{status}</Badge>
}

export function HistoryDialog({ isOpen, onOpenChange, website }: HistoryDialogProps) {
    if (!website) return null;
    
    const reversedHistory = website.statusHistory ? [...website.statusHistory].reverse() : [];

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>History: {website.name}</DialogTitle>
                    <DialogDescription>
                        Showing the last {reversedHistory.length} status changes for this service.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Status</TableHead>
                                <TableHead className="w-[180px]">Time</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead className="text-right w-[100px]">Latency</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reversedHistory.length > 0 ? (
                                reversedHistory.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell><StatusBadge status={item.status} /></TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span title={format(new Date(item.time), 'PPpp')}>
                                                    {format(new Date(item.time), 'hh:mm:ss a, dd-MMM-yyyy')}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="break-all">{item.reason}</TableCell>
                                        <TableCell className="text-right">{item.latency} ms</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">
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
