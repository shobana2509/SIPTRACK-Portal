// API-based data store (replaces localStorage)
import { apiGet, apiPost, apiPostWithFile, apiDelete, apiPut } from './api';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: "super_admin" | "sipcot_admin" | "industry_admin";
  name: string;
  sipcotId?: string;
  industryId?: string;
}

export interface SIPCOT {
  id: string;
  name: string;
  district: string;
  submissionDeadline?: string;
  deadlineSetDate?: string;
}

export interface Industry {
  id: string;
  name: string;
  sipcotId: string;
  hasUnseenVerified?: boolean;
}

export interface Investment {
  id: string;
  industryId: string;
  totalAmount: number;
  investmentDate: string;
  investmentType: "Initial" | "Additional";
  proofFileName?: string;
  proofFileData?: string;
  updatedDate: string;
  verificationStatus: "pending" | "verified";
  isSuperAdminSeen: boolean;
}

export interface Employee {
  id: string;
  industryId: string;
  male: number;
  female: number;
  proofFileName?: string;
  proofFileData?: string;
  updatedDate: string;
  verificationStatus: "pending" | "verified";
  isSuperAdminSeen: boolean;
}

export interface TermLoan {
  id: string;
  industryId: string;
  loanAmount: number;
  bank: string;
  interestRate: number;
  tenure: number;
  emi: number;
  status: string;
  proofFileName?: string;
  proofFileData?: string;
  updatedDate: string;
  verificationStatus: "pending" | "verified";
  isSuperAdminSeen: boolean;
}

export interface PowerUsage {
  id: string;
  industryId: string;
  monthlyUsage: number;
  powerSource: "TNEB" | "Generator" | "Solar";
  connectionNumber: string;
  proofFileName?: string;
  proofFileData?: string;
  updatedDate: string;
  verificationStatus: "pending" | "verified";
  isSuperAdminSeen: boolean;
}

export interface Turnover {
  id: string;
  industryId: string;
  monthlyTurnover: number;
  financialYear: string;
  turnoverDate: string;
  proofFileName?: string;
  proofFileData?: string;
  updatedDate: string;
  verificationStatus: "pending" | "verified";
  isSuperAdminSeen: boolean;
}

export interface CSR {
  id: string;
  industryId: string;
  activityName: string;
  description: string;
  amountSpent: number;
  activityDate: string;
  location: string;
  proofFileName?: string;
  proofFileData?: string;
  updatedDate: string;
  verificationStatus: "pending" | "verified";
  isSuperAdminSeen: boolean;
}

export interface WaterUsage {
  id: string;
  industryId: string;
  monthlyUsage: number;
  waterSource: "SIPCOT" | "Borewell" | "Both";
  proofFileName?: string;
  proofFileData?: string;
  updatedDate: string;
  verificationStatus: "pending" | "verified";
  isSuperAdminSeen: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  industryId: string;
  message: string;
  timestamp: string;
  isDeletedForEveryone: boolean;
  deletedBySender: boolean;
  deletedByReceiver: boolean;
  isRead: boolean;
}

export interface ActivityLog {
  timestamp: string;
}

export interface SipcotComparison {
  id: string;
  name: string;
  totalInvestments: number;
  totalTurnover: number;
  totalPowerUsage: number;
  totalEmployees: number;
  totalWaterUsage: number;
  totalCsr: number;
  totalLoans: number;
}

export interface UsageEfficiency {
  id: string;
  name: string;
  sipcotName: string;
  powerUsage: number;
  waterUsage: number;
  avgPower: number;
  avgWater: number;
}

export interface IndustryPerformance {
  summary: { name: string; value: number; color: string }[];
  classified: {
    id: string;
    name: string;
    sipcotName: string;
    investment: number;
    turnover: number;
    powerUsage: number;
    waterUsage: number;
    employees: number;
    performance: "Excellent" | "Good" | "Average" | "Poor";
    reason: string;
    metrics: { 
      roi: string; 
      efficiency: string;
      waterEfficiency: string;
      debtRatio: string;
      csrRatio: string;
    };
  }[];
}

