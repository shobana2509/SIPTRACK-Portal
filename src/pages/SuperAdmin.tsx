import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getDistricts, getSIPCOTsByDistrict, getIndustriesBySipcot, getSIPCOTs,
  addSIPCOT, addIndustry, addUser, getIndustries, deleteIndustry,
  investments, employees, termLoans, powerUsages, turnovers, csrEntries, waterUsages, openProofFile,
  type SIPCOT, type Industry, type Investment, type Employee, type TermLoan, type PowerUsage, type Turnover, type CSR, type WaterUsage,
} from "@/lib/store";
import { Plus, MapPin, Building2, Factory, FileText, ChevronRight, Trash2, DollarSign, Users, TrendingUp, Zap, Heart, Building, Droplets, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";

const SuperAdmin = () => {
  const { user } = useAuth();
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

  const [districts, setDistricts] = useState<string[]>([]);
  const [allSipcots, setAllSipcots] = useState<SIPCOT[]>([]);
  const [allIndustries, setAllIndustries] = useState<Industry[]>([]);
  const [detailData, setDetailData] = useState<Record<string, { inv: Investment[]; emp: Employee[]; loans: TermLoan[]; power: PowerUsage[]; turn: Turnover[]; csr: CSR[]; water: WaterUsage[] }>>({});

  const loadData = useCallback(async () => {
    const [d, s, i] = await Promise.all([getDistricts(), getSIPCOTs(), getIndustries()]);
    setDistricts(d); setAllSipcots(s); setAllIndustries(i);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadIndustryDetails = useCallback(async (industryId: string) => {
    const [inv, emp, loans, power, turn, csr, water] = await Promise.all([
      investments.getByIndustry(industryId),
      employees.getByIndustry(industryId),
      termLoans.getByIndustry(industryId),
      powerUsages.getByIndustry(industryId),
      turnovers.getByIndustry(industryId),
      csrEntries.getByIndustry(industryId),
      waterUsages.getByIndustry(industryId),
    ]);
    setDetailData(prev => ({ ...prev, [industryId]: { inv, emp, loans, power, turn, csr, water } }));
  }, []);

  useEffect(() => {
    if (selectedIndustry) loadIndustryDetails(selectedIndustry.id);
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
  ];

  const renderIndustryDetails = (industryId: string) => {
    const d = detailData[industryId] || { inv: [], emp: [], loans: [], power: [], turn: [], csr: [], water: [] };
    const counts: Record<string, number> = { investments: d.inv.length, employees: d.emp.length, loans: d.loans.length, power: d.power.length, water: d.water.length, turnover: d.turn.length, csr: d.csr.length };

    return (
      <Tabs defaultValue="investments" className="mt-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-xl">
          {tabConfig.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg transition-all">
              <tab.icon className="h-3.5 w-3.5" />{tab.label}<span className="ml-0.5 text-xs text-muted-foreground">({counts[tab.value]})</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="investments"><Card className="border-0 shadow-md"><CardContent className="pt-4"><Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Amount</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Proof</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader><TableBody>{d.inv.map(i => <TableRow key={i.id} className="hover:bg-primary/5"><TableCell className="font-semibold">₹{i.totalAmount.toLocaleString()}</TableCell><TableCell><Badge variant="secondary" className="rounded-full">{i.investmentType}</Badge></TableCell><TableCell>{i.investmentDate}</TableCell><TableCell><ProofLink fileName={i.proofFileName} fileData={i.proofFileData} /></TableCell><TableCell className="text-xs text-muted-foreground">{i.updatedDate}</TableCell></TableRow>)}{d.inv.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}</TableBody></Table></CardContent></Card></TabsContent>
        <TabsContent value="employees"><Card className="border-0 shadow-md"><CardContent className="pt-4"><Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Male</TableHead><TableHead>Female</TableHead><TableHead>Total</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader><TableBody>{d.emp.map(e => <TableRow key={e.id} className="hover:bg-primary/5"><TableCell>{e.male}</TableCell><TableCell>{e.female}</TableCell><TableCell className="font-semibold">{e.male + e.female}</TableCell><TableCell className="text-xs text-muted-foreground">{e.updatedDate}</TableCell></TableRow>)}{d.emp.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}</TableBody></Table></CardContent></Card></TabsContent>
        <TabsContent value="loans"><Card className="border-0 shadow-md"><CardContent className="pt-4"><Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Amount</TableHead><TableHead>Bank</TableHead><TableHead>Rate</TableHead><TableHead>Tenure</TableHead><TableHead>EMI</TableHead><TableHead>Status</TableHead><TableHead>Proof</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader><TableBody>{d.loans.map(l => <TableRow key={l.id} className="hover:bg-primary/5"><TableCell className="font-semibold">₹{l.loanAmount.toLocaleString()}</TableCell><TableCell>{l.bank}</TableCell><TableCell>{l.interestRate}%</TableCell><TableCell>{l.tenure} mo</TableCell><TableCell>₹{l.emi.toLocaleString()}</TableCell><TableCell><Badge className="rounded-full">{l.status}</Badge></TableCell><TableCell><ProofLink fileName={l.proofFileName} fileData={l.proofFileData} /></TableCell><TableCell className="text-xs text-muted-foreground">{l.updatedDate}</TableCell></TableRow>)}{d.loans.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}</TableBody></Table></CardContent></Card></TabsContent>
        <TabsContent value="power"><Card className="border-0 shadow-md"><CardContent className="pt-4"><Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Monthly</TableHead><TableHead>Yearly</TableHead><TableHead>Source</TableHead><TableHead>Connection</TableHead><TableHead>Proof</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader><TableBody>{d.power.map(p => <TableRow key={p.id} className="hover:bg-primary/5"><TableCell>{p.monthlyUsage} kWh</TableCell><TableCell className="font-semibold">{p.yearlyUsage} kWh</TableCell><TableCell><Badge variant="outline" className="rounded-full">{p.powerSource}</Badge></TableCell><TableCell>{p.connectionNumber}</TableCell><TableCell><ProofLink fileName={p.proofFileName} fileData={p.proofFileData} /></TableCell><TableCell className="text-xs text-muted-foreground">{p.updatedDate}</TableCell></TableRow>)}{d.power.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}</TableBody></Table></CardContent></Card></TabsContent>
        <TabsContent value="water"><Card className="border-0 shadow-md"><CardContent className="pt-4"><Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Monthly (KL)</TableHead><TableHead>Yearly (KL)</TableHead><TableHead>Source</TableHead><TableHead>Proof</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader><TableBody>{d.water.length ? d.water.map(w => <TableRow key={w.id} className="hover:bg-primary/5"><TableCell>{w.monthlyUsage} KL</TableCell><TableCell className="font-semibold">{w.yearlyUsage} KL</TableCell><TableCell><Badge variant="outline" className="rounded-full">{w.waterSource}</Badge></TableCell><TableCell><ProofLink fileName={w.proofFileName} fileData={w.proofFileData} /></TableCell><TableCell className="text-xs text-muted-foreground">{w.updatedDate}</TableCell></TableRow>) : <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}</TableBody></Table></CardContent></Card></TabsContent>
        <TabsContent value="turnover"><Card className="border-0 shadow-md"><CardContent className="pt-4"><Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Monthly</TableHead><TableHead>Annual</TableHead><TableHead>FY</TableHead><TableHead>Proof</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader><TableBody>{d.turn.map(t => <TableRow key={t.id} className="hover:bg-primary/5"><TableCell>₹{t.monthlyTurnover.toLocaleString()}</TableCell><TableCell className="font-semibold">₹{t.annualTurnover.toLocaleString()}</TableCell><TableCell>{t.financialYear}</TableCell><TableCell><ProofLink fileName={t.proofFileName} fileData={t.proofFileData} /></TableCell><TableCell className="text-xs text-muted-foreground">{t.updatedDate}</TableCell></TableRow>)}{d.turn.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}</TableBody></Table></CardContent></Card></TabsContent>
        <TabsContent value="csr"><Card className="border-0 shadow-md"><CardContent className="pt-4"><Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Activity</TableHead><TableHead>Amount</TableHead><TableHead>Location</TableHead><TableHead>Date</TableHead><TableHead>Proof</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader><TableBody>{d.csr.map(c => <TableRow key={c.id} className="hover:bg-primary/5"><TableCell>{c.activityName}</TableCell><TableCell className="font-semibold">₹{c.amountSpent.toLocaleString()}</TableCell><TableCell>{c.location}</TableCell><TableCell>{c.activityDate}</TableCell><TableCell><ProofLink fileName={c.proofFileName} fileData={c.proofFileData} /></TableCell><TableCell className="text-xs text-muted-foreground">{c.updatedDate}</TableCell></TableRow>)}{d.csr.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}</TableBody></Table></CardContent></Card></TabsContent>
      </Tabs>
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
        allDetails[ind.id] = { inv, emp, loans, power, turn, csr, water };
      })
    );

    let csv = "District,SIPCOT,Industry,Total Investment,Employees,Loan Details,Power (Yearly kWh),Water Yearly (KL),Annual Turnover,CSR Spent\n";
    districts.forEach(d => {
      allSipcots.filter(s => s.district === d).forEach(s => {
        allIndustries.filter(i => i.sipcotId === s.id).forEach(ind => {
          const dd = allDetails[ind.id];
          if (!dd) return;
          const latestInv = dd.inv[dd.inv.length - 1];
          const latestEmp = dd.emp[dd.emp.length - 1];
          const latestLoan = dd.loans[dd.loans.length - 1];
          const latestTurn = dd.turn[dd.turn.length - 1];
          const latestPower = dd.power[dd.power.length - 1];
          const latestCSR = dd.csr[dd.csr.length - 1];
          const latestWater = dd.water[dd.water.length - 1];
          csv += `${d},${s.name},${ind.name},${latestInv?.totalAmount||0},${latestEmp?(latestEmp.male+latestEmp.female):0},"${latestLoan?`${latestLoan.loanAmount} - ${latestLoan.bank}`:'None'}",${latestPower?.yearlyUsage||0},${latestWater?.yearlyUsage||0},${latestTurn?.annualTurnover||0},${latestCSR?.amountSpent||0}\n`;
        });
      });
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "district_wise_report.csv"; a.click();
    toast.success("Report downloaded!");
  };

  return (
    <DashboardLayout
      title="SIPTrack"
      subtitle="Super Admin Dashboard"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={generateReport} className="gap-1.5"><FileText className="h-4 w-4" />Generate Report</Button>
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {districts.map((d, i) => {
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
          <Button variant="ghost" size="sm" onClick={() => setSelectedDistrict(null)} className="mb-4 hover:bg-primary/10">← Back to Districts</Button>
          <h2 className="font-display text-xl font-bold mb-4">SIPCOTs in {selectedDistrict}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allSipcots.filter(s => s.district === selectedDistrict).map((s, i) => {
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allIndustries.filter(ind => ind.sipcotId === selectedSipcot.id).map((ind, i) => (
              <motion.div key={ind.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-accent/30 border-0 shadow-md group overflow-hidden relative" onClick={() => setSelectedIndustry(ind)}>
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] to-warning/[0.02] group-hover:from-accent/[0.06] group-hover:to-warning/[0.06] transition-all duration-300" />
                  <CardContent className="flex items-center gap-4 p-5 relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-warning shadow-md">
                      <Factory className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-semibold">{ind.name}</h3>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => handleDeleteIndustry(ind, e)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedIndustry(null)} className="hover:bg-primary/10">← Back to Industries</Button>
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
