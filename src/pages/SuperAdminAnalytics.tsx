import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getSipcotComparison,
  getIndustryPerformance,
  anomalies,
  type IndustryPerformance,
  type Anomaly
} from "@/lib/store";
import { TrendingUp, TrendingDown, Zap, Heart, ArrowLeft, BarChart3, Users, Droplets, Building, BrainCircuit, ArrowUpRight, ArrowDownRight, Info, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { formatIndianCurrency } from "@/lib/formatCurrency";
import { Navigate, useNavigate } from "react-router-dom";
import { TrendChart } from "@/components/TrendChart";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const SuperAdminAnalytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sipcotStats, setSipcotStats] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<IndustryPerformance | null>(null);
  const [allAnomalies, setAllAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnomaliesOnly, setShowAnomaliesOnly] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [stats, performance, anoms] = await Promise.all([
        getSipcotComparison(),
        getIndustryPerformance(),
        anomalies.getAll()
      ]);
      setSipcotStats(stats);
      setPerformanceData(performance);
      setAllAnomalies(anoms);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!user || user.role !== "super_admin") return <Navigate to="/" />;

  const getInsights = () => {
    if (!sipcotStats.length) return null;
    const stats = sipcotStats.map(s => ({
      ...s,
      totalInvestments: Number(s.totalInvestments),
      totalTurnover: Number(s.totalTurnover),
    }));
    const activeInv = stats.filter(s => s.totalInvestments > 0);
    const activeTurn = stats.filter(s => s.totalTurnover > 0);
    if (!activeInv.length && !activeTurn.length) return null;
    const highestInv = [...stats].sort((a, b) => b.totalInvestments - a.totalInvestments)[0];
    const lowestInv = activeInv.length ? [...activeInv].sort((a, b) => a.totalInvestments - b.totalInvestments)[0] : highestInv;
    const highestTurn = [...stats].sort((a, b) => b.totalTurnover - a.totalTurnover)[0];
    const lowestTurn = activeTurn.length ? [...activeTurn].sort((a, b) => a.totalTurnover - b.totalTurnover)[0] : highestTurn;
    return { highestInv, lowestInv, highestTurn, lowestTurn };
  };

  const insights = getInsights();

  const getPerformanceIcon = (perf: string) => {
    switch (perf) {
      case 'Excellent': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'Good': return <ArrowUpRight className="h-4 w-4 text-blue-500" />;
      case 'Average': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      default: return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getPerformanceBadge = (perf: string) => {
    switch (perf) {
      case 'Excellent': return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 font-bold uppercase tracking-wider text-[10px]">{perf}</Badge>;
      case 'Good': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 font-bold uppercase tracking-wider text-[10px]">{perf}</Badge>;
      case 'Average': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 font-bold uppercase tracking-wider text-[10px]">{perf}</Badge>;
      default: return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 font-bold uppercase tracking-wider text-[10px]">{perf}</Badge>;
    }
  };

  return (
    <DashboardLayout
      title="SIPTrack Analytics"
      subtitle="Comprehensive Performance Insights"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => loadData()} className="gap-1.5 h-8">
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/super-admin")} className="gap-1.5 h-8">
            <ArrowLeft className="h-4 w-4" />Dashboard
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[600px] text-muted-foreground gap-3">
            <BarChart3 className="h-10 w-10 animate-bounce text-primary/40" />
            <p className="text-sm font-medium animate-pulse">Running Decision Tree algorithms...</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* AI Decision Tree Core Section */}
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="border-0 shadow-xl bg-card lg:col-span-3 overflow-hidden">
                <CardHeader className="pb-2 border-b bg-muted/20">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-primary" />
                          Industry Performance Details
                        </CardTitle>
                        <p className="text-xs text-muted-foreground font-normal">Classification of all industries</p>
                      </div>
                      <div className="h-8 w-[1px] bg-border hidden sm:block"></div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant={showAnomaliesOnly ? "destructive" : "outline"} 
                          size="sm" 
                          className="h-7 text-[10px] px-2 font-bold uppercase tracking-wider"
                          onClick={() => setShowAnomaliesOnly(!showAnomaliesOnly)}
                        >
                          {showAnomaliesOnly ? <AlertCircle className="mr-1 h-3 w-3" /> : <BrainCircuit className="mr-1 h-3 w-3" />}
                          {showAnomaliesOnly ? "Showing AI Alerts" : "AI Alerts Filter"}
                        </Button>
                      </div>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <Info className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[350px] p-4 text-xs space-y-2">
                          <p className="font-bold border-b pb-1">Decision Tree Nodes & Formulas:</p>
                          <p>• <b>ROI:</b> Turnover / Investment (Target &gt; 0.4 for Excellent)</p>
                          <p>• <b>Efficiency:</b> Turnover / Power Usage</p>
                          <p>• <b>Water Efficiency:</b> Turnover / Water Usage</p>
                          <p>• <b>Debt Ratio:</b> Total Debt / Capital Investment</p>
                          <p>• <b>CSR Ratio:</b> CSR Spend / Annual Turnover</p>
                          <p>• <b>Stability:</b> Workforce size and consistent operational throughput.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardHeader>
                <CardContent className="p-0 max-h-[450px] overflow-y-auto scrollbar-thin">
                  <div className="divide-y">
                    {performanceData?.classified
                      .filter(ind => !showAnomaliesOnly || (ind.anomalies && ind.anomalies.length > 0))
                      .sort((a, b) => {
                        const order = { 'Excellent': 0, 'Good': 1, 'Average': 2, 'Poor': 3 };
                        return order[a.performance] - order[b.performance];
                      })
                      .map(ind => (
                        <div key={ind.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">


                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-bold text-sm truncate">{ind.name}</span>
                                {getPerformanceBadge(ind.performance)}
                                {ind.anomalies && ind.anomalies.map((anomaly: string, i: number) => (
                                  <Badge key={i} variant="destructive" className="h-4 text-[8px] animate-pulse">
                                    AI: {anomaly}
                                  </Badge>
                                ))}
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground uppercase font-medium">
                                <span className="bg-muted px-1.5 py-0.5 rounded flex items-center gap-1"><Building className="h-2.5 w-2.5" />{ind.sipcotName}</span>
                                <span className="flex items-center gap-1"><TrendingUp className="h-2.5 w-2.5 text-green-500" /> ROI: {ind.metrics.roi}x</span>
                              </div>
                              <div className="text-[9px] text-muted-foreground mt-1 italic font-normal">
                                Reason: {ind.reason}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-bold">{formatIndianCurrency(ind.turnover)}</div>
                            <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">Turnover</div>
                          </div>
                        </div>
                      ))}
                    {performanceData?.classified.length === 0 && (
                      <div className="p-12 text-center text-muted-foreground/60 italic text-sm">No industry data found in current data set.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>


            {/* Performance Insights Summary Cards */}
            {insights && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-1 bg-primary/20 flex-1 rounded-full" />
                  <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground grow-0 px-4">Financial Extremes</h3>
                  <div className="h-1 bg-primary/20 flex-1 rounded-full" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card className="border-l-4 border-l-green-500 shadow-sm bg-green-500/5 hover:-translate-y-1 transition-transform">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Highest Investment</span>
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="font-bold text-lg mb-1 truncate" title={insights.highestInv.name}>{insights.highestInv.name}</div>
                      <div className="text-green-600 font-medium text-sm">{formatIndianCurrency(insights.highestInv.totalInvestments)}</div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-red-500 shadow-sm bg-red-500/5 hover:-translate-y-1 transition-transform">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lowest Investment</span>
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="font-bold text-lg mb-1 truncate" title={insights.lowestInv.name}>{insights.lowestInv.name}</div>
                      <div className="text-red-600 font-medium text-sm">{formatIndianCurrency(insights.lowestInv.totalInvestments)}</div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-green-500 shadow-sm bg-green-500/5 hover:-translate-y-1 transition-transform">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Highest Turnover</span>
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="font-bold text-lg mb-1 truncate" title={insights.highestTurn.name}>{insights.highestTurn.name}</div>
                      <div className="text-green-600 font-medium text-sm">{formatIndianCurrency(insights.highestTurn.totalTurnover)}</div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-red-500 shadow-sm bg-red-500/5 hover:-translate-y-1 transition-transform">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lowest Turnover</span>
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="font-bold text-lg mb-1 truncate" title={insights.lowestTurn.name}>{insights.lowestTurn.name}</div>
                      <div className="text-red-600 font-medium text-sm">{formatIndianCurrency(insights.lowestTurn.totalTurnover)}</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    SIPCOT Investment Comparison
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-normal">Total verified investments per SIPCOT region</p>
                </CardHeader>
                <CardContent className="pt-0">
                  {sipcotStats.length > 0 ? (
                    <TrendChart
                      data={sipcotStats}
                      xAxisKey="name"
                      layout="vertical"
                      series={[
                        { key: 'totalInvestments', label: 'Investments', color: 'hsl(var(--primary))' },
                      ]}
                    />
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
                      No data available for comparison
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-secondary" />
                    SIPCOT Turnover Comparison
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-normal">Total verified turnover per SIPCOT region</p>
                </CardHeader>
                <CardContent className="pt-0">
                  {sipcotStats.length > 0 ? (
                    <TrendChart
                      data={sipcotStats}
                      xAxisKey="name"
                      layout="vertical"
                      series={[
                        { key: 'totalTurnover', label: 'Turnover', color: 'hsl(var(--secondary))' }
                      ]}
                    />
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
                      No data available for comparison
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-secondary" />
                    SIPCOT Workforce Comparison
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-normal">Total employees across all industries per region</p>
                </CardHeader>
                <CardContent className="pt-0">
                  {sipcotStats.length > 0 ? (
                    <TrendChart
                      data={sipcotStats}
                      xAxisKey="name"
                      layout="vertical"
                      series={[{ key: 'totalEmployees', label: 'Employees', color: '#3b82f6' }]}
                      valueFormatter={(val) => `${val}`}
                    />
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
                      No data available for comparison
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-warning" />
                    SIPCOT Power Usage Comparison
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-normal">Total verified yearly power usage (kWh) per region</p>
                </CardHeader>
                <CardContent className="pt-0">
                  {sipcotStats.length > 0 ? (
                    <TrendChart
                      data={sipcotStats}
                      xAxisKey="name"
                      layout="vertical"
                      series={[{ key: 'totalPowerUsage', label: 'Power Usage', color: 'hsl(var(--warning))' }]}
                      valueFormatter={(val) => `${val} kWh`}
                    />
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
                      No data available for comparison
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Droplets className="h-5 w-5 text-info" />
                    SIPCOT Water Usage Comparison
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-normal">Total verified yearly water usage (KL) per region</p>
                </CardHeader>
                <CardContent className="pt-0">
                  {sipcotStats.length > 0 ? (
                    <TrendChart
                      data={sipcotStats}
                      xAxisKey="name"
                      layout="vertical"
                      series={[{ key: 'totalWaterUsage', label: 'Water Usage', color: 'hsl(var(--info))' }]}
                      valueFormatter={(val) => `${val} KL`}
                    />
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
                      No data available for comparison
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Heart className="h-5 w-5 text-destructive" />
                    SIPCOT CSR Contribution Comparison
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-normal">Total CSR spend across all industries per region</p>
                </CardHeader>
                <CardContent className="pt-0">
                  {sipcotStats.length > 0 ? (
                    <TrendChart
                      data={sipcotStats}
                      xAxisKey="name"
                      layout="vertical"
                      series={[{ key: 'totalCsr', label: 'CSR Contribution', color: 'hsl(var(--destructive))' }]}
                    />
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
                      No data available for comparison
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" />
                    SIPCOT Loan Exposure Comparison
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-normal">Total loan amount across all industries per region</p>
                </CardHeader>
                <CardContent className="pt-0">
                  {sipcotStats.length > 0 ? (
                    <TrendChart
                      data={sipcotStats}
                      xAxisKey="name"
                      layout="vertical"
                      series={[{ key: 'totalLoans', label: 'Loan Exposure', color: 'hsl(var(--primary))' }]}
                    />
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
                      No data available for comparison
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminAnalytics;
