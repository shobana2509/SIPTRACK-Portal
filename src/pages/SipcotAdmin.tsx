import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trophy } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getIndustriesBySipcot, getSIPCOTs, setSipcotDeadline, anomalies,
  investments, employees, termLoans, powerUsages, turnovers, csrEntries, waterUsages, openProofFile, verifyAll,
  type Industry, type SIPCOT, type Investment, type Employee, type TermLoan, type PowerUsage, type Turnover, type CSR, type WaterUsage, type Anomaly,
} from "@/lib/store";
import { 
  Factory, FileText, FileSpreadsheet, ChevronRight, Droplets, Plus, Upload, 
  TrendingUp, TrendingDown, Users, DollarSign, Zap, Heart, Building, Search, 
  Building2, Lightbulb, BrainCircuit, Activity, Sparkles, Target, MessageSquare, Calendar, ArrowUp, ArrowDown,
  AlertCircle, AlertTriangle, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { formatIndianCurrency } from "@/lib/formatCurrency";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { 
  getTurnoverData,
  predictFutureValues,
  preparePredictionData
} from "@/lib/analytics";
import { InsightCard, type InsightType } from "@/components/InsightCard";
import { ChatBox } from "@/components/ChatBox";
import { FloatingChat } from "@/components/FloatingChat";
import { generateSipcotInsights } from "@/lib/aiInsights";

const CustomAxisTick = (props: any) => {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        fill="#888"
        transform="rotate(-35)"
        fontSize={10}
        fontWeight={500}
      >
        {payload.value}
      </text>
    </g>
  );
};

