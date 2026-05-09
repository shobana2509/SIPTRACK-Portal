import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getDistricts, getSIPCOTsByDistrict, getIndustriesBySipcot, getSIPCOTs,
  addSIPCOT, addIndustry, addUser, getIndustries, deleteIndustry,
  investments, employees, termLoans, powerUsages, turnovers, csrEntries, waterUsages, openProofFile, markAsSeen, anomalies,
  getSipcotComparison, getUsageEfficiency,
  type SIPCOT, type Industry, type Investment, type Employee, type TermLoan, type PowerUsage, type Turnover, type CSR, type WaterUsage, type Anomaly,
} from "@/lib/store";
import { Plus, MapPin, Building2, Factory, FileText, ChevronRight, Trash2, DollarSign, Users, TrendingUp, TrendingDown, Zap, Heart, Building, Droplets, Eye, EyeOff, Search, Activity, Sparkles, BarChart3, Lightbulb, FileSpreadsheet, AlertCircle, AlertTriangle, ArrowUp, ArrowDown, CheckCircle2 } from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { toast } from "sonner";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { formatIndianCurrency } from "@/lib/formatCurrency";
import { TrendChart } from "@/components/TrendChart";
import { getInvestmentData, getTurnoverData, getDecadeRange, getEmployeeGrowthData, getLoanData, getPowerData, getCsrData, predictFutureValues, preparePredictionData } from "@/lib/analytics";
import { BrainCircuit } from "lucide-react";

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

