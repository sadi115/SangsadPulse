export type WebsiteStatus = 'Up' | 'Down' | 'Checking' | 'Idle' | 'Paused';

export type MonitorType =
  | 'Group'
  | 'HTTP(s)'
  | 'TCP Port'
  | 'Ping'
  | 'HTTP(s) - Keyword'
  | 'HTTP(s) - Json Query'
  | 'gRPC(s) - Keyword'
  | 'DNS'
  | 'Docker Container'
  | 'HTTP(s) - Browser Engine (Chrome/Chromium) (Beta)';

export interface Website {
  id: string;
  name: string;
  url: string;
  monitorType: MonitorType;
  status: WebsiteStatus;
  isPaused?: boolean;
  httpResponse?: string;
  lastChecked?: string;
  diagnosis?: string;
  latency?: number;
  averageLatency?: number;
  uptimePercentage?: number;
  latencyHistory?: { time: string; latency: number }[];
  lastDownTime?: string;
  displayOrder: number;
  // Options for specific monitor types
  port?: number;
  keyword?: string;
}
