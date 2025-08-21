export type WebsiteStatus = 'Up' | 'Down' | 'Checking' | 'Idle';

export interface Website {
  id: string;
  url: string;
  status: WebsiteStatus;
  httpResponse?: string;
  lastChecked?: string;
  diagnosis?: string;
}
