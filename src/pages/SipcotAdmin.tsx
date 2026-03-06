import { useState, useRef, useEffect, useCallback } from "react";
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
import {
  getIndustriesBySipcot, getSIPCOTs,
  investments, employees, termLoans, powerUsages, turnovers, csrEntries, waterUsages, openProofFile,
  type Industry, type SIPCOT, type Investment, type Employee, type TermLoan, type PowerUsage, type Turnover, type CSR, type WaterUsage,
} from "@/lib/store";
import { Factory, FileText, FileSpreadsheet, ChevronRight, Droplets, Plus, Upload, TrendingUp, Users, DollarSign, Zap, Heart, Building } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";

const SipcotAdmin = () => {
  const { user } = useAuth();
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);
  const today = new Date().toISOString().split("T")[0];

  const [waterDaily, setWaterDaily] = useState("");
  const [waterMonthly, setWaterMonthly] = useState("");
  const [waterSource, setWaterSource] = useState<"SIPCOT" | "Borewell" | "Both">("SIPCOT");
  const [waterFile, setWaterFile] = useState<File | undefined>();
  const [waterProofName, setWaterProofName] = useState("");
  const waterFileRef = useRef<HTMLInputElement>(null);

  const [sipcot, setSipcot] = useState<SIPCOT | undefined>();
  const [industriesList, setIndustriesList] = useState<Industry[]>([]);
  const [detailData, setDetailData] = useState<Record<string, { inv: Investment[]; emp: Employee[]; loans: TermLoan[]; power: PowerUsage[]; turn: Turnover[]; csr: CSR[]; water: WaterUsage[] }>>({});

  const loadSipcotData = useCallback(async () => {
    if (!user?.sipcotId) return;
    const allSipcots = await getSIPCOTs();
    setSipcot(allSipcots.find(s => s.id === user.sipcotId));
    const inds = await getIndustriesBySipcot(user.sipcotId);
    setIndustriesList(inds);
  }, [user?.sipcotId]);

  useEffect(() => { loadSipcotData(); }, [loadSipcotData]);

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

  // Load summary data for industry cards
  useEffect(() => {
    industriesList.forEach(ind => {
      if (!detailData[ind.id]) loadIndustryDetails(ind.id);
    });
  }, [industriesList, loadIndustryDetails, detailData]);

  if (!user || user.role !== "sipcot_admin") return <Navigate to="/" />;

  const addWater = async (industryId: string) => {
    if (!waterDaily) { toast.error("Fill water usage"); return; }
    await waterUsages.add({ industryId, dailyUsage: Number(waterDaily), monthlyUsage: Number(waterMonthly), waterSource, proofFileName: waterProofName || undefined, updatedDate: today } as any, waterFile);
    toast.success("Water usage added!");
    setWaterDaily(""); setWaterMonthly(""); setWaterProofName(""); setWaterFile(undefined);
    if (waterFileRef.current) waterFileRef.current.value = "";
    loadIndustryDetails(industryId);
  };

  const generateReport = async () => {
    let csv = `SIPCOT Report: ${sipcot?.name || ""}\n\nIndustry,Total Investment,Employees,Loan Details,Power (Monthly kWh),Water Monthly (KL),Annual Turnover,CSR Spent\n`;
    for (const ind of industriesList) {
      const d = detailData[ind.id];
      if (!d) continue;
      const latestInv = d.inv[d.inv.length - 1];
      const latestEmp = d.emp[d.emp.length - 1];
      const latestLoan = d.loans[d.loans.length - 1];
      const latestTurn = d.turn[d.turn.length - 1];
      const latestPower = d.power[d.power.length - 1];
      const latestWater = d.water[d.water.length - 1];
      const latestCSR = d.csr[d.csr.length - 1];
      csv += `${ind.name},${latestInv?.totalAmount||0},${latestEmp?(latestEmp.male+latestEmp.female):0},"${latestLoan?`${latestLoan.loanAmount} - ${latestLoan.bank}`:'None'}",${latestPower?.monthlyUsage||0},${latestWater?.monthlyUsage||0},${latestTurn?.annualTurnover||0},${latestCSR?.amountSpent||0}\n`;
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${sipcot?.name || "sipcot"}_report.csv`; a.click();
    toast.success("Summary report downloaded!");
  };

  const downloadExcel = (industry: Industry) => {
    const d = detailData[industry.id];
    if (!d) { toast.error("Data not loaded yet"); return; }
    const latestInv = d.inv[d.inv.length - 1];
    const latestEmp = d.emp[d.emp.length - 1];
    const latestLoan = d.loans[d.loans.length - 1];
    const latestPower = d.power[d.power.length - 1];
    const latestTurn = d.turn[d.turn.length - 1];
    const latestCSR = d.csr[d.csr.length - 1];
    const latestWater = d.water[d.water.length - 1];

    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><style>td,th{border:1px solid #ccc;padding:4px 8px;font-family:Arial;font-size:12px}th{background:#f0f0f0;font-weight:bold}</style></head><body>`;
    html += `<h2>Company: ${industry.name}</h2>`;
    html += `<h3>Investments</h3><table><tr><th>Amount</th><th>Type</th><th>Date</th><th>Updated</th></tr>`;
    html += latestInv ? `<tr><td>${latestInv.totalAmount}</td><td>${latestInv.investmentType}</td><td>${latestInv.investmentDate}</td><td>${latestInv.updatedDate}</td></tr>` : `<tr><td colspan="4">No data</td></tr>`;
    html += `</table><h3>Employees</h3><table><tr><th>Male</th><th>Female</th><th>Updated</th></tr>`;
    html += latestEmp ? `<tr><td>${latestEmp.male}</td><td>${latestEmp.female}</td><td>${latestEmp.updatedDate}</td></tr>` : `<tr><td colspan="3">No data</td></tr>`;
    html += `</table><h3>Loan</h3><table><tr><th>Amount</th><th>Bank</th><th>Rate</th><th>Tenure</th><th>EMI</th><th>Status</th><th>Updated</th></tr>`;
    html += latestLoan ? `<tr><td>${latestLoan.loanAmount}</td><td>${latestLoan.bank}</td><td>${latestLoan.interestRate}%</td><td>${latestLoan.tenure} mo</td><td>${latestLoan.emi}</td><td>${latestLoan.status}</td><td>${latestLoan.updatedDate}</td></tr>` : `<tr><td colspan="7">No data</td></tr>`;
    html += `</table><h3>Power</h3><table><tr><th>Daily</th><th>Monthly</th><th>Source</th><th>Connection</th><th>Updated</th></tr>`;
    html += latestPower ? `<tr><td>${latestPower.dailyUsage}</td><td>${latestPower.monthlyUsage}</td><td>${latestPower.powerSource}</td><td>${latestPower.connectionNumber}</td><td>${latestPower.updatedDate}</td></tr>` : `<tr><td colspan="5">No data</td></tr>`;
    html += `</table><h3>Water</h3><table><tr><th>Daily (KL)</th><th>Monthly (KL)</th><th>Source</th><th>Updated</th></tr>`;
    html += latestWater ? `<tr><td>${latestWater.dailyUsage}</td><td>${latestWater.monthlyUsage}</td><td>${latestWater.waterSource}</td><td>${latestWater.updatedDate}</td></tr>` : `<tr><td colspan="4">No data</td></tr>`;
    html += `</table><h3>Turnover</h3><table><tr><th>Monthly</th><th>Annual</th><th>FY</th><th>Updated</th></tr>`;
    html += latestTurn ? `<tr><td>${latestTurn.monthlyTurnover}</td><td>${latestTurn.annualTurnover}</td><td>${latestTurn.financialYear}</td><td>${latestTurn.updatedDate}</td></tr>` : `<tr><td colspan="4">No data</td></tr>`;
    html += `</table><h3>CSR</h3><table><tr><th>Activity</th><th>Amount</th><th>Location</th><th>Date</th><th>Updated</th></tr>`;
    html += latestCSR ? `<tr><td>${latestCSR.activityName}</td><td>${latestCSR.amountSpent}</td><td>${latestCSR.location}</td><td>${latestCSR.activityDate}</td><td>${latestCSR.updatedDate}</td></tr>` : `<tr><td colspan="5">No data</td></tr>`;
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
  ];

  const renderDetails = (industryId: string) => {
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

        <TabsContent value="investments">
          <Card className="border-0 shadow-md"><CardContent className="pt-4">
            <Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Amount</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Proof</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
              <TableBody>{d.inv.length ? d.inv.map(i => <TableRow key={i.id} className="hover:bg-primary/5"><TableCell className="font-semibold">₹{i.totalAmount.toLocaleString()}</TableCell><TableCell><Badge variant="secondary" className="rounded-full">{i.investmentType}</Badge></TableCell><TableCell>{i.investmentDate}</TableCell><TableCell><ProofLink fileName={i.proofFileName} fileData={i.proofFileData} /></TableCell><TableCell className="text-xs text-muted-foreground">{i.updatedDate}</TableCell></TableRow>) : <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}</TableBody></Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="employees">
          <Card className="border-0 shadow-md"><CardContent className="pt-4">
            <Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Male</TableHead><TableHead>Female</TableHead><TableHead>Total</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
              <TableBody>{d.emp.length ? d.emp.map(e => <TableRow key={e.id} className="hover:bg-primary/5"><TableCell>{e.male}</TableCell><TableCell>{e.female}</TableCell><TableCell className="font-semibold">{e.male + e.female}</TableCell><TableCell className="text-xs text-muted-foreground">{e.updatedDate}</TableCell></TableRow>) : <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}</TableBody></Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="loans">
          <Card className="border-0 shadow-md"><CardContent className="pt-4">
            <Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Amount</TableHead><TableHead>Bank</TableHead><TableHead>Rate</TableHead><TableHead>Tenure</TableHead><TableHead>EMI</TableHead><TableHead>Status</TableHead><TableHead>Proof</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
              <TableBody>{d.loans.length ? d.loans.map(l => <TableRow key={l.id} className="hover:bg-primary/5"><TableCell className="font-semibold">₹{l.loanAmount.toLocaleString()}</TableCell><TableCell>{l.bank}</TableCell><TableCell>{l.interestRate}%</TableCell><TableCell>{l.tenure} mo</TableCell><TableCell>₹{l.emi.toLocaleString()}</TableCell><TableCell><Badge className="rounded-full">{l.status}</Badge></TableCell><TableCell><ProofLink fileName={l.proofFileName} fileData={l.proofFileData} /></TableCell><TableCell className="text-xs text-muted-foreground">{l.updatedDate}</TableCell></TableRow>) : <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}</TableBody></Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="power">
          <Card className="border-0 shadow-md"><CardContent className="pt-4">
            <Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Daily</TableHead><TableHead>Monthly</TableHead><TableHead>Source</TableHead><TableHead>Connection</TableHead><TableHead>Proof</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
              <TableBody>{d.power.length ? d.power.map(p => <TableRow key={p.id} className="hover:bg-primary/5"><TableCell>{p.dailyUsage} kWh</TableCell><TableCell className="font-semibold">{p.monthlyUsage} kWh</TableCell><TableCell><Badge variant="outline" className="rounded-full">{p.powerSource}</Badge></TableCell><TableCell>{p.connectionNumber}</TableCell><TableCell><ProofLink fileName={p.proofFileName} fileData={p.proofFileData} /></TableCell><TableCell className="text-xs text-muted-foreground">{p.updatedDate}</TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}</TableBody></Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="water">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Droplets className="h-5 w-5 text-info" />Add Water Consumption</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Daily Usage (KL)</Label><Input type="number" value={waterDaily} onChange={e => setWaterDaily(e.target.value)} placeholder="0" className="bg-background" /></div>
                  <div><Label>Monthly Usage (KL)</Label><Input type="number" value={waterMonthly} onChange={e => setWaterMonthly(e.target.value)} placeholder="0" className="bg-background" /></div>
                </div>
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
                <Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Daily (KL)</TableHead><TableHead>Monthly (KL)</TableHead><TableHead>Source</TableHead><TableHead>Proof</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
                  <TableBody>{d.water.length ? d.water.map(w => <TableRow key={w.id} className="hover:bg-primary/5"><TableCell>{w.dailyUsage} KL</TableCell><TableCell className="font-semibold">{w.monthlyUsage} KL</TableCell><TableCell><Badge variant="outline" className="rounded-full">{w.waterSource}</Badge></TableCell><TableCell><ProofLink fileName={w.proofFileName} fileData={w.proofFileData} /></TableCell><TableCell className="text-xs text-muted-foreground">{w.updatedDate}</TableCell></TableRow>) : <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}</TableBody></Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="turnover">
          <Card className="border-0 shadow-md"><CardContent className="pt-4">
            <Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Monthly</TableHead><TableHead>Annual</TableHead><TableHead>FY</TableHead><TableHead>Proof</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
              <TableBody>{d.turn.length ? d.turn.map(t => <TableRow key={t.id} className="hover:bg-primary/5"><TableCell>₹{t.monthlyTurnover.toLocaleString()}</TableCell><TableCell className="font-semibold">₹{t.annualTurnover.toLocaleString()}</TableCell><TableCell>{t.financialYear}</TableCell><TableCell><ProofLink fileName={t.proofFileName} fileData={t.proofFileData} /></TableCell><TableCell className="text-xs text-muted-foreground">{t.updatedDate}</TableCell></TableRow>) : <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}</TableBody></Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="csr">
          <Card className="border-0 shadow-md"><CardContent className="pt-4">
            <Table><TableHeader><TableRow className="bg-muted/30"><TableHead>Activity</TableHead><TableHead>Amount</TableHead><TableHead>Location</TableHead><TableHead>Date</TableHead><TableHead>Proof</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
              <TableBody>{d.csr.length ? d.csr.map(c => <TableRow key={c.id} className="hover:bg-primary/5"><TableCell>{c.activityName}</TableCell><TableCell className="font-semibold">₹{c.amountSpent.toLocaleString()}</TableCell><TableCell>{c.location}</TableCell><TableCell>{c.activityDate}</TableCell><TableCell><ProofLink fileName={c.proofFileName} fileData={c.proofFileData} /></TableCell><TableCell className="text-xs text-muted-foreground">{c.updatedDate}</TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}</TableBody></Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <DashboardLayout
      title={sipcot?.name || "SIPCOT Admin"}
      subtitle={`${sipcot?.district || ""} District · ${industriesList.length} Industries`}
      actions={<Button variant="outline" size="sm" onClick={generateReport} className="gap-1.5"><FileText className="h-4 w-4" />Generate Report</Button>}
    >
      {!selectedIndustry ? (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-lg font-bold mb-3 text-muted-foreground uppercase tracking-wider text-xs">Industries</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {industriesList.map((ind, i) => {
                const d = detailData[ind.id];
                const latestInv = d?.inv[d.inv.length - 1];
                const latestEmp = d?.emp[d.emp.length - 1];
                return (
                  <motion.div key={ind.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
                    <Card className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/30 border-0 shadow-md group overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-secondary/[0.02] group-hover:from-primary/[0.06] group-hover:to-secondary/[0.06] transition-all duration-300" />
                      <CardContent className="flex items-center gap-4 p-5 relative">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-warning shadow-md group-hover:shadow-lg transition-shadow">
                          <Factory className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0" onClick={() => setSelectedIndustry(ind)}>
                          <h3 className="font-display font-semibold truncate">{ind.name}</h3>
                          <div className="flex gap-3 mt-1">
                            <span className="text-xs text-muted-foreground">Inv: ₹{latestInv?.totalAmount.toLocaleString() || '0'}</span>
                            <span className="text-xs text-muted-foreground">Emp: {latestEmp ? latestEmp.male + latestEmp.female : 0}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => downloadExcel(ind)} className="hover:bg-primary/10">
                          <FileSpreadsheet className="h-4 w-4 text-primary" />
                        </Button>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" onClick={() => setSelectedIndustry(ind)} />
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
              {industriesList.length === 0 && <p className="text-muted-foreground col-span-full text-center py-12">No industries assigned yet.</p>}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedIndustry(null)} className="hover:bg-primary/10">← Back</Button>
            <Button variant="outline" size="sm" onClick={() => downloadExcel(selectedIndustry)} className="gap-1.5"><FileSpreadsheet className="h-4 w-4" />Download Excel</Button>
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">{selectedIndustry.name}</h2>
          {renderDetails(selectedIndustry.id)}
        </div>
      )}
    </DashboardLayout>
  );
};

export default SipcotAdmin;
