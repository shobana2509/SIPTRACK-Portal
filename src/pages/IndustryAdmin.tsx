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
import {
  investments, employees, termLoans, powerUsages, turnovers, csrEntries, openProofFile,
  type Investment, type Employee, type TermLoan, type PowerUsage, type Turnover, type CSR,
} from "@/lib/store";
import { Plus, DollarSign, Users, Building, Zap, TrendingUp, Heart, FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";

const preventScrollChange = (e: React.WheelEvent<HTMLInputElement>) => {
  (e.target as HTMLInputElement).blur();
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

  const [powerDaily, setPowerDaily] = useState("");
  const [powerMonthly, setPowerMonthly] = useState("");
  const [powerSource, setPowerSource] = useState<"TNEB" | "Generator" | "Solar">("TNEB");
  const [powerConn, setPowerConn] = useState("");
  const [powerFile, setPowerFile] = useState<File | undefined>();
  const [powerProofName, setPowerProofName] = useState("");

  const [turnMonthly, setTurnMonthly] = useState("");
  const [turnAnnual, setTurnAnnual] = useState("");
  const [turnFY, setTurnFY] = useState("2024-25");
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

  const industryId = user?.industryId || "";

  const loadData = useCallback(async () => {
    if (!industryId) return;
    const [i, e, l, p, t, c] = await Promise.all([
      investments.getByIndustry(industryId),
      employees.getByIndustry(industryId),
      termLoans.getByIndustry(industryId),
      powerUsages.getByIndustry(industryId),
      turnovers.getByIndustry(industryId),
      csrEntries.getByIndustry(industryId),
    ]);
    setInv(i); setEmp(e); setLoans(l); setPower(p); setTurn(t); setCsr(c);
  }, [industryId]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!user || user.role !== "industry_admin" || !user.industryId) return <Navigate to="/" />;

  const latestInv = inv.length > 0 ? inv[inv.length - 1] : undefined;
  const latestEmp = emp.length > 0 ? emp[emp.length - 1] : undefined;
  const latestTurn = turn.length > 0 ? turn[turn.length - 1] : undefined;

  const addInvestment = async () => {
    if (!invAmount) { toast.error("Enter amount"); return; }
    await investments.add({ industryId, totalAmount: Number(invAmount), investmentDate: invDate, investmentType: invType, proofFileName: invProofName || undefined, updatedDate: today } as any, invFile);
    toast.success("Investment added!");
    setInvAmount(""); setInvProofName(""); setInvFile(undefined);
    if (invFileRef.current) invFileRef.current.value = "";
    loadData();
  };

  const addEmployee = async () => {
    if (!empMale || !empFemale) { toast.error("Fill employee counts"); return; }
    await employees.add({ industryId, male: Number(empMale), female: Number(empFemale), updatedDate: today } as any);
    toast.success("Employee data added!");
    setEmpMale(""); setEmpFemale("");
    loadData();
  };

  const addLoan = async () => {
    if (!loanAmount || !loanBank) { toast.error("Fill loan details"); return; }
    await termLoans.add({ industryId, loanAmount: Number(loanAmount), bank: loanBank, interestRate: Number(loanRate), tenure: Number(loanTenure), emi: Number(loanEmi), status: loanStatus, proofFileName: loanProofName || undefined, updatedDate: today } as any, loanFile);
    toast.success("Loan added!");
    setLoanAmount(""); setLoanBank(""); setLoanRate(""); setLoanTenure(""); setLoanEmi(""); setLoanProofName(""); setLoanFile(undefined);
    if (loanFileRef.current) loanFileRef.current.value = "";
    loadData();
  };

  const addPower = async () => {
    if (!powerDaily) { toast.error("Fill power usage"); return; }
    await powerUsages.add({ industryId, dailyUsage: Number(powerDaily), monthlyUsage: Number(powerMonthly), powerSource, connectionNumber: powerConn, proofFileName: powerProofName || undefined, updatedDate: today } as any, powerFile);
    toast.success("Power usage added!");
    setPowerDaily(""); setPowerMonthly(""); setPowerConn(""); setPowerProofName(""); setPowerFile(undefined);
    if (powerFileRef.current) powerFileRef.current.value = "";
    loadData();
  };

  const addTurnover = async () => {
    if (!turnMonthly) { toast.error("Fill turnover"); return; }
    await turnovers.add({ industryId, monthlyTurnover: Number(turnMonthly), annualTurnover: Number(turnAnnual), financialYear: turnFY, proofFileName: turnProofName || undefined, updatedDate: today } as any, turnFile);
    toast.success("Turnover added!");
    setTurnMonthly(""); setTurnAnnual(""); setTurnProofName(""); setTurnFile(undefined);
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

  const tabConfig = [
    { value: "investment", label: "Investment", icon: DollarSign },
    { value: "employees", label: "Employees", icon: Users },
    { value: "loans", label: "Loans", icon: Building },
    { value: "power", label: "Power", icon: Zap },
    { value: "turnover", label: "Turnover", icon: TrendingUp },
    { value: "csr", label: "CSR", icon: Heart },
  ];

  return (
    <DashboardLayout title={user.name} subtitle="Industry Admin Dashboard">
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        {[
          { label: "Total Investment", value: `₹${latestInv?.totalAmount.toLocaleString() || '0'}`, icon: DollarSign, gradient: "from-primary to-info" },
          { label: "Employees", value: latestEmp ? `${latestEmp.male + latestEmp.female}` : '0', icon: Users, gradient: "from-secondary to-success" },
          { label: "Annual Turnover", value: `₹${latestTurn?.annualTurnover.toLocaleString() || '0'}`, icon: TrendingUp, gradient: "from-accent to-warning" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="border-0 shadow-md overflow-hidden relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-[0.04]`} />
              <CardContent className="flex items-center gap-4 p-5 relative">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                  <stat.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold font-display">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

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
                <div><Label>Total Amount (₹)</Label><Input type="number" value={invAmount} onChange={e => setInvAmount(e.target.value)} onWheel={preventScrollChange} placeholder="0" className="bg-background" /></div>
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
                <Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Amount</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Proof</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
                  <TableBody>{inv.map(i => <TableRow key={i.id} className="hover:bg-primary/5"><TableCell className="font-semibold">₹{i.totalAmount.toLocaleString()}</TableCell><TableCell><Badge variant="secondary" className="rounded-full">{i.investmentType}</Badge></TableCell><TableCell>{i.investmentDate}</TableCell><TableCell><ProofBadge fileName={i.proofFileName} fileData={i.proofFileData} /></TableCell><TableCell className="text-xs text-muted-foreground">{i.updatedDate}</TableCell></TableRow>)}{inv.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No records</TableCell></TableRow>}</TableBody></Table>
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
                <Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Male</TableHead><TableHead>Female</TableHead><TableHead>Total</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
                  <TableBody>{emp.map(e => <TableRow key={e.id} className="hover:bg-primary/5"><TableCell>{e.male}</TableCell><TableCell>{e.female}</TableCell><TableCell className="font-semibold">{e.male + e.female}</TableCell><TableCell className="text-xs text-muted-foreground">{e.updatedDate}</TableCell></TableRow>)}{emp.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No records</TableCell></TableRow>}</TableBody></Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="loans" forceMount className="data-[state=inactive]:hidden">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Building className="h-5 w-5 text-accent" />Add Term Loan</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Loan Amount (₹)</Label><Input type="number" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} onWheel={preventScrollChange} placeholder="0" className="bg-background" /></div>
                <div><Label>Bank</Label><Input value={loanBank} onChange={e => setLoanBank(e.target.value)} placeholder="Bank name" className="bg-background" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Interest Rate (%)</Label><Input type="number" step="0.1" value={loanRate} onChange={e => setLoanRate(e.target.value)} onWheel={preventScrollChange} className="bg-background" /></div>
                  <div><Label>Tenure (months)</Label><Input type="number" value={loanTenure} onChange={e => setLoanTenure(e.target.value)} onWheel={preventScrollChange} className="bg-background" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>EMI (₹)</Label><Input type="number" value={loanEmi} onChange={e => setLoanEmi(e.target.value)} onWheel={preventScrollChange} className="bg-background" /></div>
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
                <Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Amount</TableHead><TableHead>Bank</TableHead><TableHead>Rate</TableHead><TableHead>Tenure</TableHead><TableHead>EMI</TableHead><TableHead>Status</TableHead><TableHead>Proof</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
                  <TableBody>{loans.map(l => <TableRow key={l.id} className="hover:bg-primary/5"><TableCell className="font-semibold">₹{l.loanAmount.toLocaleString()}</TableCell><TableCell>{l.bank}</TableCell><TableCell>{l.interestRate}%</TableCell><TableCell>{l.tenure} mo</TableCell><TableCell>₹{l.emi.toLocaleString()}</TableCell><TableCell><Badge className="rounded-full">{l.status}</Badge></TableCell><TableCell><ProofBadge fileName={l.proofFileName} fileData={l.proofFileData} /></TableCell><TableCell className="text-xs text-muted-foreground">{l.updatedDate}</TableCell></TableRow>)}{loans.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No records</TableCell></TableRow>}</TableBody></Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="power" forceMount className="data-[state=inactive]:hidden">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-warning" />Add Power Usage</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Daily Usage (kWh)</Label><Input type="number" value={powerDaily} onChange={e => setPowerDaily(e.target.value)} onWheel={preventScrollChange} className="bg-background" /></div>
                  <div><Label>Monthly Usage (kWh)</Label><Input type="number" value={powerMonthly} onChange={e => setPowerMonthly(e.target.value)} onWheel={preventScrollChange} className="bg-background" /></div>
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
                <Button onClick={addPower} className="w-full bg-gradient-to-r from-accent to-warning hover:opacity-90"><Plus className="mr-1 h-4 w-4" />Add</Button>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle className="text-lg">Power Records</CardTitle></CardHeader>
              <CardContent>
                <Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Daily</TableHead><TableHead>Monthly</TableHead><TableHead>Source</TableHead><TableHead>Conn #</TableHead><TableHead>Proof</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
                  <TableBody>{power.map(p => <TableRow key={p.id} className="hover:bg-primary/5"><TableCell>{p.dailyUsage} kWh</TableCell><TableCell className="font-semibold">{p.monthlyUsage} kWh</TableCell><TableCell><Badge variant="outline" className="rounded-full">{p.powerSource}</Badge></TableCell><TableCell>{p.connectionNumber}</TableCell><TableCell><ProofBadge fileName={p.proofFileName} fileData={p.proofFileData} /></TableCell><TableCell className="text-xs text-muted-foreground">{p.updatedDate}</TableCell></TableRow>)}{power.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No records</TableCell></TableRow>}</TableBody></Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="turnover" forceMount className="data-[state=inactive]:hidden">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Add Turnover</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Monthly Turnover (₹)</Label><Input type="number" value={turnMonthly} onChange={e => setTurnMonthly(e.target.value)} onWheel={preventScrollChange} placeholder="0" className="bg-background" /></div>
                <div><Label>Annual Turnover (₹)</Label><Input type="number" value={turnAnnual} onChange={e => setTurnAnnual(e.target.value)} onWheel={preventScrollChange} placeholder="0" className="bg-background" /></div>
                <div><Label>Financial Year</Label><Input value={turnFY} onChange={e => setTurnFY(e.target.value)} placeholder="2024-25" className="bg-background" /></div>
                <ProofUpload value={turnProofName} onChange={setTurnProofName} onFile={f => setTurnFile(f)} fileRef={turnFileRef as React.RefObject<HTMLInputElement>} />
                <Button onClick={addTurnover} className="w-full bg-gradient-to-r from-primary to-info hover:opacity-90"><Plus className="mr-1 h-4 w-4" />Add</Button>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle className="text-lg">Turnover Records</CardTitle></CardHeader>
              <CardContent>
                <Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Monthly</TableHead><TableHead>Annual</TableHead><TableHead>FY</TableHead><TableHead>Proof</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
                  <TableBody>{turn.map(t => <TableRow key={t.id} className="hover:bg-primary/5"><TableCell>₹{t.monthlyTurnover.toLocaleString()}</TableCell><TableCell className="font-semibold">₹{t.annualTurnover.toLocaleString()}</TableCell><TableCell>{t.financialYear}</TableCell><TableCell><ProofBadge fileName={t.proofFileName} fileData={t.proofFileData} /></TableCell><TableCell className="text-xs text-muted-foreground">{t.updatedDate}</TableCell></TableRow>)}{turn.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No records</TableCell></TableRow>}</TableBody></Table>
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
                  <div><Label>Amount (₹)</Label><Input type="number" value={csrAmount} onChange={e => setCsrAmount(e.target.value)} onWheel={preventScrollChange} className="bg-background" /></div>
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
                <Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Activity</TableHead><TableHead>Amount</TableHead><TableHead>Location</TableHead><TableHead>Date</TableHead><TableHead>Proof</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
                  <TableBody>{csr.map(c => <TableRow key={c.id} className="hover:bg-primary/5"><TableCell>{c.activityName}</TableCell><TableCell className="font-semibold">₹{c.amountSpent.toLocaleString()}</TableCell><TableCell>{c.location}</TableCell><TableCell>{c.activityDate}</TableCell><TableCell><ProofBadge fileName={c.proofFileName} fileData={c.proofFileData} /></TableCell><TableCell className="text-xs text-muted-foreground">{c.updatedDate}</TableCell></TableRow>)}{csr.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No records</TableCell></TableRow>}</TableBody></Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default IndustryAdmin;
