
export enum PollStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ENDED = 'ended'
}

export interface Startup {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  order: number;
}

export interface Vote {
  investorId: string;
  allocations: { [startupId: string]: number };
  totalAllocated: number;
  timestamp: any;
}

export interface GlobalSettings {
  pollStatus: PollStatus;
  totalBudget: number;
  minAllocation: number;
  title: string;
}
