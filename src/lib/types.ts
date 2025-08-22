
export type WebsiteStatus = 'Up' | 'Down' | 'Checking' | 'Idle' | 'Paused';

export type MonitorType =
  | 'HTTP(s)'
  | 'TCP Port'
  | 'Ping'
  | 'HTTP(s) - Keyword';

export type StatusHistory = {
    time: string;
    status: 'Up' | 'Down';
    latency: number;
    reason:string;
};

export interface Website {
  id: string;
  name: string;
  url: string;
  monitorType: MonitorType;
  status: WebsiteStatus;
  isPaused?: boolean;
  isLoading?: boolean;
  httpResponse?: string;
  lastChecked?: string;
  diagnosis?: string;
  latency?: number;
  averageLatency?: number;
  uptimePercentage?: number;
  latencyHistory?: { time: string; latency: number }[];
  statusHistory?: StatusHistory[];
  lastDownTime?: string;
  displayOrder: number;
  // Options for specific monitor types
  port?: number;
  keyword?: string;
}

    