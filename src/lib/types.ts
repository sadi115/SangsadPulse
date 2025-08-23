
import type { FieldValue, Timestamp } from "firebase/firestore";

export type WebsiteStatus = 'Up' | 'Down' | 'Checking' | 'Idle' | 'Paused';

export type MonitorType =
  | 'HTTP(s)'
  | 'TCP Port'
  | 'Ping'
  | 'HTTP(s) - Keyword'
  | 'Downtime'
  | 'DNS Records';

export type StatusHistory = {
    time: string;
    status: 'Up' | 'Down';
    latency: number;
    reason:string;
};

export type UptimeData = {
    '1h': number | null;
    '24h': number | null;
    '30d': number | null;
    'total': number | null;
}

export interface Website {
  id: string;
  name: string;
  url: string;
  monitorType: MonitorType;
  status: WebsiteStatus;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: string;
  isPaused?: boolean;
  isLoading?: boolean;
  httpResponse?: string;
  lastChecked?: string;
  diagnosis?: string;
  latency?: number;
  ttfb?: number;
  averageLatency?: number;
  lowestLatency?: number;
  highestLatency?: number;
  uptimeData: UptimeData;
  latencyHistory?: { time: string; latency: number }[];
  statusHistory?: StatusHistory[];
  lastDownTime?: string;
  displayOrder?: number;
  // Options for specific monitor types
  port?: number;
  keyword?: string;
  pollingInterval?: number; // Custom interval in seconds
}

export type WebsiteFormData = Omit<Website, 'id' | 'createdAt' | 'status' | 'latencyHistory' | 'statusHistory' | 'uptimeData' | 'isLoading' | 'displayOrder'>
