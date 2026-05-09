import { type Investment, type Turnover, type Employee, type TermLoan, type PowerUsage, type CSR } from "./store";

export interface DataPoint {
  x: number; // Time index (e.g., month number)
  y: number; // Value to predict
}


export const getInvestmentData = (rawData: Investment[]) => {
  const sorted = [...rawData].sort((a, b) => new Date(a.investmentDate).getTime() - new Date(b.investmentDate).getTime());
  const aggregated: { date: string, initial: number, additional: number }[] = [];

  sorted.forEach(item => {
    const dateVal = new Date(item.investmentDate);
    if (isNaN(dateVal.getTime())) return;
    const label = dateVal.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    
    const existing = aggregated.find(a => a.date === label);
    const amount = Number(item.totalAmount) || 0;
    
    if (existing) {
      if (item.investmentType === "Initial") existing.initial += amount;
      else existing.additional += amount;
    } else {
      aggregated.push({
        date: label,
        initial: item.investmentType === "Initial" ? amount : 0,
        additional: item.investmentType === "Additional" ? amount : 0
      });
    }
  });
  return aggregated.slice(-12);
};

export const getTurnoverData = (rawData: Turnover[]) => {
  const sorted = [...rawData].sort((a, b) => new Date(a.turnoverDate).getTime() - new Date(b.turnoverDate).getTime());
  const aggregated: { date: string, amount: number }[] = [];

  sorted.forEach(item => {
    const dateVal = new Date(item.turnoverDate);
    if (isNaN(dateVal.getTime())) return;
    const label = dateVal.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    
    const existing = aggregated.find(a => a.date === label);
    const amount = Number(item.monthlyTurnover) || 0;
    if (existing) {
      existing.amount += amount;
    } else {
      aggregated.push({ date: label, amount });
    }
  });
  return aggregated.slice(-36);
};

export const getDecadeRange = (decadeStr: string) => {
  const [start, end] = decadeStr.split("-").map(Number);
  return { start, end };
};

export const getEmployeeGrowthData = (rawData: Employee[]) => {
  const sorted = [...rawData].sort((a, b) => new Date(a.updatedDate).getTime() - new Date(b.updatedDate).getTime());
  const aggregated: { date: string, male: number, female: number, total: number }[] = [];

  sorted.forEach(item => {
    const dateVal = new Date(item.updatedDate);
    if (isNaN(dateVal.getTime())) return;
    const label = dateVal.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    
    const existing = aggregated.find(a => a.date === label);
    const m = Number(item.male) || 0;
    const f = Number(item.female) || 0;
    
    if (existing) {
      existing.male += m;
      existing.female += f;
      existing.total += (m + f);
    } else {
      aggregated.push({ date: label, male: m, female: f, total: m + f });
    }
  });
  return aggregated.slice(-12);
};

export const getLoanData = (rawData: TermLoan[]) => {
  const sorted = [...rawData].sort((a, b) => new Date(a.updatedDate).getTime() - new Date(b.updatedDate).getTime());
  const aggregated: { date: string, amount: number }[] = [];

  sorted.forEach(item => {
    const dateVal = new Date(item.updatedDate);
    if (isNaN(dateVal.getTime())) return;
    const label = dateVal.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    
    const existing = aggregated.find(a => a.date === label);
    const amount = Number(item.loanAmount) || 0;
    
    if (existing) {
      existing.amount += amount;
    } else {
      aggregated.push({ date: label, amount });
    }
  });
  return aggregated.slice(-12);
};

export const getPowerData = (rawData: PowerUsage[]) => {
  const sorted = [...rawData].sort((a, b) => new Date(a.updatedDate).getTime() - new Date(b.updatedDate).getTime());
  const aggregated: { date: string, monthly: number }[] = [];

  sorted.forEach(item => {
    const dateVal = new Date(item.updatedDate);
    if (isNaN(dateVal.getTime())) return;
    const label = dateVal.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    
    const existing = aggregated.find(a => a.date === label);
    const m = Number(item.monthlyUsage) || 0;
    
    if (existing) {
      existing.monthly += m;
    } else {
      aggregated.push({ date: label, monthly: m });
    }
  });
  return aggregated.slice(-12);
};