export interface Anomaly {
  id: string;
  industryId: string;
  dataType: "turnover" | "employees" | "power" | "water";
  dataId: string;
  oldValue: number;
  newValue: number;
  changePercentage: number;
  explanation?: string;
  aiValidation: "Valid Reason" | "Needs Review" | "Suspicious";
  validationResult?: string;
  status: "pending" | "resolved";
  timestamp: string;
}


// No initialization needed - DB has default data via schema.sql
export function initializeData() {
  // No-op: data is in MySQL now
}

export async function login(username: string, password: string): Promise<User | null> {
  try {
    const user = await apiPost<User>('/auth/login', { username, password });
    return user;
  } catch {
    return null;
  }
}

export async function getUsers(): Promise<User[]> {
  return apiGet<User[]>('/users');
}

export async function addUser(user: Omit<User, "id">): Promise<User> {
  return apiPost<User>('/users', user as Record<string, unknown>);
}

export async function getSIPCOTs(): Promise<SIPCOT[]> {
  return apiGet<SIPCOT[]>('/sipcots');
}

export async function addSIPCOT(sipcot: Omit<SIPCOT, "id">): Promise<SIPCOT> {
  return apiPost<SIPCOT>('/sipcots', sipcot as Record<string, unknown>);
}

export async function setSipcotDeadline(sipcotId: string, deadline: string, senderId: string): Promise<{ success: boolean; deadline: string }> {
  return apiPut<{ success: boolean; deadline: string }>(`/sipcots/${sipcotId}/deadline`, { deadline, senderId });
}

export async function getIndustries(): Promise<Industry[]> {
  return apiGet<Industry[]>('/industries');
}

export async function getIndustriesBySipcot(sipcotId: string): Promise<Industry[]> {
  return apiGet<Industry[]>(`/industries?sipcotId=${sipcotId}`);
}

export async function addIndustry(industry: Omit<Industry, "id">): Promise<Industry> {
  return apiPost<Industry>('/industries', industry as Record<string, unknown>);
}

export async function deleteIndustry(industryId: string): Promise<void> {
  return apiDelete(`/industries/${industryId}`);
}

// Generic CRUD factory for async API calls
function createCRUD<T extends { id: string; industryId: string; updatedDate: string }>(routeName: string) {
  return {
    getByIndustry: async (industryId: string): Promise<T[]> => {
      return apiGet<T[]>(`/${routeName}?industryId=${industryId}`);
    },
    getAll: async (): Promise<T[]> => {
      return apiGet<T[]>(`/${routeName}`);
    },
    add: async (item: Omit<T, "id">, file?: File): Promise<T> => {
      if (file) {
        return apiPostWithFile<T>(`/${routeName}`, item as Record<string, unknown>, file);
      }
      return apiPost<T>(`/${routeName}`, item as Record<string, unknown>);
    },
    remove: async (id: string): Promise<void> => {
      return apiDelete(`/${routeName}/${id}`);
    },
    getLatestByIndustry: async (industryId: string): Promise<T | undefined> => {
      const items = await apiGet<T[]>(`/${routeName}?industryId=${industryId}`);
      if (items.length === 0) return undefined;
      return items[items.length - 1];
    },
    verify: async (id: string, status: 'verified' | 'pending' = 'verified'): Promise<void> => {
      return apiPut<void>(`/verify/${routeName}/${id}`, { status });
    },
    getVerifiedByIndustry: async (industryId: string): Promise<T[]> => {
      return apiGet<T[]>(`/${routeName}?industryId=${industryId}&verified=true`);
    },
  };
}