const SipcotAdmin = () => {
  const { user } = useAuth();
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);
  const [searchIndustry, setSearchIndustry] = useState("");
  const today = new Date().toISOString().split("T")[0];

  const [waterMonthly, setWaterMonthly] = useState("");
  const [waterSource, setWaterSource] = useState<"SIPCOT" | "Borewell" | "Both">("SIPCOT");
  const [waterFile, setWaterFile] = useState<File | undefined>();
  const [waterProofName, setWaterProofName] = useState("");
  const waterFileRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<"list" | "dashboard" | "deadline">("list");
  const [anomalyFilter, setAnomalyFilter] = useState<string>("all");
 
  const calculateGrowth = (current: number, previous?: number) => {
    if (previous === undefined || previous === 0) return null;
    const rawGrowth = ((current - previous) / previous) * 100;
    return {
      percent: Math.min(100, Math.abs(rawGrowth)),
      isIncrease: rawGrowth >= 0
    };
  };

  const [sipcot, setSipcot] = useState<SIPCOT | undefined>();
  const [deadlineDate, setDeadlineDate] = useState("");
  const [isSettingDeadline, setIsSettingDeadline] = useState(false);
  const [industriesList, setIndustriesList] = useState<Industry[]>([]);
  const [allAnomalies, setAllAnomalies] = useState<Anomaly[]>([]);
  const [detailData, setDetailData] = useState<Record<string, { inv: Investment[]; emp: Employee[]; loans: TermLoan[]; power: PowerUsage[]; turn: Turnover[]; csr: CSR[]; water: WaterUsage[]; anoms: Anomaly[] }>>({});

  const loadSipcotData = useCallback(async () => {
    if (!user?.sipcotId) return;
    const allSipcots = await getSIPCOTs();
    const currentSipcot = allSipcots.find(s => s.id === user.sipcotId);
    setSipcot(currentSipcot);
    if (currentSipcot?.submissionDeadline) {
      setDeadlineDate(currentSipcot.submissionDeadline);
    }
    const [inds, anoms] = await Promise.all([
      getIndustriesBySipcot(user.sipcotId),
      anomalies.getAll()
    ]);
    setIndustriesList(inds);
    setAllAnomalies(anoms.filter(a => inds.some(i => i.id === a.industryId)));
  }, [user?.sipcotId]);

  useEffect(() => { loadSipcotData(); }, [loadSipcotData]);

  const loadIndustryDetails = useCallback(async (industryId: string) => {
    const [inv, emp, loans, power, turn, csr, water, anoms] = await Promise.all([
      investments.getByIndustry(industryId),
      employees.getByIndustry(industryId),
      termLoans.getByIndustry(industryId),
      powerUsages.getByIndustry(industryId),
      turnovers.getByIndustry(industryId),
      csrEntries.getByIndustry(industryId),
      waterUsages.getByIndustry(industryId),
      anomalies.getByIndustry(industryId),
    ]);
    setDetailData(prev => ({ ...prev, [industryId]: { inv, emp, loans, power, turn, csr, water, anoms } }));
  }, []);

  useEffect(() => {
    if (selectedIndustry) loadIndustryDetails(selectedIndustry.id);
  }, [selectedIndustry, loadIndustryDetails]);

  useEffect(() => {
    industriesList.forEach(ind => {
      if (!detailData[ind.id]) loadIndustryDetails(ind.id);
    });
  }, [industriesList, loadIndustryDetails, detailData]);

  const stats = useMemo(() => {
    let totalInv = 0;
    let totalTurnover = 0;
    let allEmployees: Employee[] = [];

    Object.values(detailData).forEach(d => {
      if (d.inv.length) {
        totalInv += Number(d.inv[d.inv.length - 1].totalAmount) || 0;
      }
      if (d.turn.length) {
        totalTurnover += Number(d.turn[d.turn.length - 1].monthlyTurnover) || 0;
      }
      if (d.emp.length) {
        allEmployees = [...allEmployees, ...d.emp];
      }
    });

    // Calculate Max values for normalization
    const maxVals = industriesList.reduce((acc, ind) => {
      const d = detailData[ind.id] || { inv: [], turn: [], power: [], water: [], csr: [], emp: [] };
      const inv = d.inv.length ? Number(d.inv[d.inv.length - 1].totalAmount) || 0 : 0;
      const turn = d.turn.length ? Number(d.turn[d.turn.length - 1].monthlyTurnover) || 0 : 0;
      const pow = d.power.length ? Number(d.power[d.power.length - 1].monthlyUsage) || 0 : 0;
      const wat = d.water.length ? Number(d.water[d.water.length - 1].monthlyUsage) || 0 : 0;
      let csrTotal = 0;
      d.csr.forEach(item => { csrTotal += Number(item.amountSpent) || 0; });
      const csr = csrTotal;
      const emp = d.emp.length ? (Number(d.emp[d.emp.length - 1].male) || 0) + (Number(d.emp[d.emp.length - 1].female) || 0) : 0;

      return {
        inv: Math.max(acc.inv, inv),
        turn: Math.max(acc.turn, turn),
        pow: Math.max(acc.pow, pow),
        wat: Math.max(acc.wat, wat),
        csr: Math.max(acc.csr, csr),
        emp: Math.max(acc.emp, emp)
      };
    }, { inv: 1, turn: 1, pow: 1, wat: 1, csr: 1, emp: 1 });

    const safeDivide = (a: number, b: number) => b === 0 ? 0 : a / b;

    const industryComparisonData = industriesList.map(ind => {
      const d = detailData[ind.id] || { inv: [], turn: [], power: [], water: [], csr: [], loans: [], emp: [] };
      const latestInv = d.inv.length ? Number(d.inv[d.inv.length - 1].totalAmount) || 0 : 0;
      const latestTurn = d.turn.length ? Number(d.turn[d.turn.length - 1].monthlyTurnover) || 0 : 0;
      const latestPower = d.power.length ? Number(d.power[d.power.length - 1].monthlyUsage) || 0 : 0;
      const latestWater = d.water.length ? Number(d.water[d.water.length - 1].monthlyUsage) || 0 : 0;
      let indCsrTotal = 0;
      d.csr.forEach(item => { indCsrTotal += Number(item.amountSpent) || 0; });
      const totalCsr = indCsrTotal;
      const totalLoans = d.loans.reduce((sum, item) => sum + (Number(item.loanAmount) || 0), 0);
      const latestEmp = d.emp.length ? d.emp[d.emp.length - 1] : { male: 0, female: 0 };
      const totalEmp = (Number(latestEmp.male) || 0) + (Number(latestEmp.female) || 0);

      // User's Smart KPI Formula (Modified to prevent 25% bonus for zero data)
      const invScore = 0.25 * safeDivide(latestInv, maxVals.inv);
      const empScore = 0.20 * safeDivide(totalEmp, maxVals.emp);
      const turnScore = 0.15 * safeDivide(latestTurn, maxVals.turn);
      const csrScore = 0.15 * safeDivide(totalCsr, maxVals.csr);
      
      // Only award efficiency points if records exist
      const powerScore = d.power.length > 0 ? 0.15 * (1 - safeDivide(latestPower, maxVals.pow)) : 0;
      const waterScore = d.water.length > 0 ? 0.10 * (1 - safeDivide(latestWater, maxVals.wat)) : 0;

      const score = (invScore + empScore + turnScore + csrScore + powerScore + waterScore) * 100;

      return {
        id: ind.id,
        name: ind.name,
        investment: latestInv,
        turnover: latestTurn,
        power: latestPower,
        water: latestWater,
        csr: totalCsr,
        loans: totalLoans,
        male: Number(latestEmp.male) || 0,
        female: Number(latestEmp.female) || 0,
        totalEmployees: totalEmp,
        performanceScore: score
      };
    }).sort((a, b) => b.performanceScore - a.performanceScore);


    const overallInsights = generateSipcotInsights(industryComparisonData);

    return { totalInv, totalTurnover, industryComparisonData, overallInsights };
  }, [detailData, industriesList]);

  if (!user || user.role !== "sipcot_admin") return <Navigate to="/" />;

  const handleSetDeadline = async () => {
    if (!sipcot) return;
    if (!deadlineDate) {
      toast.error("Please select a date");
      return;
    }
    setIsSettingDeadline(true);
    try {
      await setSipcotDeadline(sipcot.id, deadlineDate, user.id);
      toast.success("Deadline has been set and industries notified");
      loadSipcotData();
    } catch (err: any) {
      toast.error("Failed to set deadline: " + err.message);
    } finally {
      setIsSettingDeadline(false);
    }
  };

  const addWater = async (industryId: string) => {
    if (!waterMonthly) { toast.error("Fill water usage"); return; }
    await waterUsages.add({ industryId, monthlyUsage: Number(waterMonthly), waterSource, proofFileName: waterProofName || undefined, updatedDate: today } as any, waterFile);
    toast.success("Water usage added!");
    setWaterMonthly(""); setWaterProofName(""); setWaterFile(undefined);
    if (waterFileRef.current) waterFileRef.current.value = "";
    loadIndustryDetails(industryId);
  };

  const generateReport = async () => {
    let csv = `SIPCOT Report: ${sipcot?.name || ""}\n\nIndustry,Total Investment,Employees,Loan Details,Power (Monthly kWh),Water Monthly (KL),Monthly Turnover,CSR Spent,Updated Date\n`;
    for (const ind of industriesList) {
      const d = detailData[ind.id];
      if (!d) continue;
      const v = {
        inv: d.inv.filter(x => x.verificationStatus === 'verified'),
        emp: d.emp.filter(x => x.verificationStatus === 'verified'),
        loans: d.loans.filter(x => x.verificationStatus === 'verified'),
        power: d.power.filter(x => x.verificationStatus === 'verified'),
        turn: d.turn.filter(x => x.verificationStatus === 'verified'),
        csr: d.csr.filter(x => x.verificationStatus === 'verified'),
        water: d.water.filter(x => x.verificationStatus === 'verified')
      };

      const latestInv = v.inv[v.inv.length - 1];
      const latestEmp = v.emp[v.emp.length - 1];
      const latestLoan = v.loans[v.loans.length - 1];
      const latestTurn = v.turn[v.turn.length - 1];
      const latestPower = v.power[v.power.length - 1];
      const latestWater = v.water[v.water.length - 1];
      const latestCSR = v.csr[v.csr.length - 1];
      const updatedDate = latestTurn?.updatedDate || latestInv?.updatedDate || latestEmp?.updatedDate || latestLoan?.updatedDate || latestPower?.updatedDate || latestWater?.updatedDate || latestCSR?.updatedDate || '-';
      
      csv += `${ind.name},${formatIndianCurrency(latestInv?.totalAmount || 0, true)},${latestEmp ? (latestEmp.male + latestEmp.female) : 0},"${latestLoan ? `${formatIndianCurrency(latestLoan.loanAmount, true)} - ${latestLoan.bank}` : 'None'}",${latestPower?.monthlyUsage || 0},${latestWater?.monthlyUsage || 0},${formatIndianCurrency(latestTurn?.monthlyTurnover || 0, true)},${formatIndianCurrency(latestCSR?.amountSpent || 0, true)},${updatedDate}\n`;
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${sipcot?.name || "sipcot"}_report.csv`; a.click();
    toast.success("Summary report downloaded (Excel)!");
  };

  const generatePDFReport = () => {
    toast.info("Generating PDF report...");
    const doc = new jsPDF("landscape");
    doc.setFontSize(16);
    doc.text(`SIPCOT Report: ${sipcot?.name || ""}`, 14, 15);
    
    const tableData: (string | number)[][] = [];
    
    for (const ind of industriesList) {
      const d = detailData[ind.id];
      if (!d) continue;
      
      const v = {
        inv: d.inv.filter(x => x.verificationStatus === 'verified'),
        emp: d.emp.filter(x => x.verificationStatus === 'verified'),
        loans: d.loans.filter(x => x.verificationStatus === 'verified'),
        power: d.power.filter(x => x.verificationStatus === 'verified'),
        turn: d.turn.filter(x => x.verificationStatus === 'verified'),
        csr: d.csr.filter(x => x.verificationStatus === 'verified'),
        water: d.water.filter(x => x.verificationStatus === 'verified')
      };

      const latestInv = v.inv[v.inv.length - 1];
      const latestEmp = v.emp[v.emp.length - 1];
      const latestLoan = v.loans[v.loans.length - 1];
      const latestTurn = v.turn[v.turn.length - 1];
      const latestPower = v.power[v.power.length - 1];
      const latestWater = v.water[v.water.length - 1];
      const latestCSR = v.csr[v.csr.length - 1];
      const updatedDate = latestTurn?.updatedDate || latestInv?.updatedDate || latestEmp?.updatedDate || latestLoan?.updatedDate || latestPower?.updatedDate || latestWater?.updatedDate || latestCSR?.updatedDate || '-';
      
      tableData.push([
        ind.name,
        formatIndianCurrency(latestInv?.totalAmount || 0, true),
        latestEmp ? (latestEmp.male + latestEmp.female) : 0,
        latestLoan ? `${formatIndianCurrency(latestLoan.loanAmount, true)} - ${latestLoan.bank}` : 'None',
        latestPower?.monthlyUsage || 0,
        latestWater?.monthlyUsage || 0,
        formatIndianCurrency(latestTurn?.monthlyTurnover || 0, true),
        formatIndianCurrency(latestCSR?.amountSpent || 0, true),
        updatedDate
      ]);
    }

    autoTable(doc, {
      startY: 25,
      head: [['Industry', 'Total Investment', 'Employees', 'Loan Details', 'Power (Monthly kWh)', 'Water Monthly (KL)', 'Monthly Turnover', 'CSR Spent', 'Updated Date']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save(`${sipcot?.name || "sipcot"}_report.pdf`);
    toast.success("Summary report downloaded (PDF)!");
  };

  const downloadExcel = (industry: Industry) => {
    const d = detailData[industry.id];
    if (!d) { toast.error("Data not loaded yet"); return; }
    const v = {
      inv: d.inv.filter(x => x.verificationStatus === 'verified'),
      emp: d.emp.filter(x => x.verificationStatus === 'verified'),
      loans: d.loans.filter(x => x.verificationStatus === 'verified'),
      power: d.power.filter(x => x.verificationStatus === 'verified'),
      turn: d.turn.filter(x => x.verificationStatus === 'verified'),
      csr: d.csr.filter(x => x.verificationStatus === 'verified'),
      water: d.water.filter(x => x.verificationStatus === 'verified')
    };

    const latestInv = v.inv[v.inv.length - 1];
    const latestEmp = v.emp[v.emp.length - 1];
    const latestLoan = v.loans[v.loans.length - 1];
    const latestPower = v.power[v.power.length - 1];
    const latestTurn = v.turn[v.turn.length - 1];
    const latestCSR = v.csr[v.csr.length - 1];
    const latestWater = v.water[v.water.length - 1];

    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><style>td,th{border:1px solid #ccc;padding:4px 8px;font-family:Arial;font-size:12px}th{background:#f0f0f0;font-weight:bold}</style></head><body>`;
    html += `<h2>Company: ${industry.name}</h2>`;
    html += `<h3>Investments</h3><table><tr><th>Amount</th><th>Type</th><th>Date</th><th>Updated</th></tr>`;
    html += latestInv ? `<tr><td>${formatIndianCurrency(latestInv.totalAmount, true)}</td><td>${latestInv.investmentType}</td><td>${latestInv.investmentDate}</td><td>${latestInv.updatedDate}</td></tr>` : `<tr><td colspan="4">No data</td></tr>`;
    html += `</table><h3>Employees</h3><table><tr><th>Male</th><th>Female</th><th>Updated</th></tr>`;
    html += latestEmp ? `<tr><td>${latestEmp.male}</td><td>${latestEmp.female}</td><td>${latestEmp.updatedDate}</td></tr>` : `<tr><td colspan="3">No data</td></tr>`;
    html += `</table><h3>Loan</h3><table><tr><th>Amount</th><th>Bank</th><th>Rate</th><th>Tenure</th><th>EMI</th><th>Status</th><th>Updated</th></tr>`;
    html += latestLoan ? `<tr><td>${formatIndianCurrency(latestLoan.loanAmount, true)}</td><td>${latestLoan.bank}</td><td>${latestLoan.interestRate}%</td><td>${latestLoan.tenure} mo</td><td>${formatIndianCurrency(latestLoan.emi, true)}</td><td>${latestLoan.status}</td><td>${latestLoan.updatedDate}</td></tr>` : `<tr><td colspan="7">No data</td></tr>`;
    html += `</table><h3>Power</h3><table><tr><th>Monthly</th><th>Source</th><th>Connection</th><th>Updated</th></tr>`;
    html += latestPower ? `<tr><td>${latestPower.monthlyUsage}</td><td>${latestPower.powerSource}</td><td>${latestPower.connectionNumber}</td><td>${latestPower.updatedDate}</td></tr>` : `<tr><td colspan="4">No data</td></tr>`;
    html += `</table><h3>Water</h3><table><tr><th>Monthly (KL)</th><th>Source</th><th>Updated</th></tr>`;
    html += latestWater ? `<tr><td>${latestWater.monthlyUsage}</td><td>${latestWater.waterSource}</td><td>${latestWater.updatedDate}</td></tr>` : `<tr><td colspan="3">No data</td></tr>`;
    html += `</table><h3>Turnover</h3><table><tr><th>Amount</th><th>FY</th><th>Date</th><th>Updated</th></tr>`;
    html += latestTurn ? `<tr><td>${formatIndianCurrency(latestTurn.monthlyTurnover, true)}</td><td>${latestTurn.financialYear}</td><td>${latestTurn.turnoverDate}</td><td>${latestTurn.updatedDate}</td></tr>` : `<tr><td colspan="4">No data</td></tr>`;
    html += `</table><h3>CSR</h3><table><tr><th>Activity</th><th>Amount</th><th>Location</th><th>Date</th><th>Updated</th></tr>`;
    html += latestCSR ? `<tr><td>${latestCSR.activityName}</td><td>${formatIndianCurrency(latestCSR.amountSpent, true)}</td><td>${latestCSR.location}</td><td>${latestCSR.activityDate}</td><td>${latestCSR.updatedDate}</td></tr>` : `<tr><td colspan="5">No data</td></tr>`;
    html += `</table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${industry.name}_data.xls`; a.click();
    toast.success(`Downloaded data for ${industry.name}`);
  };

  const ProofLink = ({ fileName, fileData }: { fileName?: string; fileData?: string }) => {
    if (!fileName) return <span className="text-muted-foreground">—</span>;
    return (
      <Badge variant="outline" className={`gap-1 text-xs font-normal ${fileData ? 'cursor-pointer hover:bg-primary/10 transition-colors' : ''}`} onClick={() => fileData && openProofFile(fileData, fileName)}>
        <FileText className="h-3 w-3" />{fileName}
      </Badge>
    );
  };

  const tabConfig = [
    { value: "investments", label: "Investments", icon: DollarSign },
    { value: "employees", label: "Employees", icon: Users },
    { value: "loans", label: "Loans", icon: Building },
    { value: "power", label: "Power", icon: Zap },
    { value: "water", label: "Water", icon: Droplets },
    { value: "turnover", label: "Turnover", icon: TrendingUp },
    { value: "csr", label: "CSR", icon: Heart },
    { value: "ai-analytics", label: "Analytics", icon: BrainCircuit },
  ];  const handleVerifyAll = async (industryId: string) => {
    try {
      await verifyAll(industryId);
      toast.success("All industry data verified!");
      loadIndustryDetails(industryId);
    } catch (err: any) {
      toast.error("Failed to verify: " + err.message);
    }
  };

  const VerifyButton = ({ status }: { status: "pending" | "verified" }) => {
    if (status === "verified") {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-200 gap-1 rounded-full font-medium">
          <Sparkles className="h-3 w-3" />
          Verified
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 gap-1 rounded-full font-medium">
        <Activity className="h-3 w-3" />
        Pending
      </Badge>
    );
  };

  const renderDetails = (industryId: string) => {
    const d = detailData[industryId] || { inv: [], emp: [], loans: [], power: [], turn: [], csr: [], water: [], anoms: [] };
    const counts: Record<string, number> = {
      investments: d.inv.length,
      employees: d.emp.length,
      loans: d.loans.length,
      power: d.power.length,
      water: d.water.length,
      turnover: d.turn.length,
      csr: d.csr.length,
      "ai-analytics": 2
    };

    const InsightRow = ({ label, current, previous, icon: Icon, unit = "" }: { label: string, current: number, previous?: number, icon: any, unit?: string }) => {
      const growth = calculateGrowth(current, previous);
      const isCurrency = unit === "Rs.";
      const formatValue = (val: number) => isCurrency ? formatIndianCurrency(val) : `${val}${unit}`;
      
      return (
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="h-full"
        >
          <Card className="border-0 shadow-lg bg-card/60 backdrop-blur-sm border-l-4 border-l-primary/40 overflow-hidden relative group h-full">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <CardContent className="p-5 flex items-center justify-between gap-4 relative h-full">
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-0.5 truncate">{label}</h4>
                  <div className="flex items-baseline gap-2 overflow-hidden">
                    <span className="text-xl font-semibold tracking-tight text-foreground truncate">{formatValue(current)}</span>
                    {previous !== undefined && (
                      <span className="text-[10px] font-medium text-muted-foreground/50 shrink-0">
                        vs {formatValue(previous)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {growth ? (
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm ${growth.isIncrease ? 'bg-green-500/10 text-green-600 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'bg-red-500/10 text-red-600 shadow-[0_0_15px_rgba(239,68,68,0.1)]'}`}>
                    {growth.isIncrease ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    <span>{growth.percent.toFixed(1)}%</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-medium whitespace-nowrap">Growth Rate</span>
                </div>
              ) : (
                <div className="flex flex-col items-end">
                  <Badge variant="outline" className="text-[10px] border-muted/50 bg-muted/20 text-muted-foreground/70 px-2 py-0 h-5">Initial Entry</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      );
    };

    const latestEmp = d.emp.length > 0 ? d.emp[d.emp.length - 1] : undefined;

    return (
      <div className="space-y-6 relative">
        {/* AI Anomaly Alerts Trigger Button (SIPCOT Admin view) */}
        {d.anoms && d.anoms.length > 0 && (
          <div className="flex items-center justify-between bg-destructive/5 border border-destructive/10 p-4 rounded-xl animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-destructive">AI Anomaly Detection</h3>
                <p className="text-xs text-muted-foreground">Drastic data changes detected. Action may be required.</p>
              </div>
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                {(() => {
                  const pendingReasonCount = d.anoms.filter(a => !a.explanation).length;
                  return pendingReasonCount > 0 ? (
                    <Button variant="destructive" size="sm" className="gap-2 font-bold shadow-lg">
                      <Activity className="h-4 w-4" />
                      View AI Alerts
                      <Badge variant="secondary" className="ml-1 bg-white/20 text-white border-0 h-5 px-1.5 min-w-[1.25rem]">{pendingReasonCount}</Badge>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="gap-2 font-bold text-green-600 border-green-200 bg-green-50 hover:bg-green-100 hover:text-green-700 shadow-sm border-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Alerts Resolved
                    </Button>
                  );
                })()}
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col bg-background/95 backdrop-blur-md border-destructive/20">
                <DialogHeader className="shrink-0 p-6 pb-2 border-b">
                  <DialogTitle className="flex items-center gap-3 text-xl font-bold text-destructive">
                    <AlertTriangle className="h-6 w-6 animate-pulse" />
                    AI Anomaly Reports: {industriesList.find(i => i.id === industryId)?.name}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground mt-2">
                    Review detected anomalies and provided explanations for this industry.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                  <div className="flex flex-wrap gap-2 mb-6 p-3 bg-muted/30 rounded-xl border border-border/50">
                    <p className="w-full text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1 ml-1">Filter by Factor</p>
                    {['all', 'investment', 'employees', 'loan', 'power', 'turnover'].map((factor) => (
                      <Button
                        key={factor}
                        variant={anomalyFilter === factor ? "destructive" : "outline"}
                        size="sm"
                        className={`capitalize h-7 text-[10px] font-bold transition-all duration-300 ${anomalyFilter === factor ? 'shadow-md scale-105' : 'hover:bg-destructive/5'}`}
                        onClick={() => setAnomalyFilter(factor)}
                      >
                        {factor === 'all' ? 'All Factors' : factor}
                      </Button>
                    ))}
                  </div>

                  <div className="grid gap-6">
                    {d.anoms
                      .filter(a => anomalyFilter === 'all' || a.dataType === anomalyFilter)
                      .map((anom) => (
                      <Card key={anom.id} className={`border-l-4 ${anom.status === 'pending' ? 'border-l-destructive bg-destructive/5' : 'border-l-green-500 bg-green-500/5'} overflow-hidden shadow-sm`}>
                        <CardContent className="p-0">
                          <div className="p-4 sm:p-6 flex flex-col gap-4">
                            <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive shrink-0">
                                  <Activity className="h-5 w-5" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-lg capitalize tracking-tight">Sudden {anom.dataType} Change Detected</h4>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Detected on {new Date(anom.timestamp).toLocaleString()}</p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-[2fr_2fr_1fr] gap-4 bg-background/50 p-4 rounded-xl border border-destructive/10 max-w-2xl items-center">
                                <div className="space-y-1 min-w-0">
                                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider whitespace-nowrap">Previous Value</p>
                                  <p className="text-base font-semibold break-all">
                                    {anom.dataType === 'turnover' || anom.dataType === 'investment' || anom.dataType === 'loan' ? formatIndianCurrency(Number(anom.oldValue)) : Number(anom.oldValue)}
                                  </p>
                                </div>

                                <div className="space-y-1 border-l pl-4 border-destructive/10 min-w-0">
                                  <p className="text-[10px] uppercase font-bold text-destructive tracking-wider whitespace-nowrap">Current Value</p>
                                  <p className="text-lg font-black text-destructive break-all">
                                    {anom.dataType === 'turnover' || anom.dataType === 'investment' || anom.dataType === 'loan' ? formatIndianCurrency(Number(anom.newValue)) : Number(anom.newValue)}
                                  </p>
                                </div>
                                
                                <div className="flex flex-col items-center justify-center border-l border-destructive/10 pl-4">
                                  {Number(anom.newValue) > Number(anom.oldValue) ? (
                                    <>
                                      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-destructive/10 text-destructive mb-1">
                                        <ArrowUp className="h-4 w-4 stroke-[3]" />
                                      </div>
                                      <span className="text-[9px] font-bold uppercase tracking-tighter text-destructive">Increase</span>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-destructive/10 text-destructive mb-1">
                                        <ArrowDown className="h-4 w-4 stroke-[3]" />
                                      </div>
                                      <span className="text-[9px] font-bold uppercase tracking-tighter text-destructive">Decrease</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className={`${anom.explanation ? 'bg-primary/5 border-primary/10' : 'bg-muted/30 border-muted/20'} border p-4 rounded-xl relative overflow-hidden`}>
                                {anom.explanation && <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />}
                                <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-2 ${anom.explanation ? 'text-primary' : 'text-muted-foreground'}`}>Industry Explanation</p>
                                <p className={`text-sm italic leading-relaxed ${anom.explanation ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                                  {anom.explanation ? `"${anom.explanation}"` : "No explanation provided yet."}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          )}

        <Tabs defaultValue="investments" className="mt-4">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-xl">
            {tabConfig.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg transition-all">
              <tab.icon className="h-3.5 w-3.5" />{tab.label}
            </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="investments">
            <Card className="border-0 shadow-md">
              <CardContent className="pt-4 px-0 sm:px-6"> {/* Reduce padding if needed, but overflow is more important */}
                <div className="overflow-x-auto scrollbar-thin">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="whitespace-nowrap">Amount</TableHead>
                        <TableHead className="whitespace-nowrap">Type</TableHead>
                        <TableHead className="whitespace-nowrap">Date</TableHead>
                        <TableHead className="whitespace-nowrap">Action</TableHead>
                        <TableHead className="whitespace-nowrap">Proof</TableHead>
                        <TableHead className="whitespace-nowrap">Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.inv.length ? d.inv.map(i => (
                        <TableRow key={i.id} className="hover:bg-primary/5">
                          <TableCell className="font-semibold whitespace-nowrap" title={`Rs. ${i.totalAmount.toLocaleString('en-IN')}`}>{formatIndianCurrency(i.totalAmount)}</TableCell>
                          <TableCell className="whitespace-nowrap"><Badge variant="secondary" className="rounded-full">{i.investmentType}</Badge></TableCell>
                          <TableCell className="whitespace-nowrap">{i.investmentDate}</TableCell>
                          <TableCell className="whitespace-nowrap"><VerifyButton status={i.verificationStatus} /></TableCell>
                          <TableCell className="whitespace-nowrap"><ProofLink fileName={i.proofFileName} fileData={i.proofFileData} /></TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{i.updatedDate}</TableCell>
                        </TableRow>
                      )) : <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees">
            <Card className="border-0 shadow-md">
              <CardContent className="pt-4 px-0 sm:px-6">
                <div className="overflow-x-auto scrollbar-thin">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="whitespace-nowrap">Male</TableHead>
                        <TableHead className="whitespace-nowrap">Female</TableHead>
                        <TableHead className="whitespace-nowrap">Total</TableHead>
                        <TableHead className="whitespace-nowrap">Action</TableHead>
                        <TableHead className="whitespace-nowrap">Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.emp.length ? d.emp.map(e => (
                        <TableRow key={e.id} className="hover:bg-primary/5">
                          <TableCell className="whitespace-nowrap">{e.male}</TableCell>
                          <TableCell className="whitespace-nowrap">{e.female}</TableCell>
                          <TableCell className="font-semibold whitespace-nowrap">{e.male + e.female}</TableCell>
                          <TableCell className="whitespace-nowrap"><VerifyButton status={e.verificationStatus} /></TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{e.updatedDate}</TableCell>
                        </TableRow>
                      )) : <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loans">
            <Card className="border-0 shadow-md">
              <CardContent className="pt-4 px-0 sm:px-6">
                <div className="overflow-x-auto scrollbar-thin">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="whitespace-nowrap">Amount</TableHead>
                        <TableHead className="whitespace-nowrap">Bank</TableHead>
                        <TableHead className="whitespace-nowrap">Rate</TableHead>
                        <TableHead className="whitespace-nowrap">Tenure</TableHead>
                        <TableHead className="whitespace-nowrap">EMI</TableHead>
                        <TableHead className="whitespace-nowrap">Status</TableHead>
                        <TableHead className="whitespace-nowrap">Action</TableHead>
                        <TableHead className="whitespace-nowrap">Proof</TableHead>
                        <TableHead className="whitespace-nowrap">Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.loans.length ? d.loans.map(l => (
                        <TableRow key={l.id} className="hover:bg-primary/5">
                          <TableCell className="font-semibold whitespace-nowrap" title={`Rs. ${l.loanAmount.toLocaleString('en-IN')}`}>{formatIndianCurrency(l.loanAmount)}</TableCell>
                          <TableCell className="whitespace-nowrap">{l.bank}</TableCell>
                          <TableCell className="whitespace-nowrap">{l.interestRate}%</TableCell>
                          <TableCell className="whitespace-nowrap">{l.tenure} mo</TableCell>
                          <TableCell className="whitespace-nowrap" title={`Rs. ${l.emi.toLocaleString('en-IN')}`}>{formatIndianCurrency(l.emi)}</TableCell>
                          <TableCell className="whitespace-nowrap"><Badge className="rounded-full">{l.status}</Badge></TableCell>
                          <TableCell className="whitespace-nowrap"><VerifyButton status={l.verificationStatus} /></TableCell>
                          <TableCell className="whitespace-nowrap"><ProofLink fileName={l.proofFileName} fileData={l.proofFileData} /></TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{l.updatedDate}</TableCell>
                        </TableRow>
                      )) : <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="power">
            <Card className="border-0 shadow-md">
              <CardContent className="pt-4 px-0 sm:px-6">
                <div className="overflow-x-auto scrollbar-thin">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="whitespace-nowrap">Monthly (kWh)</TableHead>
                        <TableHead className="whitespace-nowrap">Source</TableHead>
                        <TableHead className="whitespace-nowrap">Connection</TableHead>
                        <TableHead className="whitespace-nowrap">Action</TableHead>
                        <TableHead className="whitespace-nowrap">Proof</TableHead>
                        <TableHead className="whitespace-nowrap">Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.power.length ? d.power.map(p => (
                        <TableRow key={p.id} className="hover:bg-primary/5">
                          <TableCell className="font-semibold whitespace-nowrap">{p.monthlyUsage} kWh</TableCell>
                          <TableCell className="whitespace-nowrap"><Badge variant="outline" className="rounded-full">{p.powerSource}</Badge></TableCell>
                          <TableCell className="whitespace-nowrap">{p.connectionNumber}</TableCell>
                          <TableCell className="whitespace-nowrap"><VerifyButton status={p.verificationStatus} /></TableCell>
                          <TableCell className="whitespace-nowrap"><ProofLink fileName={p.proofFileName} fileData={p.proofFileData} /></TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{p.updatedDate}</TableCell>
                        </TableRow>
                      )) : <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="water">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Droplets className="h-5 w-5 text-info" />Add Water Consumption</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    <div><Label>Monthly Usage (KL)</Label><Input type="number" value={waterMonthly} onChange={e => setWaterMonthly(e.target.value)} onWheel={(e) => (e.target as HTMLInputElement).blur()} placeholder="0" className="bg-background" /></div>
                  <div>
                    <Label>Water Source</Label>
                    <Select value={waterSource} onValueChange={v => setWaterSource(v as "SIPCOT" | "Borewell" | "Both")}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SIPCOT">SIPCOT</SelectItem>
                        <SelectItem value="Borewell">Borewell</SelectItem>
                        <SelectItem value="Both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1"><Upload className="h-3 w-3" /> Upload Proof</Label>
                    <Input ref={waterFileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.png,.jpeg" onChange={e => { if (e.target.files?.[0]) { setWaterProofName(e.target.files[0].name); setWaterFile(e.target.files[0]); } }} className="bg-background" />
                    {waterProofName && <p className="text-xs text-muted-foreground">📎 {waterProofName}</p>}
                  </div>
                  <Button onClick={() => addWater(industryId)} className="w-full bg-gradient-to-r from-secondary to-info hover:opacity-90"><Plus className="mr-1 h-4 w-4" />Add</Button>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md">
                <CardHeader><CardTitle className="text-lg">Water Records</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto scrollbar-thin">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="whitespace-nowrap">Monthly (KL)</TableHead>
                          <TableHead className="whitespace-nowrap">Source</TableHead>
                          <TableHead className="whitespace-nowrap">Action</TableHead>
                          <TableHead className="whitespace-nowrap">Proof</TableHead>
                          <TableHead className="whitespace-nowrap">Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {d.water.length ? d.water.map(w => (
                          <TableRow key={w.id} className="hover:bg-primary/5">
                            <TableCell className="font-semibold whitespace-nowrap">{w.monthlyUsage} KL</TableCell>
                            <TableCell className="whitespace-nowrap"><Badge variant="outline" className="rounded-full">{w.waterSource}</Badge></TableCell>
                            <TableCell className="whitespace-nowrap"><VerifyButton status={w.verificationStatus} /></TableCell>
                            <TableCell className="whitespace-nowrap"><ProofLink fileName={w.proofFileName} fileData={w.proofFileData} /></TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{w.updatedDate}</TableCell>
                          </TableRow>
                        )) : <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="turnover">
            <Card className="border-0 shadow-md">
              <CardContent className="pt-4 px-0 sm:px-6">
                <div className="overflow-x-auto scrollbar-thin">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="whitespace-nowrap">Amount</TableHead>
                        <TableHead className="whitespace-nowrap">FY</TableHead>
                        <TableHead className="whitespace-nowrap">Date</TableHead>
                        <TableHead className="whitespace-nowrap">Action</TableHead>
                        <TableHead className="whitespace-nowrap">Proof</TableHead>
                        <TableHead className="whitespace-nowrap">Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.turn.length ? d.turn.map(t => (
                        <TableRow key={t.id} className="hover:bg-primary/5">
                          <TableCell className="font-semibold whitespace-nowrap" title={`Rs. ${t.monthlyTurnover.toLocaleString('en-IN')}`}>{formatIndianCurrency(t.monthlyTurnover)}</TableCell>
                          <TableCell className="whitespace-nowrap">{t.financialYear}</TableCell>
                          <TableCell className="whitespace-nowrap">{t.turnoverDate}</TableCell>
                          <TableCell className="whitespace-nowrap"><VerifyButton status={t.verificationStatus} /></TableCell>
                          <TableCell className="whitespace-nowrap"><ProofLink fileName={t.proofFileName} fileData={t.proofFileData} /></TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{t.updatedDate}</TableCell>
                        </TableRow>
                      )) : <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="csr">
            <Card className="border-0 shadow-md">
              <CardContent className="pt-4 px-0 sm:px-6">
                <div className="overflow-x-auto scrollbar-thin">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="whitespace-nowrap">Activity</TableHead>
                        <TableHead className="whitespace-nowrap">Amount</TableHead>
                        <TableHead className="whitespace-nowrap">Location</TableHead>
                        <TableHead className="whitespace-nowrap">Date</TableHead>
                        <TableHead className="whitespace-nowrap">Action</TableHead>
                        <TableHead className="whitespace-nowrap">Proof</TableHead>
                        <TableHead className="whitespace-nowrap">Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.csr.length ? d.csr.map(c => (
                        <TableRow key={c.id} className="hover:bg-primary/5">
                          <TableCell className="whitespace-nowrap">{c.activityName}</TableCell>
                          <TableCell className="font-semibold whitespace-nowrap" title={`Rs. ${c.amountSpent.toLocaleString('en-IN')}`}>{formatIndianCurrency(c.amountSpent)}</TableCell>
                          <TableCell className="whitespace-nowrap">{c.location}</TableCell>
                          <TableCell className="whitespace-nowrap">{c.activityDate}</TableCell>
                          <TableCell className="whitespace-nowrap"><VerifyButton status={c.verificationStatus} /></TableCell>
                          <TableCell className="whitespace-nowrap"><ProofLink fileName={c.proofFileName} fileData={c.proofFileData} /></TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{c.updatedDate}</TableCell>
                        </TableRow>
                      )) : <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-analytics">
            <div className="space-y-6 pt-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <BrainCircuit className="h-6 w-6 text-primary" />
                    Industry Performance Analytics
                  </h3>
                  <p className="text-sm text-muted-foreground">Comparative summary of current vs previous records for this industry</p>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                {(() => {
                  const v = {
                    inv: d.inv.filter(x => x.verificationStatus === 'verified'),
                    emp: d.emp.filter(x => x.verificationStatus === 'verified'),
                    loans: d.loans.filter(x => x.verificationStatus === 'verified'),
                    power: d.power.filter(x => x.verificationStatus === 'verified'),
                    turn: d.turn.filter(x => x.verificationStatus === 'verified'),
                    csr: d.csr.filter(x => x.verificationStatus === 'verified'),
                    water: d.water.filter(x => x.verificationStatus === 'verified')
                  };
                  return (
                    <>
                      <InsightRow 
                        label="Total Investment"
                        current={v.inv.length > 0 ? v.inv[v.inv.length - 1].totalAmount : 0}
                        previous={v.inv.length >= 2 ? v.inv[v.inv.length - 2].totalAmount : undefined}
                        icon={DollarSign}
                        unit="Rs."
                      />
                      
                      <InsightRow 
                        label="Monthly Turnover"
                        current={v.turn.length > 0 ? v.turn[v.turn.length - 1].monthlyTurnover : 0}
                        previous={v.turn.length >= 2 ? v.turn[v.turn.length - 2].monthlyTurnover : undefined}
                        icon={TrendingUp}
                        unit="Rs."
                      />
                      
                      <InsightRow 
                        label="Total Employees"
                        current={v.emp.length > 0 ? v.emp[v.emp.length - 1].male + v.emp[v.emp.length - 1].female : 0}
                        previous={v.emp.length >= 2 ? v.emp[v.emp.length - 2].male + v.emp[v.emp.length - 2].female : undefined}
                        icon={Users}
                      />
                      

                      
                      <InsightRow 
                        label="CSR Contribution"
                        current={v.csr.length > 0 ? v.csr[v.csr.length - 1].amountSpent : 0}
                        previous={v.csr.length >= 2 ? v.csr[v.csr.length - 2].amountSpent : undefined}
                        icon={Heart}
                        unit="Rs."
                      />
                    </>
                  );
                })()}
              </div>

              {/* Future Forecast Section */}
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  <h3 className="text-lg font-bold">Future Forecast</h3>
                </div>
                
                <div className="w-full">
                  {(() => {
                    const verifiedTurnover = d.turn.filter(x => x.verificationStatus === 'verified');
                    const turnData = getTurnoverData(verifiedTurnover);
                    const turnPoints = preparePredictionData(turnData, 'amount');
                    const count = 36; // 3 years
                    const futureValues = predictFutureValues(turnPoints, count);

                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    
                    const chartPoints = turnData.map((data, idx) => ({
                      date: data.date,
                      actual: data.amount,
                      forecast: idx === turnData.length - 1 ? data.amount : null
                    }));
                    
                    if (futureValues.length >= 36) {
                      const lastDate = verifiedTurnover.length > 0 ? new Date(verifiedTurnover[verifiedTurnover.length - 1].turnoverDate) : new Date();
                      const val = futureValues[35]; // 3rd year
                      const nextDate = new Date(lastDate);
                      nextDate.setMonth(lastDate.getMonth() + 36);
                      const monthLabel = months[nextDate.getMonth()];
                      const yearLabel = nextDate.getFullYear().toString().slice(-2);
                      
                      chartPoints.push({
                        date: `${monthLabel} '${yearLabel}*`,
                        actual: null,
                        forecast: val,
                        isForecast: true
                      } as any);
                    }

                    return (
                      <div className="space-y-6">
                        <div className="w-full">
                          <Card className="border-0 shadow-lg bg-gradient-to-br from-accent/5 to-warning/5 border-l-4 border-l-accent/60 w-full font-bold">
                            <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">3-Year Turnover Forecast</h4>
                                <Badge variant="secondary" className="bg-accent/20 text-accent hover:bg-accent/30 border-0 text-[10px]">AI PREDICTION MODEL</Badge>
                              </div>
                              {futureValues.length > 0 && turnPoints.length >= 5 ? (
                                <div className="space-y-1">
                                  <div className="flex items-baseline justify-between">
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-2xl font-bold text-foreground">{formatIndianCurrency(futureValues[35])}</span>
                                    </div>
                                    {(() => {
                                      const nextValue = futureValues[0];
                                      const growth = calculateGrowth(nextValue, turnPoints[turnPoints.length-1].y);
                                      if (!growth) return null;
                                      return (
                                        <Badge variant="outline" className={`text-[10px] py-0 h-5 px-1.5 ${growth.isIncrease ? 'border-green-500/30 text-green-600 bg-green-500/10' : 'border-red-500/30 text-red-600 bg-red-500/10'}`}>
                                          3rd Year: {growth.isIncrease ? '+' : '-'}{growth.percent.toFixed(1)}% {growth.isIncrease ? 'Increase' : 'Decrease'}
                                        </Badge>
                                      );
                                    })()}
                                  </div>
                                  
                                </div>
                              ) : (
                                <div className="py-2">
                                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                                    <AlertCircle className="h-3 w-3 text-amber-500" />
                                    Need at least 5 records for prediction
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>

                        {futureValues.length > 0 && turnPoints.length >= 5 && (
                          <Card className="border-0 shadow-lg bg-card/40 backdrop-blur-sm overflow-hidden">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-accent" />
                                3-Year Turnover Trend & Forecast
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="h-[400px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={chartPoints} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                    <defs>
                                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                      </linearGradient>
                                      <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                    <XAxis 
                                      dataKey="date" 
                                      axisLine={false} 
                                      tickLine={false} 
                                      tick={<CustomAxisTick />}
                                      interval={0}
                                      height={75}
                                    />
                                    <YAxis 
                                      axisLine={false} 
                                      tickLine={false} 
                                      tick={{ fontSize: 10, fill: '#888' }}
                                      tickFormatter={(val) => {
                                        if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
                                        if (val >= 100000) return `₹${(val / 100000).toFixed(0)}L`;
                                        return `₹${val}`;
                                      }}
                                    />
                                    <Tooltip 
                                      content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                          const itm = payload[0].payload;
                                          const val = itm.isForecast ? itm.forecast : itm.actual;
                                          return (
                                            <div className="bg-background/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-xl">
                                              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
                                                {itm.isForecast ? '3-Year Forecast' : 'Actual Monthly Turnover'}
                                              </p>
                                              <p className="text-lg font-bold text-foreground">{formatIndianCurrency(val)}</p>
                                              <p className="text-[10px] text-muted-foreground italic">{itm.date}</p>
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                    <Area 
                                      type="monotone" 
                                      dataKey="actual" 
                                      stroke="hsl(var(--primary))" 
                                      strokeWidth={3}
                                      fillOpacity={1} 
                                      fill="url(#colorAmount)"
                                      animationDuration={1500}
                                      dot={{ r: 4, fill: "hsl(var(--primary))" }}
                                      activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                    <Area 
                                      type="monotone" 
                                      dataKey="forecast" 
                                      stroke="#f59e0b" 
                                      strokeWidth={3}
                                      strokeDasharray="5 5"
                                      fillOpacity={1} 
                                      fill="url(#colorForecast)"
                                      animationDuration={2000}
                                      dot={(props: any) => {
                                        const { cx, cy, payload } = props;
                                        if (payload.isForecast) {
                                          return (
                                            <circle cx={cx} cy={cy} r={6} fill="#f59e0b" stroke="#fff" strokeWidth={2} />
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="flex items-center justify-center gap-6 mt-4 pb-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-0.5 w-4 bg-primary" />
                                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Historical Actuals</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="h-0.5 w-4 bg-amber-500 border-t-2 border-dashed border-amber-500" />
                                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Predictions</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <FloatingChat 
          currentUser={user} 
          industryId={industryId} 
          otherPartyName={`Industry: ${industriesList.find(i => i.id === industryId)?.name || "Admin"}`}
        />
      </div>
    );
  };

  return (
    <DashboardLayout
      title={sipcot?.name || "SIPCOT Admin"}
      subtitle={`${sipcot?.district || ""} District · ${industriesList.length} Industries`}
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <FileText className="h-4 w-4" />
              Generate Report
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-background border shadow-md z-50">
            <DropdownMenuItem onClick={generateReport} className="cursor-pointer">
              Download Excel (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={generatePDFReport} className="cursor-pointer">
              Download PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      {!selectedIndustry && (
        <div className="mb-6">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "dashboard" | "deadline")} className="w-full">
            <TabsList className="bg-muted/50 p-1 rounded-xl w-full sm:w-auto">
              <TabsTrigger value="list" className="gap-1.5 rounded-lg flex-1 sm:flex-initial"><Factory className="h-4 w-4" />Industry List</TabsTrigger>
              <TabsTrigger value="dashboard" className="gap-1.5 rounded-lg flex-1 sm:flex-initial"><Activity className="h-4 w-4" />Overall Dashboard</TabsTrigger>
              <TabsTrigger value="deadline" className="gap-1.5 rounded-lg flex-1 sm:flex-initial"><Calendar className="h-4 w-4" />Set Deadline</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {!selectedIndustry && viewMode === "deadline" && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Set Submission Deadline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Data Submission Deadline</Label>
                  <Input 
                    type="date" 
                    value={deadlineDate} 
                    onChange={e => setDeadlineDate(e.target.value)} 
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">Sets a deadline and notifies all assigned industries.</p>
                </div>
                <Button 
                  onClick={handleSetDeadline} 
                  disabled={isSettingDeadline}
                  className="w-full bg-gradient-to-r from-primary to-info hover:opacity-90"
                >
                  {isSettingDeadline ? "Updating..." : "Set Deadline"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!selectedIndustry && viewMode === "dashboard" && (
        <div className="space-y-6">
          <div className="pt-6 border-t border-muted/50">
            <h3 className="font-display text-xl font-bold mb-6 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Industry-wise Comparison
            </h3>

            {stats.overallInsights && stats.overallInsights.length > 0 && (
              <div className="mb-8">
                <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Overall SIPCOT AI Insights
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {stats.overallInsights.map((insight, i) => (
                    <InsightCard 
                      key={i} 
                      title={insight.title} 
                      description={insight.description} 
                      type={insight.type as InsightType} 
                      delay={i * 0.1} 
                    />
                  ))}
                </div>
              </div>
            )}



            {/* Removed Industry Ranking Leaderboard from here as requested to be separate */}
            
          </div>
        </div>
      )}

      {!selectedIndustry && viewMode === "list" && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-muted-foreground uppercase tracking-wider text-xs">Industries</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 text-primary shadow-sm h-10 px-6 font-bold text-sm bg-primary/5">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    View Performance Rankings
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-background border shadow-2xl p-0 overflow-hidden">
                  <DialogHeader className="p-6 bg-muted/20 border-b">
                    <DialogTitle className="flex items-center gap-3 text-xl font-bold">
                      <Trophy className="h-6 w-6 text-yellow-500" />
                      Smart KPI Industry Rankings
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">Industries ranked by Investment, Employment, Turnover, CSR and Efficiency scores.</p>
                  </DialogHeader>
                  <div className="p-0 max-h-[60vh] overflow-y-auto scrollbar-thin">
                    <div className="divide-y">
                      {stats.industryComparisonData.map((ind, idx) => (
                        <div key={ind.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-base shadow-sm ${
                              idx === 0 ? "bg-yellow-400 text-yellow-900 ring-2 ring-yellow-400/20" :
                              idx === 1 ? "bg-slate-300 text-slate-800" :
                              idx === 2 ? "bg-orange-300 text-orange-900" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {idx + 1}
                            </div>
                            <div>
                              <div className="font-bold text-base leading-tight">{ind.name}</div>
                              <div className="flex gap-2 mt-1">
                                 <Badge variant="secondary" className="text-[10px] px-2 py-0 h-4 bg-primary/10 text-primary border-primary/20">KPI Score: {ind.performanceScore.toFixed(1)}/100</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-foreground">{formatIndianCurrency(ind.turnover)}</div>
                            <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Turnover</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search industries..." value={searchIndustry} onChange={e => setSearchIndustry(e.target.value)} className="pl-9 bg-background" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stats.industryComparisonData
                .filter(ind => ind.name.toLowerCase().includes(searchIndustry.toLowerCase()))
                .map((ind, i) => {
                const d = detailData[ind.id];
                const latestInv = ind.investment;
                const latestEmp = ind.totalEmployees;
                
                const hasPendingData = d && [
                  ...d.inv, ...d.emp, ...d.loans, ...d.power, ...d.turn, ...d.csr, ...d.water
                ].some(r => r.verificationStatus === 'pending');

                return (
                  <motion.div key={ind.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
                    <Card 
                      className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/30 border-0 shadow-md group overflow-hidden relative"
                    >
                      {hasPendingData && (
                        <div className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full border border-background shadow-sm z-10" title="Pending Verification" />
                      )}
                      
                      {/* Deadline Status Badge */}
                      {deadlineDate && (() => {
                        const dDate = new Date(deadlineDate);
                        const tDate = new Date();
                        const diffDays = Math.ceil((dDate.getTime() - tDate.getTime()) / (1000 * 3600 * 24));
                        
                        const sDateStr = sipcot?.deadlineSetDate || "1970-01-01";
                        const hasInv   = d?.inv.some(r => r.updatedDate && r.updatedDate >= sDateStr) ?? false;
                        const hasEmp   = d?.emp.some(r => r.updatedDate && r.updatedDate >= sDateStr) ?? false;
                        const hasLoans = d?.loans.some(r => r.updatedDate && r.updatedDate >= sDateStr) ?? false;
                        const hasPower = d?.power.some(r => r.updatedDate && r.updatedDate >= sDateStr) ?? false;
                        const hasTurn  = d?.turn.some(r => r.updatedDate && r.updatedDate >= sDateStr) ?? false;
                        const hasCsr   = d?.csr.some(r => r.updatedDate && r.updatedDate >= sDateStr) ?? false;
                        const submittedThisMonth = hasInv && hasEmp && hasLoans && hasPower && hasTurn && hasCsr;

                        if (submittedThisMonth) {
                          return <div className="absolute top-1.5 right-6 px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded-full border border-green-200 z-10">Submitted</div>;
                        } else if (diffDays < 0) {
                          return <div className="absolute top-1.5 right-6 px-2 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded-full border border-red-200 z-10">Delayed</div>;
                        } else if (diffDays <= 3) {
                          return <div className="absolute top-1.5 right-6 px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-full border border-amber-200 z-10">Reminder</div>;
                        } else {
                          return <div className="absolute top-1.5 right-6 px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded-full border border-blue-200 z-10">Not Submitted</div>;
                        }
                      })()}


                      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-secondary/[0.02] group-hover:from-primary/[0.06] group-hover:to-secondary/[0.06] transition-all duration-300" />
                      <CardContent className="flex items-center gap-4 p-5 relative">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-warning shadow-md group-hover:shadow-lg transition-shadow">
                          <Factory className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0" onClick={() => setSelectedIndustry(ind as any)}>
                          <h3 className="font-display font-semibold truncate group-hover:text-primary transition-colors">{ind.name}</h3>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 items-center">
                            <div className="flex items-center gap-1.5 min-w-[120px]">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">Inv: {latestInv ? formatIndianCurrency(latestInv) : 'Rs. 0'}</span>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Emp: {latestEmp}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => downloadExcel(ind as any)} className="hover:bg-primary/10">
                          <FileSpreadsheet className="h-4 w-4 text-primary" />
                        </Button>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" onClick={() => setSelectedIndustry(ind as any)} />
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
              {industriesList.length === 0 && <p className="text-muted-foreground col-span-full text-center py-12">No industries assigned yet.</p>}
            </div>
          </div>
        </div>
      )}
      {selectedIndustry && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedIndustry(null)} className="hover:bg-primary/10">← Back</Button>
              <Button variant="outline" size="sm" onClick={() => downloadExcel(selectedIndustry)} className="gap-1.5"><FileSpreadsheet className="h-4 w-4" />Download Excel</Button>
            </div>
            
            {detailData[selectedIndustry.id] && [
              ...detailData[selectedIndustry.id].inv,
              ...detailData[selectedIndustry.id].emp,
              ...detailData[selectedIndustry.id].loans,
              ...detailData[selectedIndustry.id].power,
              ...detailData[selectedIndustry.id].turn,
              ...detailData[selectedIndustry.id].csr,
              ...detailData[selectedIndustry.id].water
            ].some(r => r.verificationStatus === 'pending') && (
              <Button 
                onClick={() => handleVerifyAll(selectedIndustry.id)}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md gap-2 px-6"
              >
                <Activity className="h-4 w-4" />
                Verify All Industry Data
              </Button>
            )}
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">{selectedIndustry.name}</h2>
          {renderDetails(selectedIndustry.id)}
        </div>
      )}
    </DashboardLayout>
  );
};

export default SipcotAdmin;
