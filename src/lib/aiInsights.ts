import { type Investment, type Employee, type Turnover, type PowerUsage, type TermLoan } from "./store";
import { formatIndianCurrency } from "./formatCurrency";

export interface AIInsight {
  title: string;
  description: string;
  type: "prediction" | "anomaly" | "recommendation" | "positive" | "negative";
}


export function generateSipcotInsights(data: any[]): AIInsight[] {
  const insights: AIInsight[] = [];
  if (!data || data.length === 0) return insights;

  const validData = data.filter(d => Boolean(d.name));
  if (validData.length < 2) return insights;

  const getTopAndBottom = (key: string) => {
    const sorted = [...validData].sort((a, b) => (Number(b[key]) || 0) - (Number(a[key]) || 0));
    return { 
      top: sorted[0], 
      bottom: sorted[sorted.length - 1], 
      topVal: Number(sorted[0][key]) || 0,
      bottomVal: Number(sorted[sorted.length - 1][key]) || 0
    };
  };

  // 1. Turnover
  const turn = getTopAndBottom("turnover");
  if (turn.topVal > 0) {
    insights.push({
      title: "Top Revenue Generator",
      description: `${turn.top.name} leads with a monthly turnover of ${formatIndianCurrency(turn.topVal)}.`,
      type: "positive"
    });
  }

  // 2. Investment
  const inv = getTopAndBottom("investment");
  if (inv.topVal > 0) {
    insights.push({
      title: "Highest Investment",
      description: `${inv.top.name} has the highest total investment at ${formatIndianCurrency(inv.topVal)}.`,
      type: "prediction"
    });
  }

  // 3. Employees

  const emp = getTopAndBottom("totalEmployees");
  if (emp.topVal > 0) {
    insights.push({
      title: "Largest Workforce",
      description: `${emp.top.name} employs the most people with ${emp.topVal} total employees.`,
      type: "positive"
    });
  }

  // 4. Power
  const pwr = getTopAndBottom("power");
  if (pwr.topVal > 0) {
    insights.push({
      title: "Max Power Consumer",
      description: `${pwr.top.name} consumes the most monthly power (${pwr.topVal} kWh).`,
      type: "anomaly"
    });
  }

  // 5. Water
  const h2o = getTopAndBottom("water");
  if (h2o.topVal > 0) {
    insights.push({
      title: "Max Water Consumer",
      description: `${h2o.top.name} reports the highest monthly water usage (${h2o.topVal} KL).`,
      type: "recommendation"
    });
  }

  // 6. Loans
  const loans = getTopAndBottom("loans");
  if (loans.topVal > 0) {
    insights.push({
      title: "Highest Debt Exposure",
      description: `${loans.top.name} carries the highest loan amount at ${formatIndianCurrency(loans.topVal)}.`,
      type: "negative"
    });
  }

  // 7. CSR
  const csr = getTopAndBottom("csr");
  if (csr.topVal > 0) {
    insights.push({
      title: "Top CSR Contributor",
      description: `${csr.top.name} leads CSR initiatives with ${formatIndianCurrency(csr.topVal)} spent.`,
      type: "positive"
    });
  }

  return insights;
}
