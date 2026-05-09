import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  investments, employees, termLoans, powerUsages, turnovers, csrEntries, openProofFile,
  getIndustries, getSIPCOTs, anomalies,
  type Investment, type Employee, type TermLoan, type PowerUsage, type Turnover, type CSR, type Anomaly,
} from "@/lib/store";
import {
  Plus, DollarSign, Users, Building, Zap, TrendingUp, Heart, FileText, Upload,
  BrainCircuit, Sparkles, TrendingDown, Activity, Lightbulb, MessageSquare, AlertTriangle, Bell, CheckCircle, ArrowUp, ArrowDown
} from "lucide-react";
import { FloatingChat } from "@/components/FloatingChat";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { formatIndianCurrency } from "@/lib/formatCurrency";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, AreaChart, Area
} from "recharts";
import {
  getInvestmentData,
  getTurnoverData,
  predictFutureValues,
  preparePredictionData,
  calculateGrowth
} from "@/lib/analytics";



const preventScrollChange = (e: React.WheelEvent<HTMLInputElement>) => {
  (e.target as HTMLInputElement).blur();
};

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

const IndustryAdmin = () => {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  const [invAmount, setInvAmount] = useState("");
  const [invDate, setInvDate] = useState(today);
  const [invType, setInvType] = useState<"Initial" | "Additional">("Initial");
  const [invFile, setInvFile] = useState<File | undefined>();
  const [invProofName, setInvProofName] = useState("");

  const [empMale, setEmpMale] = useState("");
  const [empFemale, setEmpFemale] = useState("");

  const [loanAmount, setLoanAmount] = useState("");
  const [loanBank, setLoanBank] = useState("");
  const [loanRate, setLoanRate] = useState("");
  const [loanTenure, setLoanTenure] = useState("");
  const [loanEmi, setLoanEmi] = useState("");
  const [loanStatus, setLoanStatus] = useState("Active");
  const [loanFile, setLoanFile] = useState<File | undefined>();
  const [loanProofName, setLoanProofName] = useState("");


  const [powerMonthly, setPowerMonthly] = useState("");
  const [powerSource, setPowerSource] = useState<"TNEB" | "Generator" | "Solar">("TNEB");
  const [powerConn, setPowerConn] = useState("");
  const [powerFile, setPowerFile] = useState<File | undefined>();
  const [powerProofName, setPowerProofName] = useState("");

  const [turnMonthly, setTurnMonthly] = useState("");
  const [turnFY, setTurnFY] = useState("2024-25");
  const [turnDate, setTurnDate] = useState(today);
  const [turnFile, setTurnFile] = useState<File | undefined>();
  const [turnProofName, setTurnProofName] = useState("");

  const [csrName, setCsrName] = useState("");
  const [csrDesc, setCsrDesc] = useState("");
  const [csrAmount, setCsrAmount] = useState("");
  const [csrDate, setCsrDate] = useState(today);
  const [csrLocation, setCsrLocation] = useState("");
  const [csrFile, setCsrFile] = useState<File | undefined>();
  const [csrProofName, setCsrProofName] = useState("");


  const invFileRef = useRef<HTMLInputElement>(null);
  const loanFileRef = useRef<HTMLInputElement>(null);
  const powerFileRef = useRef<HTMLInputElement>(null);
  const turnFileRef = useRef<HTMLInputElement>(null);
  const csrFileRef = useRef<HTMLInputElement>(null);

  // Data state
  const [inv, setInv] = useState<Investment[]>([]);
  const [emp, setEmp] = useState<Employee[]>([]);
  const [loans, setLoans] = useState<TermLoan[]>([]);
  const [power, setPower] = useState<PowerUsage[]>([]);
  const [turn, setTurn] = useState<Turnover[]>([]);
  const [csr, setCsr] = useState<CSR[]>([]);
  const [industryAnomalies, setIndustryAnomalies] = useState<Anomaly[]>([]);
  const [explanationTexts, setExplanationTexts] = useState<Record<string, string>>({});

  const [deadline, setDeadline] = useState<string | null>(null);
  const [deadlineSetDate, setDeadlineSetDate] = useState<string | null>(null);

  const industryId = user?.industryId || "";

  const loadData = useCallback(async () => {
    if (!industryId) return;
    const [i, e, l, p, t, c, inds, sips, anoms] = await Promise.all([
      investments.getByIndustry(industryId),
      employees.getByIndustry(industryId),
      termLoans.getByIndustry(industryId),
      powerUsages.getByIndustry(industryId),
      turnovers.getByIndustry(industryId),
      csrEntries.getByIndustry(industryId),
      getIndustries(),
      getSIPCOTs(),
      anomalies.getByIndustry(industryId),
    ]);
    setInv(i); setEmp(e); setLoans(l); setPower(p); setTurn(t); setCsr(c);
    setIndustryAnomalies(anoms);

    const industry = inds.find(x => x.id === industryId);
    if (industry) {
      const sipcot = sips.find(x => x.id === industry.sipcotId);
      if (sipcot?.submissionDeadline) {
        setDeadline(sipcot.submissionDeadline);
        setDeadlineSetDate(sipcot.deadlineSetDate || null);
      }
    }
  }, [industryId]);

  useEffect(() => { loadData(); }, [loadData]);

  const calculateGrowthMeta = (current: number, previous?: number) => {
    if (previous === undefined || previous === 0) return null;
    const rawGrowth = ((current - previous) / previous) * 100;
    return {
      percent: Math.min(100, Math.abs(rawGrowth)),
      isIncrease: rawGrowth >= 0
    };
  };

  const isCurrencyAnomaly = (type: string) =>
    ['turnover', 'investment', 'loan'].includes(type);

  const InsightRow = ({ label, current, previous, icon: Icon, unit = "" }: { label: string, current: number, previous?: number, icon: any, unit?: string }) => {
    const growth = calculateGrowthMeta(current, previous);
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

  if (!user || user.role !== "industry_admin" || !user.industryId) return <Navigate to="/" />;

  const latestInv = inv.length > 0 ? inv[inv.length - 1] : undefined;
  const latestEmp = emp.length > 0 ? emp[emp.length - 1] : undefined;
  const latestTurn = turn.length > 0 ? turn[turn.length - 1] : undefined;

  const addInvestment = async () => {
    if (!invAmount) { toast.error("Enter amount"); return; }
    const res = await investments.add({ industryId, totalAmount: Number(invAmount), investmentDate: invDate, investmentType: invType, proofFileName: invProofName || undefined, updatedDate: today } as any, invFile) as any;
    if (res.anomalyDetected) {
      toast.warning("AI detected an anomaly in your investment data. Please provide an explanation.");
    } else {
      toast.success("Investment added!");
    }
    setInvAmount(""); setInvProofName(""); setInvFile(undefined);
    if (invFileRef.current) invFileRef.current.value = "";
    loadData();
  };

  const addEmployee = async () => {
    if (!empMale || !empFemale) { toast.error("Fill employee counts"); return; }
    const res = await employees.add({ industryId, male: Number(empMale), female: Number(empFemale), updatedDate: today } as any) as any;
    if (res.anomalyDetected) {
      toast.warning("AI detected an anomaly in employment data. Please provide an explanation.");
    } else {
      toast.success("Employee data added!");
    }
    setEmpMale(""); setEmpFemale("");
    loadData();
  };

  const addLoan = async () => {
    if (!loanAmount || !loanBank) { toast.error("Fill loan details"); return; }
    const res = await termLoans.add({ industryId, loanAmount: Number(loanAmount), bank: loanBank, interestRate: Number(loanRate), tenure: Number(loanTenure), emi: Number(loanEmi), status: loanStatus, proofFileName: loanProofName || undefined, updatedDate: today } as any, loanFile) as any;
    if (res.anomalyDetected) {
      toast.warning("AI detected an anomaly in loan data. Please provide an explanation.");
    } else {
      toast.success("Loan added!");
    }
    setLoanAmount(""); setLoanBank(""); setLoanRate(""); setLoanTenure(""); setLoanEmi(""); setLoanProofName(""); setLoanFile(undefined);
    if (loanFileRef.current) loanFileRef.current.value = "";
    loadData();
  };


  const addPower = async () => {
    if (!powerMonthly) { toast.error("Fill power usage"); return; }
    const res = await powerUsages.add({ industryId, monthlyUsage: Number(powerMonthly), powerSource, connectionNumber: powerConn, proofFileName: powerProofName || undefined, updatedDate: today } as any, powerFile) as any;
    if (res.anomalyDetected) {
      toast.warning("AI detected an anomaly in power usage. Please provide an explanation.");
    } else {
      toast.success("Power usage added!");
    }
    setPowerMonthly(""); setPowerConn(""); setPowerProofName(""); setPowerFile(undefined);
    if (powerFileRef.current) powerFileRef.current.value = "";
    loadData();
  };

  const addTurnover = async () => {
    if (!turnMonthly) { toast.error("Fill turnover"); return; }
    const res = await turnovers.add({ industryId, monthlyTurnover: Number(turnMonthly), financialYear: turnFY, turnoverDate: turnDate, proofFileName: turnProofName || undefined, updatedDate: today } as any, turnFile) as any;
    if (res.anomalyDetected) {
      toast.warning("AI detected an anomaly in turnover data. Please provide an explanation.");
    } else {
      toast.success("Turnover added!");
    }
    setTurnMonthly(""); setTurnDate(today); setTurnProofName(""); setTurnFile(undefined);
    if (turnFileRef.current) turnFileRef.current.value = "";
    loadData();
  };

  const addCSR = async () => {
    if (!csrName || !csrAmount) { toast.error("Fill CSR details"); return; }
    await csrEntries.add({ industryId, activityName: csrName, description: csrDesc, amountSpent: Number(csrAmount), activityDate: csrDate, location: csrLocation, proofFileName: csrProofName || undefined, updatedDate: today } as any, csrFile);
    toast.success("CSR entry added!");
    setCsrName(""); setCsrDesc(""); setCsrAmount(""); setCsrLocation(""); setCsrProofName(""); setCsrFile(undefined);
    if (csrFileRef.current) csrFileRef.current.value = "";
    loadData();
  };


  const submitAnomalyExplanation = async (id: string) => {
    const explanation = explanationTexts[id];

    if (!explanation || explanation.trim().length < 10) {
      toast.error("Please provide a detailed explanation (min 10 characters)");
      return;
    }

    // Reject repetitive patterns like "XXXXXX", ".......", or just one character repeated
    const textOnly = explanation.trim().toLowerCase().replace(/\s/g, "");
    const uniqueChars = new Set(textOnly).size;

    if (uniqueChars < 3 && textOnly.length > 5) {
      toast.error("Explanation not accepted. Please provide a valid, descriptive reason.");
      return;
    }

    // Check for common placeholder patterns
    if (/^(.)\1+$/.test(textOnly) || textOnly.includes("xxxxx")) {
      toast.error("Invalid explanation. Repetitive characters are not allowed.");
      return;
    }

    try {
      const res = await anomalies.submitExplanation(id, explanation);
      toast.success(`Explanation submitted! AI Result: ${res.validation}`);
      loadData();
    } catch (err) {
      toast.error("Failed to submit explanation");
    }
  };

  const ProofUpload = ({ value, onChange, onFile, fileRef }: { value: string; onChange: (v: string) => void; onFile: (f: File) => void; fileRef: React.RefObject<HTMLInputElement> }) => (
    <div className="space-y-1">
      <Label className="flex items-center gap-1.5 text-muted-foreground"><Upload className="h-3 w-3" /> Upload Proof Document</Label>
      <Input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.png,.jpeg"
        onChange={e => {
          if (e.target.files?.[0]) {
            const file = e.target.files[0];
            onChange(file.name);
            onFile(file);
          }
        }}
        className="bg-background"
      />
      {value && <p className="text-xs text-muted-foreground">📎 {value}</p>}
    </div>
  );

  const ProofBadge = ({ fileName, fileData }: { fileName?: string; fileData?: string }) => {
    if (!fileName) return <span className="text-muted-foreground">—</span>;
    return (
      <Badge
        variant="outline"
        className={`gap-1 text-xs font-normal rounded-full ${fileData ? 'cursor-pointer hover:bg-primary/10 transition-colors' : ''}`}
        onClick={() => fileData && openProofFile(fileData, fileName)}
      >
        <FileText className="h-3 w-3" />
        {fileName}
      </Badge>
    );
  };

  const VerificationBadge = ({ status }: { status: "pending" | "verified" }) => {
    if (status === "verified") {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-200 gap-1 rounded-full font-medium hover:bg-green-500/20">
          <Sparkles className="h-3 w-3" />
          Verified
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 gap-1 rounded-full font-medium">
        <Activity className="h-3 w-3" />
        Pending Review
      </Badge>
    );
  };

  const tabConfig = [
    { value: "investment", label: "Investment", icon: DollarSign },
    { value: "employees", label: "Employees", icon: Users },
    { value: "loans", label: "Loans", icon: Building },
    { value: "power", label: "Power", icon: Zap },
    { value: "turnover", label: "Turnover", icon: TrendingUp },
    { value: "csr", label: "CSR", icon: Heart },
    { value: "ai-analytics", label: "Analytics", icon: BrainCircuit },
  ];

  const isAllVerified = ![...inv, ...emp, ...loans, ...power, ...turn, ...csr].some(r => r.verificationStatus === 'pending');

  return (
    <DashboardLayout title={user.name} subtitle="Industry Admin Dashboard">
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        {[
          { label: "Total Investment", value: latestInv ? formatIndianCurrency(latestInv.totalAmount) : 'Rs. 0', icon: DollarSign, gradient: "from-primary to-info" },
          { label: "Employees", value: latestEmp ? `${latestEmp.male + latestEmp.female}` : '0', icon: Users, gradient: "from-secondary to-success" },
          { label: "Monthly Turnover", value: latestTurn ? formatIndianCurrency(latestTurn.monthlyTurnover) : 'Rs. 0', icon: TrendingUp, gradient: "from-accent to-warning" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="border-0 shadow-md overflow-hidden relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-[0.04]`} />
              <CardContent className="flex items-center gap-4 p-5 relative">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                  <stat.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                  </div>
                  <p className="text-xl font-bold font-display truncate">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>


      {deadline && (() => {
        const dDate = new Date(deadline);
        const tDate = new Date();
        const diffDays = Math.ceil((dDate.getTime() - tDate.getTime()) / (1000 * 3600 * 24));

        const sDateStr = deadlineSetDate || "1970-01-01";

        const hasInv = inv.some(r => r.updatedDate && r.updatedDate >= sDateStr);
        const hasEmp = emp.some(r => r.updatedDate && r.updatedDate >= sDateStr);
        const hasLoans = loans.some(r => r.updatedDate && r.updatedDate >= sDateStr);
        const hasPower = power.some(r => r.updatedDate && r.updatedDate >= sDateStr);
        const hasTurn = turn.some(r => r.updatedDate && r.updatedDate >= sDateStr);
        const hasCsr = csr.some(r => r.updatedDate && r.updatedDate >= sDateStr);

        const submittedThisMonth = hasInv && hasEmp && hasLoans && hasPower && hasTurn && hasCsr;

        if (submittedThisMonth) {
          return (
            <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-3 text-green-700">
              <CheckCircle className="h-6 w-6" />
              <div>
                <h4 className="font-semibold text-base">Perfect!</h4>
                <p className="text-sm">You have submitted your data on time for the deadline ({deadline}).</p>
              </div>
            </div>
          );
        }

        if (diffDays < 0) {
          return (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-700">
              <AlertTriangle className="h-6 w-6" />
              <div>
                <h4 className="font-semibold text-base">⛔ Delayed</h4>
                <p className="text-sm font-medium mt-0.5">The submission deadline ({deadline}) has passed. ❌ Not Submitted. Please submit immediately.</p>
              </div>
            </div>
          );
        }

        if (diffDays <= 3) {
          return (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-700">
              <Bell className="h-6 w-6 animate-bounce" />
              <div>
                <h4 className="font-semibold text-base">⚠️ Reminder</h4>
                <p className="text-sm font-medium mt-0.5">Deadline is approaching in {diffDays} days ({deadline}). Please submit your data.</p>
              </div>
            </div>
          );
        }

        return (
          <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center gap-3 text-blue-700">
            <Activity className="h-6 w-6" />
            <div>
              <h4 className="font-semibold text-base">Upcoming Deadline</h4>
              <p className="text-sm mt-0.5">Please ensure all required data is submitted by {deadline}.</p>
            </div>
          </div>
        );
      })()}

      {/* AI Anomaly Alerts Section */}
      {industryAnomalies.filter(a => a.status === 'pending').length > 0 && (
        <div className="mb-6">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto h-12 px-6 gap-2 font-bold shadow-lg shadow-destructive/20 animate-in fade-in slide-in-from-top-4 duration-500 hover:scale-105 transition-transform">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
                View AI Anomaly Alerts
                <Badge variant="outline" className="bg-white/20 text-white border-0 ml-2">
                  {industryAnomalies.filter(a => a.status === 'pending').length} Pending
                </Badge>
              </Button>
            </DialogTrigger>
            <DialogContent
              className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col bg-background/95 backdrop-blur-md border-destructive/20"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <DialogHeader className="shrink-0 p-6 pb-2 border-b">
                <DialogTitle className="flex items-center gap-3 text-xl font-bold text-destructive">
                  <AlertTriangle className="h-6 w-6 animate-pulse" />
                  Action Required: AI Anomaly Detection
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-2">
                  The system detected drastic changes in the following data submissions. Please provide valid explanations.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                <div className="grid gap-6">
                  {industryAnomalies.filter(a => a.status === 'pending').map((anom) => (
                    <Card key={anom.id} className="border-destructive/30 bg-destructive/5 overflow-hidden shadow-sm">
                      <CardContent className="p-0">
                        <div className="p-6 space-y-6">
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
                                  {isCurrencyAnomaly(anom.dataType) ? formatIndianCurrency(Number(anom.oldValue)) : Number(anom.oldValue)}
                                </p>
                              </div>

                              <div className="space-y-1 border-l pl-4 border-destructive/10 min-w-0">
                                <p className="text-[10px] uppercase font-bold text-destructive tracking-wider whitespace-nowrap">Current Value</p>
                                <p className="text-lg font-black text-destructive break-all">
                                  {isCurrencyAnomaly(anom.dataType) ? formatIndianCurrency(Number(anom.newValue)) : Number(anom.newValue)}
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

                            <p className="text-sm text-muted-foreground leading-relaxed">
                              The system detected a drastic change in your {anom.dataType} data compared to your last submission.
                              Please provide a valid reason for this change to ensure data transparency.
                            </p>
                          </div>

                          <div className="flex flex-col gap-3 pt-6 border-t border-destructive/10">
                            <Label htmlFor={`explanation-${anom.id}`} className="text-xs font-bold uppercase tracking-wider text-destructive">Your Explanation</Label>
                            <Textarea
                              id={`explanation-${anom.id}`}
                              placeholder="Explain the reason for this sudden change (e.g., annual maintenance, seasonal demand, etc.)"
                              className="bg-background resize-none min-h-[100px] border-destructive/20 focus-visible:ring-destructive"
                              value={explanationTexts[anom.id] || ""}
                              onChange={(e) => setExplanationTexts(prev => ({ ...prev, [anom.id]: e.target.value }))}
                            />
                            <div className="flex justify-end">
                              <Button
                                size="lg"
                                className="bg-destructive hover:bg-destructive/90 text-white font-bold shadow-lg px-8 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                onClick={() => submitAnomalyExplanation(anom.id)}
                              >
                                Submit Reason
                              </Button>
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

      <Tabs defaultValue="investment" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-xl">
          {tabConfig.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg transition-all">
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="investment" forceMount className="data-[state=inactive]:hidden">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" />Add Investment</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Total Amount (Rs.)</Label><Input type="number" value={invAmount} onChange={e => setInvAmount(e.target.value)} onWheel={preventScrollChange} placeholder="0" className="bg-background" /></div>
                <div><Label>Date</Label><Input type="date" value={invDate} onChange={e => setInvDate(e.target.value)} className="bg-background" /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={invType} onValueChange={v => setInvType(v as "Initial" | "Additional")}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Initial">Initial</SelectItem><SelectItem value="Additional">Additional</SelectItem></SelectContent>
                  </Select>
                </div>
                <ProofUpload value={invProofName} onChange={setInvProofName} onFile={f => setInvFile(f)} fileRef={invFileRef as React.RefObject<HTMLInputElement>} />
                <Button onClick={addInvestment} className="w-full bg-gradient-to-r from-primary to-info hover:opacity-90"><Plus className="mr-1 h-4 w-4" />Add</Button>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle className="text-lg">Investment Records</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto scrollbar-thin">
                  <Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Amount</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Proof</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
                    <TableBody>{inv.map(i => <TableRow key={i.id} className="hover:bg-primary/5"><TableCell className="font-semibold whitespace-nowrap" title={`Rs. ${i.totalAmount.toLocaleString('en-IN')}`}>{formatIndianCurrency(i.totalAmount)}</TableCell><TableCell className="whitespace-nowrap"><Badge variant="secondary" className="rounded-full">{i.investmentType}</Badge></TableCell><TableCell className="whitespace-nowrap">{i.investmentDate}</TableCell><TableCell className="whitespace-nowrap"><VerificationBadge status={i.verificationStatus} /></TableCell><TableCell className="whitespace-nowrap"><ProofBadge fileName={i.proofFileName} fileData={i.proofFileData} /></TableCell><TableCell className="text-xs text-muted-foreground whitespace-nowrap">{i.updatedDate}</TableCell></TableRow>)}{inv.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No records</TableCell></TableRow>}</TableBody></Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employees" forceMount className="data-[state=inactive]:hidden">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-secondary" />Add Employees</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Male Employees</Label><Input type="number" value={empMale} onChange={e => setEmpMale(e.target.value)} onWheel={preventScrollChange} placeholder="0" className="bg-background" /></div>
                <div><Label>Female Employees</Label><Input type="number" value={empFemale} onChange={e => setEmpFemale(e.target.value)} onWheel={preventScrollChange} placeholder="0" className="bg-background" /></div>
                <Button onClick={addEmployee} className="w-full bg-gradient-to-r from-secondary to-success hover:opacity-90"><Plus className="mr-1 h-4 w-4" />Add</Button>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle className="text-lg">Employee Records</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto scrollbar-thin">
                  <Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Male</TableHead><TableHead>Female</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
                    <TableBody>{emp.map(e => <TableRow key={e.id} className="hover:bg-primary/5"><TableCell className="whitespace-nowrap">{e.male}</TableCell><TableCell className="whitespace-nowrap">{e.female}</TableCell><TableCell className="font-semibold whitespace-nowrap">{e.male + e.female}</TableCell><TableCell className="whitespace-nowrap"><VerificationBadge status={e.verificationStatus} /></TableCell><TableCell className="text-xs text-muted-foreground whitespace-nowrap">{e.updatedDate}</TableCell></TableRow>)}{emp.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No records</TableCell></TableRow>}</TableBody></Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="loans" forceMount className="data-[state=inactive]:hidden">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Building className="h-5 w-5 text-accent" />Add Term Loan</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Loan Amount (Rs.)</Label><Input type="number" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} onWheel={preventScrollChange} placeholder="0" className="bg-background" /></div>
                <div><Label>Bank</Label><Input value={loanBank} onChange={e => setLoanBank(e.target.value)} placeholder="Bank name" className="bg-background" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Interest Rate (%)</Label><Input type="number" step="0.1" value={loanRate} onChange={e => setLoanRate(e.target.value)} onWheel={preventScrollChange} className="bg-background" /></div>
                  <div><Label>Tenure (months)</Label><Input type="number" value={loanTenure} onChange={e => setLoanTenure(e.target.value)} onWheel={preventScrollChange} className="bg-background" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>EMI (Rs.)</Label><Input type="number" value={loanEmi} onChange={e => setLoanEmi(e.target.value)} onWheel={preventScrollChange} className="bg-background" /></div>
                  <div><Label>Status</Label>
                    <Select value={loanStatus} onValueChange={setLoanStatus}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Closed">Closed</SelectItem><SelectItem value="Pending">Pending</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <ProofUpload value={loanProofName} onChange={setLoanProofName} onFile={f => setLoanFile(f)} fileRef={loanFileRef as React.RefObject<HTMLInputElement>} />
                <Button onClick={addLoan} className="w-full bg-gradient-to-r from-accent to-warning hover:opacity-90"><Plus className="mr-1 h-4 w-4" />Add</Button>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle className="text-lg">Loan Records</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto scrollbar-thin">
                  <Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Amount</TableHead><TableHead>Bank</TableHead><TableHead>Rate</TableHead><TableHead>Tenure</TableHead><TableHead>EMI</TableHead><TableHead>Loan Status</TableHead><TableHead>Verify Status</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
                    <TableBody>{loans.map(l => <TableRow key={l.id} className="hover:bg-primary/5"><TableCell className="font-semibold whitespace-nowrap" title={`Rs. ${l.loanAmount.toLocaleString('en-IN')}`}>{formatIndianCurrency(l.loanAmount)}</TableCell><TableCell className="whitespace-nowrap">{l.bank}</TableCell><TableCell className="whitespace-nowrap">{l.interestRate}%</TableCell><TableCell className="whitespace-nowrap">{l.tenure} mo</TableCell><TableCell className="whitespace-nowrap" title={`Rs. ${l.emi.toLocaleString('en-IN')}`}>{formatIndianCurrency(l.emi)}</TableCell><TableCell className="whitespace-nowrap"><Badge variant="outline" className="rounded-full">{l.status}</Badge></TableCell><TableCell className="whitespace-nowrap"><VerificationBadge status={l.verificationStatus} /></TableCell><TableCell className="text-xs text-muted-foreground whitespace-nowrap">{l.updatedDate}</TableCell></TableRow>)}{loans.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No records</TableCell></TableRow>}</TableBody></Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="power" forceMount className="data-[state=inactive]:hidden">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-warning" />Add Power Usage</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-2">
                  <div><Label>Monthly Usage (kWh)</Label><Input type="number" value={powerMonthly} onChange={e => setPowerMonthly(e.target.value)} onWheel={preventScrollChange} placeholder="0" className="bg-background" /></div>
                </div>
                <div>
                  <Label>Power Source</Label>
                  <Select value={powerSource} onValueChange={v => setPowerSource(v as "TNEB" | "Generator" | "Solar")}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="TNEB">TNEB</SelectItem><SelectItem value="Generator">Generator</SelectItem><SelectItem value="Solar">Solar</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Connection Number</Label><Input value={powerConn} onChange={e => setPowerConn(e.target.value)} placeholder="Connection #" className="bg-background" /></div>
                <ProofUpload value={powerProofName} onChange={setPowerProofName} onFile={f => setPowerFile(f)} fileRef={powerFileRef as React.RefObject<HTMLInputElement>} />
                <Button onClick={addPower} className="w-full bg-gradient-to-r from-warning to-accent hover:opacity-90"><Plus className="mr-1 h-4 w-4" />Add</Button>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle className="text-lg">Power Records</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto scrollbar-thin">
                  <Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Monthly</TableHead><TableHead>Source</TableHead><TableHead>Conn #</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
                    <TableBody>{power.map(p => <TableRow key={p.id} className="hover:bg-primary/5"><TableCell className="font-semibold whitespace-nowrap">{p.monthlyUsage} kWh</TableCell><TableCell className="whitespace-nowrap">{p.powerSource}</TableCell><TableCell className="whitespace-nowrap">{p.connectionNumber || '-'}</TableCell><TableCell className="whitespace-nowrap"><VerificationBadge status={p.verificationStatus} /></TableCell><TableCell className="text-xs text-muted-foreground whitespace-nowrap">{p.updatedDate}</TableCell></TableRow>)}{power.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No records</TableCell></TableRow>}</TableBody></Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>


        <TabsContent value="turnover" forceMount className="data-[state=inactive]:hidden">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Add Turnover</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Monthly Turnover (Rs.)</Label><Input type="number" value={turnMonthly} onChange={e => setTurnMonthly(e.target.value)} onWheel={preventScrollChange} placeholder="0" className="bg-background" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Financial Year</Label><Input value={turnFY} onChange={e => setTurnFY(e.target.value)} placeholder="2024-25" className="bg-background" /></div>
                  <div><Label>Date</Label><Input type="date" value={turnDate} onChange={e => setTurnDate(e.target.value)} className="bg-background" /></div>
                </div>
                <ProofUpload value={turnProofName} onChange={setTurnProofName} onFile={f => setTurnFile(f)} fileRef={turnFileRef as React.RefObject<HTMLInputElement>} />
                <Button onClick={addTurnover} className="w-full bg-gradient-to-r from-primary to-info hover:opacity-90"><Plus className="mr-1 h-4 w-4" />Add</Button>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle className="text-lg">Turnover Records</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto scrollbar-thin">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Amount</TableHead>
                        <TableHead>FY</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>{turn.map(t => <TableRow key={t.id} className="hover:bg-primary/5"><TableCell className="font-semibold whitespace-nowrap" title={`Rs. ${t.monthlyTurnover.toLocaleString('en-IN')}`}>{formatIndianCurrency(t.monthlyTurnover)}</TableCell><TableCell className="whitespace-nowrap">{t.financialYear}</TableCell><TableCell className="whitespace-nowrap">{t.turnoverDate}</TableCell><TableCell className="whitespace-nowrap"><VerificationBadge status={t.verificationStatus} /></TableCell><TableCell className="text-xs text-muted-foreground whitespace-nowrap">{t.updatedDate}</TableCell></TableRow>)}{turn.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No records</TableCell></TableRow>}</TableBody></Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="csr" forceMount className="data-[state=inactive]:hidden">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Heart className="h-5 w-5 text-destructive" />Add CSR Activity</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Activity Name</Label><Input value={csrName} onChange={e => setCsrName(e.target.value)} placeholder="Activity name" className="bg-background" /></div>
                <div><Label>Description</Label><Textarea value={csrDesc} onChange={e => setCsrDesc(e.target.value)} placeholder="Describe the activity" className="bg-background" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Amount (Rs.)</Label><Input type="number" value={csrAmount} onChange={e => setCsrAmount(e.target.value)} onWheel={preventScrollChange} className="bg-background" /></div>
                  <div><Label>Date</Label><Input type="date" value={csrDate} onChange={e => setCsrDate(e.target.value)} className="bg-background" /></div>
                </div>
                <div><Label>Location</Label><Input value={csrLocation} onChange={e => setCsrLocation(e.target.value)} placeholder="Location" className="bg-background" /></div>
                <ProofUpload value={csrProofName} onChange={setCsrProofName} onFile={f => setCsrFile(f)} fileRef={csrFileRef as React.RefObject<HTMLInputElement>} />
                <Button onClick={addCSR} className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"><Plus className="mr-1 h-4 w-4" />Add</Button>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle className="text-lg">CSR Records</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto scrollbar-thin">
                  <Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Activity</TableHead><TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead>Location</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
                    <TableBody>{csr.map(c => <TableRow key={c.id} className="hover:bg-primary/5"><TableCell className="whitespace-nowrap">{c.activityName}</TableCell><TableCell className="font-semibold whitespace-nowrap" title={`Rs. ${c.amountSpent.toLocaleString('en-IN')}`}>{formatIndianCurrency(c.amountSpent)}</TableCell><TableCell className="whitespace-nowrap">{c.activityDate}</TableCell><TableCell className="whitespace-nowrap">{c.location}</TableCell><TableCell className="whitespace-nowrap"><VerificationBadge status={c.verificationStatus} /></TableCell><TableCell className="text-xs text-muted-foreground whitespace-nowrap">{c.updatedDate}</TableCell></TableRow>)}{csr.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No records</TableCell></TableRow>}</TableBody></Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="ai-analytics" forceMount className="data-[state=inactive]:hidden">
          <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <BrainCircuit className="h-6 w-6 text-primary" />
                  Growth Comparison Analytics
                </h3>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {(() => {
                const vInv = inv;
                const vTurn = turn;
                const vEmp = emp;
                const vCsr = csr;

                return (
                  <>
                    <InsightRow
                      label="Total Investment"
                      current={vInv.length > 0 ? vInv[vInv.length - 1].totalAmount : 0}
                      previous={vInv.length >= 2 ? vInv[vInv.length - 2].totalAmount : undefined}
                      icon={DollarSign}
                      unit="Rs."
                    />

                    <InsightRow
                      label="Monthly Turnover"
                      current={vTurn.length > 0 ? vTurn[vTurn.length - 1].monthlyTurnover : 0}
                      previous={vTurn.length >= 2 ? vTurn[vTurn.length - 2].monthlyTurnover : undefined}
                      icon={TrendingUp}
                      unit="Rs."
                    />

                    <InsightRow
                      label="Total Employees"
                      current={vEmp.length > 0 ? vEmp[vEmp.length - 1].male + vEmp[vEmp.length - 1].female : 0}
                      previous={vEmp.length >= 2 ? vEmp[vEmp.length - 2].male + vEmp[vEmp.length - 2].female : undefined}
                      icon={Users}
                    />

                    <InsightRow
                      label="CSR Contribution"
                      current={vCsr.length > 0 ? vCsr[vCsr.length - 1].amountSpent : 0}
                      previous={vCsr.length >= 2 ? vCsr[vCsr.length - 2].amountSpent : undefined}
                      icon={Heart}
                      unit="Rs."
                    />
                  </>
                );
              })()}
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <h3 className="text-lg font-bold">Future Forecast</h3>
              </div>

              <div className="w-full">
                {(() => {
                  const turnData = getTurnoverData(turn);
                  const turnPoints = preparePredictionData(turnData, 'amount');
                  const count = 36; // 3 years
                  const futureValues = predictFutureValues(turnPoints, count);

                  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

                  // Prepare chart data with separate series for Actual and Forecast
                  const chartData = turnData.map((d, idx) => ({
                    date: d.date,
                    actual: d.amount,
                    // The last actual point is also the start of the forecast line to bridge them
                    forecast: idx === turnData.length - 1 ? d.amount : null
                  }));

                  if (futureValues.length > 0) {
                    let lastDate = new Date();
                    if (turn.length > 0) {
                      const sorted = [...turn].sort((a, b) => new Date(a.turnoverDate).getTime() - new Date(b.turnoverDate).getTime());
                      lastDate = new Date(sorted[sorted.length - 1].turnoverDate);
                    }

                    if (futureValues.length >= 36) {
                      const val = futureValues[35]; // 3-year point
                      const nextDate = new Date(lastDate);
                      nextDate.setMonth(lastDate.getMonth() + 36);
                      const monthLabel = months[nextDate.getMonth()];
                      const yearLabel = nextDate.getFullYear().toString().slice(-2);

                      chartData.push({
                        date: `${monthLabel} '${yearLabel}*`,
                        actual: null,
                        forecast: val,
                        isForecast: true
                      } as any);
                    }
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
                                    const growth = calculateGrowthMeta(nextValue, turnPoints[turnPoints.length - 1].y);
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
                                  <AlertTriangle className="h-3 w-3 text-amber-500" />
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
                            <div className="h-[450px] w-full mt-4">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                  <defs>
                                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
                                        const data = payload[0].payload;
                                        const val = data.isForecast ? data.forecast : data.actual;
                                        return (
                                          <div className="bg-background/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-xl">
                                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
                                              {data.isForecast ? '3-Year Forecast' : 'Actual Monthly Turnover'}
                                            </p>
                                            <p className="text-lg font-bold text-foreground">{formatIndianCurrency(val)}</p>
                                            <p className="text-[10px] text-muted-foreground italic">{data.date}</p>
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
        industryId={user.industryId!}
        otherPartyName="SIPCOT Administration"
      />
    </DashboardLayout>
  );
};

export default IndustryAdmin;