export const getCsrData = (rawData: CSR[]) => {
  const sorted = [...rawData].sort((a, b) => new Date(a.activityDate || a.updatedDate).getTime() - new Date(b.activityDate || b.updatedDate).getTime());
  const aggregated: { date: string, amount: number }[] = [];

  sorted.forEach(item => {
    const dateVal = new Date(item.activityDate || item.updatedDate);
    if (isNaN(dateVal.getTime())) return;
    const label = dateVal.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    
    const existing = aggregated.find(a => a.date === label);
    const amount = Number(item.amountSpent) || 0;
    
    if (existing) {
      existing.amount += amount;
    } else {
      aggregated.push({ date: label, amount });
    }
  });
  return aggregated.slice(-12);
};

/**
 * Predicts future values based on a Hybrid model (Linear Trend + AR1 Residuals)
 * This is a pure JS implementation to avoid WebAssembly (WASM) loading issues in browsers.
 */
export function predictFutureValues(points: DataPoint[], count: number = 1): number[] {
  if (points.length < 5) return [];

  const predictions: number[] = [];
  const workingPoints = [...points];

  for (let step = 0; step < count; step++) {
    try {
      const n = workingPoints.length;
      const xSum = workingPoints.reduce((s, p) => s + p.x, 0);
      const ySum = workingPoints.reduce((s, p) => s + p.y, 0);
      const xySum = workingPoints.reduce((s, p) => s + p.x * p.y, 0);
      const x2Sum = workingPoints.reduce((s, p) => s + p.x * p.x, 0);

      // 1. Linear Trend (Slope and Intercept)
      const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
      const intercept = (ySum - slope * xSum) / n;
      
      // Trend projection for next point (n)
      const trendNext = slope * n + intercept;

      // 2. Pure JS AR(1) Residual Analysis
      const residuals = workingPoints.map(p => p.y - (slope * p.x + intercept));
      
      let phi = 0;
      let num = 0;
      let den = 0;
      for (let i = 1; i < residuals.length; i++) {
        num += residuals[i] * residuals[i - 1];
        den += residuals[i - 1] * residuals[i - 1];
      }
      if (den !== 0) phi = num / den;
      
      const lastResid = residuals[residuals.length - 1];
      // For multi-step forecasting, the AR component decays: resid(t+k) = phi^k * resid(t)
      const residNext = phi * lastResid;

      const hybrid = Math.max(0, trendNext + residNext);
      const result = isNaN(hybrid) ? workingPoints[n - 1].y : hybrid;
      
      predictions.push(result);
      // Add the predicted point to working points for next iteration
      workingPoints.push({ x: n, y: result });
    } catch (err) {
      console.error("Prediction failed:", err);
      break;
    }
  }

  return predictions;
}

/**
 * Calculates current growth vs previous point as a percentage
 */
export function calculateGrowth(current: number, previous: number): string {
  if (!previous || previous === 0) return "+0.0%";
  const diff = ((current - previous) / previous) * 100;
  return (diff >= 0 ? "+" : "") + diff.toFixed(1) + "%";
}

/**
 * Prepares aggregated chart data for prediction
 */
export function preparePredictionData(aggregatedData: { date: string, [key: string]: any }[], valueKey: string): DataPoint[] {
  return aggregatedData.map((d, i) => ({
    x: i,
    y: Number(d[valueKey]) || 0
  }));
}


export function getHealthColor(score: number): string {
  if (score >= 80) return "#22c55e"; // Green
  if (score >= 60) return "#3b82f6"; // Blue
  if (score >= 40) return "#f59e0b"; // Amber
  return "#ef4444"; // Red
}

export function getAnomalySeverity(anomalies: string[]): "low" | "medium" | "high" {
  if (anomalies.some(a => a.includes("Critical"))) return "high";
  if (anomalies.length > 0) return "medium";
  return "low";
}
