// API-based data store (replaces localStorage)
import { apiGet, apiPost, apiPostWithFile, apiDelete } from './api';

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
}

export interface Industry {
  id: string;
  name: string;
  sipcotId: string;
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
}

export interface Employee {
  id: string;
  industryId: string;
  male: number;
  female: number;
  proofFileName?: string;
  proofFileData?: string;
  updatedDate: string;
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
}

export interface PowerUsage {
  id: string;
  industryId: string;
  dailyUsage: number;
  monthlyUsage: number;
  powerSource: "TNEB" | "Generator" | "Solar";
  connectionNumber: string;
  proofFileName?: string;
  proofFileData?: string;
  updatedDate: string;
}

export interface Turnover {
  id: string;
  industryId: string;
  monthlyTurnover: number;
  annualTurnover: number;
  financialYear: string;
  proofFileName?: string;
  proofFileData?: string;
  updatedDate: string;
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
}

export interface WaterUsage {
  id: string;
  industryId: string;
  dailyUsage: number;
  monthlyUsage: number;
  waterSource: "SIPCOT" | "Borewell" | "Both";
  proofFileName?: string;
  proofFileData?: string;
  updatedDate: string;
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
  };
}

export const investments = createCRUD<Investment>('investments');
export const employees = createCRUD<Employee>('employees');
export const termLoans = createCRUD<TermLoan>('term-loans');
export const powerUsages = createCRUD<PowerUsage>('power-usages');
export const turnovers = createCRUD<Turnover>('turnovers');
export const csrEntries = createCRUD<CSR>('csr-entries');
export const waterUsages = createCRUD<WaterUsage>('water-usages');

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
}