const SuperAdmin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedSipcot, setSelectedSipcot] = useState<SIPCOT | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [newDistrict, setNewDistrict] = useState("");
  const [newSipcotName, setNewSipcotName] = useState("");
  const [newIndustryName, setNewIndustryName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [createType, setCreateType] = useState<"sipcot" | "industry">("sipcot");
  const [selectedSipcotForIndustry, setSelectedSipcotForIndustry] = useState("");
  const [sipcotAdminUsername, setSipcotAdminUsername] = useState("");
  const [sipcotAdminPassword, setSipcotAdminPassword] = useState("");
  const [showSipcotPassword, setShowSipcotPassword] = useState(false);
  const [showIndustryPassword, setShowIndustryPassword] = useState(false);
  const [searchDistrict, setSearchDistrict] = useState("");
  const [searchSipcot, setSearchSipcot] = useState("");
  const [searchIndustry, setSearchIndustry] = useState("");
  const [activeTab, setActiveTab] = useState<string>("investments");
  const [selectedInvYear, setSelectedInvYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedTurnoverDecade, setSelectedTurnoverDecade] = useState<string>("2020-2030");
  const [anomalyFilter, setAnomalyFilter] = useState<string>("all");

  const [districts, setDistricts] = useState<string[]>([]);
  const [allSipcots, setAllSipcots] = useState<SIPCOT[]>([]);
  const [allIndustries, setAllIndustries] = useState<Industry[]>([]);
  const [allAnomalies, setAllAnomalies] = useState<Anomaly[]>([]);
  const [detailData, setDetailData] = useState<Record<string, { inv: Investment[]; emp: Employee[]; loans: TermLoan[]; power: PowerUsage[]; turn: Turnover[]; csr: CSR[]; water: WaterUsage[]; anoms: Anomaly[] }>>({});

  const calculateGrowth = (current: number, previous?: number) => {
    if (previous === undefined || previous === 0) return null;
    const rawGrowth = ((current - previous) / previous) * 100;
    return {
      percent: Math.min(100, Math.abs(rawGrowth)),
      isIncrease: rawGrowth >= 0
    };
  };
  const loadData = useCallback(async () => {
    const [d, s, i, a] = await Promise.all([
      getDistricts(), 
      getSIPCOTs(), 
      getIndustries(),
      anomalies.getAll()
    ]);
    setDistricts(d); 
    setAllSipcots(s); 
    setAllIndustries(i);
    setAllAnomalies(a);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadIndustryDetails = useCallback(async (industryId: string) => {
    const [inv, emp, loans, power, turn, csr, water, anoms] = await Promise.all([
      investments.getVerifiedByIndustry(industryId),
      employees.getVerifiedByIndustry(industryId),
      termLoans.getVerifiedByIndustry(industryId),
      powerUsages.getVerifiedByIndustry(industryId),
      turnovers.getVerifiedByIndustry(industryId),
      csrEntries.getVerifiedByIndustry(industryId),
      waterUsages.getVerifiedByIndustry(industryId),
      anomalies.getByIndustry(industryId),
    ]);
    setDetailData(prev => ({ ...prev, [industryId]: { inv, emp, loans, power, turn, csr, water, anoms } }));
  }, []);

  useEffect(() => {
    if (selectedIndustry) {
      loadIndustryDetails(selectedIndustry.id);
      // Mark as seen on server
      markAsSeen(selectedIndustry.id);
      // Mark as seen locally
      setAllIndustries(prev => prev.map(i => i.id === selectedIndustry.id ? { ...i, hasUnseenVerified: false } : i));
    }
  }, [selectedIndustry, loadIndustryDetails]);

  if (!user || user.role !== "super_admin") return <Navigate to="/" />;

  const handleCreateSipcot = async () => {
    if (!newDistrict || !newSipcotName || !sipcotAdminUsername || !sipcotAdminPassword) { toast.error("Fill all fields"); return; }
    const sipcot = await addSIPCOT({ name: newSipcotName, district: newDistrict });
    await addUser({ username: sipcotAdminUsername, password: sipcotAdminPassword, role: "sipcot_admin", name: newSipcotName, sipcotId: sipcot.id });
    toast.success("SIPCOT created!");
    setNewDistrict(""); setNewSipcotName(""); setSipcotAdminUsername(""); setSipcotAdminPassword("");
    loadData();
    setDialogOpen(false);
  };

  const handleCreateIndustry = async () => {
    if (!selectedSipcotForIndustry || !newIndustryName || !newUsername || !newPassword) { toast.error("Fill all fields"); return; }
    const industry = await addIndustry({ name: newIndustryName, sipcotId: selectedSipcotForIndustry });
    await addUser({ username: newUsername, password: newPassword, role: "industry_admin", name: newIndustryName, industryId: industry.id });
    toast.success("Industry & admin created!");
    setNewIndustryName(""); setNewUsername(""); setNewPassword(""); setSelectedSipcotForIndustry("");
    loadData();
    setDialogOpen(false);
  };

  const handleDeleteIndustry = async (ind: Industry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete "${ind.name}" and all its data?`)) {
      await deleteIndustry(ind.id);
      toast.success(`"${ind.name}" deleted`);
      setSelectedIndustry(null);
      loadData();
    }
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
  ];

  const renderIndustryDetails = (industryId: string) => {
    const d = detailData[industryId] || { inv: [], emp: [], loans: [], power: [], turn: [], csr: [], water: [], anoms: [] };
    
    // Filter for verified only
    const verified = {
      inv: d.inv,
      emp: d.emp,
      loans: d.loans,
      power: d.power,
      turn: d.turn,
      csr: d.csr,
      water: d.water
    };

    const counts: Record<string, number> = { 
      investments: verified.inv.length, 
      employees: verified.emp.length, 
      loans: verified.loans.length, 
      power: verified.power.length, 
      water: verified.water.length, 
      turnover: verified.turn.length, 
      csr: verified.csr.length,
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

    return (
      <div className="space-y-6">
        {/* AI Anomaly Alerts Trigger Button (Super Admin view) */}
        {d.anoms && d.anoms.length > 0 && (
          <div className="flex items-center justify-between bg-destructive/5 border border-destructive/10 p-4 rounded-xl animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-destructive">AI Anomaly Detection</h3>
                <p className="text-xs text-muted-foreground">Drastic data changes detected in this industry.</p>
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
                    AI Anomaly Reports: {allIndustries.find(i => i.id === industryId)?.name}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground mt-2">
                    Review detected anomalies and industry-provided explanations for data transparency.
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
                                  <h4 className="font-bold text-lg capitalize tracking-tight">Sudden {anom.dataType} Change</h4>
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-xl">
          {tabConfig.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg transition-all">
              <tab.icon className="h-3.5 w-3.5" />{tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="investments">
          <Card className="border-0 shadow-md">
            <CardContent className="pt-4 px-0 sm:px-6">
              <div className="overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="whitespace-nowrap">Amount</TableHead>
                      <TableHead className="whitespace-nowrap">Type</TableHead>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Proof</TableHead>
                      <TableHead className="whitespace-nowrap">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verified.inv.map(i => (
                      <TableRow key={i.id} className="hover:bg-primary/5">
                        <TableCell className="font-semibold whitespace-nowrap" title={`Rs. ${i.totalAmount.toLocaleString('en-IN')}`}>{formatIndianCurrency(i.totalAmount)}</TableCell>
                        <TableCell className="whitespace-nowrap"><Badge variant="secondary" className="rounded-full">{i.investmentType}</Badge></TableCell>
                        <TableCell className="whitespace-nowrap">{i.investmentDate}</TableCell>
                        <TableCell className="whitespace-nowrap"><ProofLink fileName={i.proofFileName} fileData={i.proofFileData} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{i.updatedDate}</TableCell>
                      </TableRow>
                    ))}
                    {verified.inv.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}
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
                      <TableHead className="whitespace-nowrap">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verified.emp.map(e => (
                      <TableRow key={e.id} className="hover:bg-primary/5">
                        <TableCell className="whitespace-nowrap">{e.male}</TableCell>
                        <TableCell className="whitespace-nowrap">{e.female}</TableCell>
                        <TableCell className="font-semibold whitespace-nowrap">{e.male + e.female}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{e.updatedDate}</TableCell>
                      </TableRow>
                    ))}
                    {verified.emp.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}
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
                      <TableHead className="whitespace-nowrap">Loan Status</TableHead>
                      <TableHead className="whitespace-nowrap">Proof</TableHead>
                      <TableHead className="whitespace-nowrap">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verified.loans.map(l => (
                      <TableRow key={l.id} className="hover:bg-primary/5">
                        <TableCell className="font-semibold whitespace-nowrap" title={`Rs. ${l.loanAmount.toLocaleString('en-IN')}`}>{formatIndianCurrency(l.loanAmount)}</TableCell>
                        <TableCell className="whitespace-nowrap">{l.bank}</TableCell>
                        <TableCell className="whitespace-nowrap"><Badge variant="outline" className="rounded-full">{l.status}</Badge></TableCell>
                        <TableCell className="whitespace-nowrap"><ProofLink fileName={l.proofFileName} fileData={l.proofFileData} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{l.updatedDate}</TableCell>
                      </TableRow>
                    ))}
                    {verified.loans.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}
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
                      <TableHead className="whitespace-nowrap">Proof</TableHead>
                      <TableHead className="whitespace-nowrap">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verified.power.map(p => (
                      <TableRow key={p.id} className="hover:bg-primary/5">
                        <TableCell className="font-semibold whitespace-nowrap">{p.monthlyUsage} kWh</TableCell>
                        <TableCell className="whitespace-nowrap"><Badge variant="outline" className="rounded-full">{p.powerSource}</Badge></TableCell>
                        <TableCell className="whitespace-nowrap"><ProofLink fileName={p.proofFileName} fileData={p.proofFileData} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{p.updatedDate}</TableCell>
                      </TableRow>
                    ))}
                    {verified.power.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="water">
          <Card className="border-0 shadow-md">
            <CardContent className="pt-4 px-0 sm:px-6">
              <div className="overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="whitespace-nowrap">Monthly (KL)</TableHead>
                      <TableHead className="whitespace-nowrap">Proof</TableHead>
                      <TableHead className="whitespace-nowrap">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verified.water.map(w => (
                      <TableRow key={w.id} className="hover:bg-primary/5">
                        <TableCell className="font-semibold whitespace-nowrap">{w.monthlyUsage} KL</TableCell>
                        <TableCell className="whitespace-nowrap"><ProofLink fileName={w.proofFileName} fileData={w.proofFileData} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{w.updatedDate}</TableCell>
                      </TableRow>
                    ))}
                    {verified.water.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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
                        <TableHead className="whitespace-nowrap">Proof</TableHead>
                        <TableHead className="whitespace-nowrap">Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {verified.turn.map(t => (
                      <TableRow key={t.id} className="hover:bg-primary/5">
                        <TableCell className="font-semibold whitespace-nowrap" title={`Rs. ${t.monthlyTurnover.toLocaleString('en-IN')}`}>{formatIndianCurrency(t.monthlyTurnover)}</TableCell>
                        <TableCell className="whitespace-nowrap">{t.financialYear}</TableCell>
                        <TableCell className="whitespace-nowrap">{t.turnoverDate}</TableCell>
                        <TableCell className="whitespace-nowrap"><ProofLink fileName={t.proofFileName} fileData={t.proofFileData} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{t.updatedDate}</TableCell>
                      </TableRow>
                    ))}
                    {verified.turn.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}
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
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Proof</TableHead>
                      <TableHead className="whitespace-nowrap">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verified.csr.map(c => (
                      <TableRow key={c.id} className="hover:bg-primary/5">
                        <TableCell className="whitespace-nowrap">{c.activityName}</TableCell>
                        <TableCell className="font-semibold whitespace-nowrap" title={`Rs. ${c.amountSpent.toLocaleString('en-IN')}`}>{formatIndianCurrency(c.amountSpent)}</TableCell>
                        <TableCell className="whitespace-nowrap">{c.activityDate}</TableCell>
                        <TableCell className="whitespace-nowrap"><ProofLink fileName={c.proofFileName} fileData={c.proofFileData} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{c.updatedDate}</TableCell>
                      </TableRow>
                    ))}
                    {verified.csr.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}
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
                <p className="text-sm text-muted-foreground">Comparative summary of verified current vs previous records</p>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <InsightRow 
                label="Total Investment"
                current={verified.inv.length > 0 ? verified.inv[verified.inv.length - 1].totalAmount : 0}
                previous={verified.inv.length >= 2 ? verified.inv[verified.inv.length - 2].totalAmount : undefined}
                icon={DollarSign}
                unit="Rs."
              />
              
              <InsightRow 
                label="Monthly Turnover"
                current={verified.turn.length > 0 ? verified.turn[verified.turn.length - 1].monthlyTurnover : 0}
                previous={verified.turn.length >= 2 ? verified.turn[verified.turn.length - 2].monthlyTurnover : undefined}
                icon={TrendingUp}
                unit="Rs."
              />
              
              <InsightRow 
                label="Total Employees"
                current={verified.emp.length > 0 ? verified.emp[verified.emp.length - 1].male + verified.emp[verified.emp.length - 1].female : 0}
                previous={verified.emp.length >= 2 ? verified.emp[verified.emp.length - 2].male + verified.emp[verified.emp.length - 2].female : undefined}
                icon={Users}
              />
              

              
              <InsightRow 
                label="CSR Contribution"
                current={verified.csr.length > 0 ? verified.csr[verified.csr.length - 1].amountSpent : 0}
                previous={verified.csr.length >= 2 ? verified.csr[verified.csr.length - 2].amountSpent : undefined}
                icon={Heart}
                unit="Rs."
              />
            </div>

            {/* Future Forecast Section */}
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <h3 className="text-lg font-bold">Future Forecast</h3>
              </div>
              
              <div className="w-full">
                {(() => {
                  const verifiedTurnover = verified.turn;
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
                  
                  if (futureValues.length > 0) {
                    let lastDate = new Date();
                    if (verifiedTurnover.length > 0) {
                      const sorted = [...verifiedTurnover].sort((a,b) => new Date(a.turnoverDate).getTime() - new Date(b.turnoverDate).getTime());
                      lastDate = new Date(sorted[sorted.length - 1].turnoverDate);
                    }

                    if (futureValues.length >= 36) {
                      const val = futureValues[35]; // 3-year point
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
      </div>
    );
  };

  const generateReport = async () => {
    toast.info("Generating report...");
    const allDetails: Record<string, { inv: Investment[]; emp: Employee[]; loans: TermLoan[]; power: PowerUsage[]; turn: Turnover[]; csr: CSR[]; water: WaterUsage[] }> = {};
    await Promise.all(
      allIndustries.map(async (ind) => {
        const [inv, emp, loans, power, turn, csr, water] = await Promise.all([
          investments.getByIndustry(ind.id),
          employees.getByIndustry(ind.id),
          termLoans.getByIndustry(ind.id),
          powerUsages.getByIndustry(ind.id),
          turnovers.getByIndustry(ind.id),
          csrEntries.getByIndustry(ind.id),
          waterUsages.getByIndustry(ind.id),
        ]);
        // Filter for verified only
        allDetails[ind.id] = { 
          inv: inv, 
          emp: emp, 
          loans: loans, 
          power: power, 
          turn: turn, 
          csr: csr, 
          water: water 
        };
      })
    );

    let csv = "District,SIPCOT,Industry,Total Investment,Employees,Loan Details,Power (Monthly kWh),Water Monthly (KL),Monthly Turnover,CSR Spent,Updated Date\n";
    districts.forEach(d => {
      allSipcots.filter(s => s.district === d).forEach(s => {
        allIndustries.filter(i => i.sipcotId === s.id).forEach(ind => {
          const dd = allDetails[ind.id];
          if (!dd) return;

          const v = {
            inv: dd.inv,
            emp: dd.emp,
            loans: dd.loans,
            power: dd.power,
            turn: dd.turn,
            csr: dd.csr,
            water: dd.water
          };

          const latestInv = v.inv[v.inv.length - 1];
          const latestEmp = v.emp[v.emp.length - 1];
          const latestLoan = v.loans[v.loans.length - 1];
          const latestTurn = v.turn[v.turn.length - 1];
          const latestPower = v.power[v.power.length - 1];
          const latestCSR = v.csr[v.csr.length - 1];
          const latestWater = v.water[v.water.length - 1];
          const updatedDate = latestTurn?.updatedDate || latestInv?.updatedDate || latestEmp?.updatedDate || latestLoan?.updatedDate || latestPower?.updatedDate || latestWater?.updatedDate || latestCSR?.updatedDate || '-';
          
          csv += `${d},${s.name},${ind.name},${formatIndianCurrency(latestInv?.totalAmount||0, true)},${latestEmp?(latestEmp.male+latestEmp.female):0},"${latestLoan?`${formatIndianCurrency(latestLoan.loanAmount, true)} - ${latestLoan.bank}`:'None'}",${latestPower?.monthlyUsage||0},${latestWater?.monthlyUsage||0},${formatIndianCurrency(latestTurn?.monthlyTurnover || 0, true)},${formatIndianCurrency(latestCSR?.amountSpent || 0, true)},${updatedDate}\n`;
        });
      });
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "district_wise_report.csv"; a.click();
    toast.success("Report downloaded (Excel)!");
  };

  const generatePDFReport = async () => {
    toast.info("Generating PDF report...");
    const allDetails: Record<string, { inv: Investment[]; emp: Employee[]; loans: TermLoan[]; power: PowerUsage[]; turn: Turnover[]; csr: CSR[]; water: WaterUsage[] }> = {};
    await Promise.all(
      allIndustries.map(async (ind) => {
        const [inv, emp, loans, power, turn, csr, water] = await Promise.all([
          investments.getByIndustry(ind.id),
          employees.getByIndustry(ind.id),
          termLoans.getByIndustry(ind.id),
          powerUsages.getByIndustry(ind.id),
          turnovers.getByIndustry(ind.id),
          csrEntries.getByIndustry(ind.id),
          waterUsages.getByIndustry(ind.id),
        ]);
        allDetails[ind.id] = { 
          inv: inv, 
          emp: emp, 
          loans: loans, 
          power: power, 
          turn: turn, 
          csr: csr, 
          water: water 
        };
      })
    );

    const doc = new jsPDF("landscape");
    doc.setFontSize(16);
    doc.text("District-wise SIPCOT Report ", 14, 15);

    const tableData: (string | number)[][] = [];

    districts.forEach(d => {
      allSipcots.filter(s => s.district === d).forEach(s => {
        allIndustries.filter(i => i.sipcotId === s.id).forEach(ind => {
          const dd = allDetails[ind.id];
          if (!dd) return;

          const v = {
            inv: dd.inv,
            emp: dd.emp,
            loans: dd.loans,
            power: dd.power,
            turn: dd.turn,
            csr: dd.csr,
            water: dd.water
          };

          const latestInv = v.inv[v.inv.length - 1];
          const latestEmp = v.emp[v.emp.length - 1];
          const latestLoan = v.loans[v.loans.length - 1];
          const latestTurn = v.turn[v.turn.length - 1];
          const latestPower = v.power[v.power.length - 1];
          const latestCSR = v.csr[v.csr.length - 1];
          const latestWater = v.water[v.water.length - 1];
          
          const updatedDate = latestTurn?.updatedDate || latestInv?.updatedDate || latestEmp?.updatedDate || latestLoan?.updatedDate || latestPower?.updatedDate || latestWater?.updatedDate || latestCSR?.updatedDate || '-';
          tableData.push([
            d,
            s.name,
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
        });
      });
    });

    autoTable(doc, {
      startY: 25,
      head: [['District', 'SIPCOT', 'Industry', 'Total Investment', 'Employees', 'Loan Details', 'Power (Monthly kWh)', 'Water Monthly (KL)', 'Monthly Turnover', 'CSR Spent', 'Updated Date']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save("district_wise_report.pdf");
    toast.success("Report downloaded (PDF)!");
  };

  const downloadExcel = (industry: Industry) => {
    const d = detailData[industry.id];
    if (!d) { toast.error("Data not loaded yet"); return; }
    
    // Filter for verified only
    const v = {
      inv: d.inv,
      emp: d.emp,
      loans: d.loans,
      power: d.power,
      turn: d.turn,
      csr: d.csr,
      water: d.water
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
    html += `</table><h3>Loan</h3><table><tr><th>Amount</th><th>Bank</th><th>Rate</th><th>Tenure</th><th>Status</th><th>Updated</th></tr>`;
    html += latestLoan ? `<tr><td>${formatIndianCurrency(latestLoan.loanAmount, true)}</td><td>${latestLoan.bank}</td><td>${latestLoan.interestRate}%</td><td>${latestLoan.tenure} mo</td><td>${latestLoan.status}</td><td>${latestLoan.updatedDate}</td></tr>` : `<tr><td colspan="6">No data</td></tr>`;
    html += `</table><h3>Power</h3><table><tr><th>Monthly</th><th>Source</th><th>Updated</th></tr>`;
    html += latestPower ? `<tr><td>${latestPower.monthlyUsage} kWh</td><td>${latestPower.powerSource}</td><td>${latestPower.updatedDate}</td></tr>` : `<tr><td colspan="3">No data</td></tr>`;
    html += `</table><h3>Water</h3><table><tr><th>Monthly (KL)</th><th>Updated</th></tr>`;
    html += latestWater ? `<tr><td>${latestWater.monthlyUsage}</td><td>${latestWater.updatedDate}</td></tr>` : `<tr><td colspan="2">No data</td></tr>`;
    html += `</table><h3>Turnover</h3><table><tr><th>Amount</th><th>FY</th><th>Date</th><th>Updated</th></tr>`;
    html += latestTurn ? `<tr><td>${formatIndianCurrency(latestTurn.monthlyTurnover, true)}</td><td>${latestTurn.financialYear}</td><td>${latestTurn.turnoverDate}</td><td>${latestTurn.updatedDate}</td></tr>` : `<tr><td colspan="4">No data</td></tr>`;
    html += `</table><h3>CSR</h3><table><tr><th>Activity</th><th>Amount</th><th>Date</th><th>Updated</th></tr>`;
    html += latestCSR ? `<tr><td>${latestCSR.activityName}</td><td>${formatIndianCurrency(latestCSR.amountSpent, true)}</td><td>${latestCSR.activityDate}</td><td>${latestCSR.updatedDate}</td></tr>` : `<tr><td colspan="4">No data</td></tr>`;
    html += `</table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${industry.name}_data.xls`; a.click();
    toast.success(`Downloaded excel for ${industry.name}`);
  };

  const downloadPDF = (industry: Industry) => {
    toast.info("Generating PDF for industry...");
    const d = detailData[industry.id];
    if (!d) { toast.error("Data not loaded yet"); return; }
    
    // Filter for verified only
    const v = {
      inv: d.inv,
      emp: d.emp,
      loans: d.loans,
      power: d.power,
      turn: d.turn,
      csr: d.csr,
      water: d.water
    };

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Company Report: ${industry.name}`, 14, 15);
    doc.setFontSize(10);
    doc.text("Data summary", 14, 21);

    const latestInv = v.inv[v.inv.length - 1];
    const latestEmp = v.emp[v.emp.length - 1];
    const latestLoan = v.loans[v.loans.length - 1];
    const latestPower = v.power[v.power.length - 1];
    const latestTurn = v.turn[v.turn.length - 1];
    const latestCSR = v.csr[v.csr.length - 1];
    const latestWater = v.water[v.water.length - 1];

    autoTable(doc, {
      startY: 30,
      head: [['Category', 'Details', 'Updated']],
      body: [
        ['Investment', latestInv ? `${formatIndianCurrency(latestInv.totalAmount)} (${latestInv.investmentType})` : 'No data', latestInv?.updatedDate || '-'],
        ['Employees', latestEmp ? `${latestEmp.male + latestEmp.female} Total (${latestEmp.male}M, ${latestEmp.female}F)` : 'No data', latestEmp?.updatedDate || '-'],
        ['Loan', latestLoan ? `${formatIndianCurrency(latestLoan.loanAmount)} from ${latestLoan.bank}` : 'No data', latestLoan?.updatedDate || '-'],
        ['Power', latestPower ? `${latestPower.monthlyUsage} kWh/mo (${latestPower.powerSource})` : 'No data', latestPower?.updatedDate || '-'],
        ['Water', latestWater ? `${latestWater.monthlyUsage} KL/mo` : 'No data', latestWater?.updatedDate || '-'],
        ['Turnover', latestTurn ? `${formatIndianCurrency(latestTurn.monthlyTurnover)} FY:${latestTurn.financialYear} (${latestTurn.turnoverDate})` : 'No data', latestTurn?.updatedDate || '-'],
        ['CSR', latestCSR ? `${formatIndianCurrency(latestCSR.amountSpent)} on ${latestCSR.activityName}` : 'No data', latestCSR?.updatedDate || '-']
      ],
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save(`${industry.name}_report.pdf`);
    toast.success(`Downloaded PDF for ${industry.name}`);
  };

  return (
    <DashboardLayout
      title="SIPTrack"
      subtitle="Super Admin Dashboard"
      actions={
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/super-admin/analytics")} 
            className="gap-1.5"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/super-admin/activity-log")} className="gap-1.5"><Activity className="h-4 w-4" />Activity Log</Button>
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-primary to-info hover:opacity-90"><Plus className="h-4 w-4" />Add SIPCOT / Industry</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle className="font-display">Create New</DialogTitle></DialogHeader>
              <Tabs value={createType} onValueChange={v => setCreateType(v as "sipcot" | "industry")}>
                <TabsList className="w-full bg-muted/50 rounded-xl">
                  <TabsTrigger value="sipcot" className="flex-1 rounded-lg">Add SIPCOT</TabsTrigger>
                  <TabsTrigger value="industry" className="flex-1 rounded-lg">Add Industry</TabsTrigger>
                </TabsList>
                <TabsContent value="sipcot" className="space-y-3 mt-4">
                  <form onSubmit={(e) => { e.preventDefault(); handleCreateSipcot(); }} className="space-y-3">
                  <div><Label>District Name</Label><Input value={newDistrict} onChange={e => setNewDistrict(e.target.value)} placeholder="e.g. Madurai" className="bg-muted/30" /></div>
                  <div><Label>SIPCOT Name</Label><Input value={newSipcotName} onChange={e => setNewSipcotName(e.target.value)} placeholder="e.g. SIPCOT Madurai" className="bg-muted/30" /></div>
                  <div><Label>Admin Username</Label><Input value={sipcotAdminUsername} onChange={e => setSipcotAdminUsername(e.target.value)} className="bg-muted/30" /></div>
                  <div><Label>Admin Password</Label><div className="relative"><Input type={showSipcotPassword ? "text" : "password"} value={sipcotAdminPassword} onChange={e => setSipcotAdminPassword(e.target.value)} className="bg-muted/30 pr-10" /><button type="button" onClick={() => setShowSipcotPassword(!showSipcotPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">{showSipcotPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-primary to-info hover:opacity-90">Create SIPCOT</Button>
                  </form>
                </TabsContent>
                <TabsContent value="industry" className="space-y-3 mt-4">
                  <form onSubmit={(e) => { e.preventDefault(); handleCreateIndustry(); }} className="space-y-3">
                  <div>
                    <Label>Select SIPCOT</Label>
                    <Select value={selectedSipcotForIndustry} onValueChange={setSelectedSipcotForIndustry}>
                      <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Choose SIPCOT" /></SelectTrigger>
                      <SelectContent>{allSipcots.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.district})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Industry Name</Label><Input value={newIndustryName} onChange={e => setNewIndustryName(e.target.value)} placeholder="e.g. ABC Manufacturing" className="bg-muted/30" /></div>
                  <div><Label>Admin Username</Label><Input value={newUsername} onChange={e => setNewUsername(e.target.value)} className="bg-muted/30" /></div>
                  <div><Label>Admin Password</Label><div className="relative"><Input type={showIndustryPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-muted/30 pr-10" /><button type="button" onClick={() => setShowIndustryPassword(!showIndustryPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">{showIndustryPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-primary to-info hover:opacity-90">Create Industry</Button>
                  </form>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      {!selectedDistrict && !selectedSipcot && !selectedIndustry && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Districts", value: districts.length, icon: MapPin, gradient: "from-primary to-info" },
              { label: "SIPCOTs", value: allSipcots.length, icon: Building2, gradient: "from-secondary to-success" },
              { label: "Industries", value: allIndustries.length, icon: Factory, gradient: "from-accent to-warning" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className="border-0 shadow-md overflow-hidden relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-[0.04]`} />
                  <CardContent className="flex items-center gap-4 p-5 relative">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                      <stat.icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold font-display">{stat.value}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div>
            <h2 className="text-xs font-bold mb-3 text-muted-foreground uppercase tracking-wider">Districts</h2>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search districts..." value={searchDistrict} onChange={e => setSearchDistrict(e.target.value)} className="pl-9 bg-background" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {districts.filter(d => d.toLowerCase().includes(searchDistrict.toLowerCase())).map((d, i) => {
                const sipcotCount = allSipcots.filter(s => s.district === d).length;
                return (
                  <motion.div key={d} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
                    <Card className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/30 border-0 shadow-md group overflow-hidden relative" onClick={() => setSelectedDistrict(d)}>
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-info/[0.02] group-hover:from-primary/[0.06] group-hover:to-info/[0.06] transition-all duration-300" />
                      <CardContent className="flex items-center gap-4 p-5 relative">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-info shadow-md">
                          <MapPin className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-display font-semibold">{d}</h3>
                          <p className="text-sm text-muted-foreground">{sipcotCount} SIPCOT(s)</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {selectedDistrict && !selectedSipcot && (
        <div>
          <Button variant="ghost" size="sm" onClick={() => { setSelectedDistrict(null); setSearchSipcot(""); }} className="mb-4 hover:bg-primary/10">← Back to Districts</Button>
          <h2 className="font-display text-xl font-bold mb-4">SIPCOTs in {selectedDistrict}</h2>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search SIPCOTs..." value={searchSipcot} onChange={e => setSearchSipcot(e.target.value)} className="pl-9 bg-background" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allSipcots.filter(s => s.district === selectedDistrict && s.name.toLowerCase().includes(searchSipcot.toLowerCase())).map((s, i) => {
              const indCount = allIndustries.filter(ind => ind.sipcotId === s.id).length;
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <Card className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-secondary/30 border-0 shadow-md group overflow-hidden relative" onClick={() => setSelectedSipcot(s)}>
                    <div className="absolute inset-0 bg-gradient-to-br from-secondary/[0.02] to-success/[0.02] group-hover:from-secondary/[0.06] group-hover:to-success/[0.06] transition-all duration-300" />
                    <CardContent className="flex items-center gap-4 p-5 relative">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-secondary to-success shadow-md">
                        <Building2 className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display font-semibold">{s.name}</h3>
                        <p className="text-sm text-muted-foreground">{indCount} Industries</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-secondary transition-colors" />
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {selectedSipcot && !selectedIndustry && (
        <div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedSipcot(null)} className="mb-4 hover:bg-primary/10">← Back to SIPCOTs</Button>
          <h2 className="font-display text-xl font-bold mb-4">Industries in {selectedSipcot.name}</h2>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search industries..." value={searchIndustry} onChange={e => setSearchIndustry(e.target.value)} className="pl-9 bg-background" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allIndustries.filter(ind => ind.sipcotId === selectedSipcot.id && ind.name.toLowerCase().includes(searchIndustry.toLowerCase())).map((ind, i) => (
              <motion.div key={ind.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-accent/30 border-0 shadow-md group overflow-hidden relative" onClick={() => setSelectedIndustry(ind)}>
                  {ind.hasUnseenVerified && (
                    <div className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border border-background shadow-sm z-10" title="New Verified Data" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] to-warning/[0.02] group-hover:from-accent/[0.06] group-hover:to-warning/[0.06] transition-all duration-300" />
                  <CardContent className="flex items-center gap-4 p-5 relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-warning shadow-md">
                      <Factory className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold truncate group-hover:text-primary transition-colors">{ind.name}</h3>
                      {(() => {
                        const d = detailData[ind.id];
                        const latestInv = d?.inv.pop();
                        const prevInv = d ? d.inv.slice(-2, -1)[0] : undefined;
                        const growth = calculateGrowth(latestInv?.totalAmount || 0, prevInv?.totalAmount);
                        if (!growth) return null;
                        return (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground">Investment Growth</span>
                            <span className={`text-[10px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${growth.isIncrease ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                              {growth.isIncrease ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                              {growth.percent.toFixed(0)}%
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {selectedIndustry && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedIndustry(null)} className="hover:bg-primary/10">← Back</Button>
              <Button variant="outline" size="sm" onClick={() => downloadExcel(selectedIndustry)} className="gap-1.5"><FileSpreadsheet className="h-4 w-4" />Download Excel</Button>
              <Button variant="outline" size="sm" onClick={() => downloadPDF(selectedIndustry)} className="gap-1.5"><FileText className="h-4 w-4" />Download PDF</Button>
            </div>
            <Button variant="destructive" size="sm" onClick={(e) => handleDeleteIndustry(selectedIndustry, e)} className="gap-1.5"><Trash2 className="h-4 w-4" />Delete</Button>
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">{selectedIndustry.name}</h2>
          {renderIndustryDetails(selectedIndustry.id)}
        </div>
      )}
    </DashboardLayout>
  );
};

export default SuperAdmin;