export const investments = createCRUD<Investment>('investments');
export const employees = createCRUD<Employee>('employees');
export const termLoans = createCRUD<TermLoan>('term-loans');
export const powerUsages = createCRUD<PowerUsage>('power-usages');
export const turnovers = createCRUD<Turnover>('turnovers');
export const csrEntries = createCRUD<CSR>('csr-entries');
export const waterUsages = createCRUD<WaterUsage>('water-usages');

const normalizeAnomaly = (a: any): Anomaly => ({
  ...a,
  oldValue: Number(a.oldValue),
  newValue: Number(a.newValue),
  changePercentage: Number(a.changePercentage),
});

export const anomalies = {
  getByIndustry: async (industryId: string): Promise<Anomaly[]> => {
    const raw = await apiGet<any[]>(`/anomalies?industryId=${industryId}`);
    return raw.map(normalizeAnomaly);
  },
  getAll: async (): Promise<Anomaly[]> => {
    const raw = await apiGet<any[]>('/anomalies');
    return raw.map(normalizeAnomaly);
  },
  submitExplanation: async (id: string, explanation: string): Promise<{ success: boolean; validation: string; result: string }> => {
    return apiPut<{ success: boolean; validation: string; result: string }>(`/anomalies/${id}/explain`, { explanation });
  }
};

export const chat = {
  getMessages: async (industryId: string): Promise<ChatMessage[]> => {
    return apiGet<ChatMessage[]>(`/chat?industryId=${industryId}`);
  },
  sendMessage: async (msg: { senderId: string; receiverId: string; industryId: string; message: string }): Promise<ChatMessage> => {
    return apiPost<ChatMessage>('/chat', msg as Record<string, unknown>);
  },
  deleteMessage: async (id: string, type: 'me' | 'everyone', userId: string): Promise<void> => {
    return apiPut<void>(`/chat/${id}/delete`, { type, userId });
  },
  clearMessages: async (industryId: string, userId: string): Promise<void> => {
    return apiPost<void>('/chat/clear', { industryId, userId });
  },
  markRead: async (industryId: string, userId: string): Promise<void> => {
    return apiPost<void>('/chat/mark-read', { industryId, userId });
  }
};

export async function getActivityLogs(): Promise<ActivityLog[]> {
  return apiGet<ActivityLog[]>('/activity-logs');
}

export async function getSipcotComparison(): Promise<SipcotComparison[]> {
  return apiGet<SipcotComparison[]>('/stats/sipcot-comparison');
}

export async function getUsageEfficiency(): Promise<UsageEfficiency[]> {
  return apiGet<UsageEfficiency[]>('/stats/usage-efficiency');
}

export async function getIndustryPerformance(): Promise<IndustryPerformance> {
  return apiGet<IndustryPerformance>('/stats/industry-performance');
}

export async function getDistricts(): Promise<string[]> {
  const sipcots = await getSIPCOTs();
  return [...new Set(sipcots.map(s => s.district))];
}

export async function getSIPCOTsByDistrict(district: string): Promise<SIPCOT[]> {
  const sipcots = await getSIPCOTs();
  return sipcots.filter(s => s.district === district);
}

export function openProofFile(proofFileData?: string, proofFileName?: string) {
  if (!proofFileData) return;

  // If it's a URL from the backend, open directly
  if (proofFileData.startsWith('http')) {
    window.open(proofFileData, '_blank');
    return;
  }

  const fileName = proofFileName || 'Proof Document';
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  if (extension === 'doc' || extension === 'docx' || extension === 'pdf') {
    const link = document.createElement('a');
    link.href = proofFileData;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  try {
    const byteString = atob(proofFileData.split(',')[1]);
    const mimeString = proofFileData.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch {
    window.open(proofFileData, '_blank');
  }
};

export const markAsSeen = async (industryId: string) => {
  await apiPut(`/seen/${industryId}`, {});
};

export const verifyAll = async (industryId: string) => {
  await apiPut(`/verify-all/${industryId}`, {});
};
