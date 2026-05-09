import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getActivityLogs, type ActivityLog as ActivityLogType } from "@/lib/store";
import { ArrowLeft, Clock, User, Shield, Building2, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const ActivityLog = () => {
  const [logs, setLogs] = useState<ActivityLogType[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await getActivityLogs();
        setLogs(data);
        setFilteredLogs(data);
      } catch (error) {
        console.error("Failed to fetch logs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  useEffect(() => {
    if (roleFilter === "all") {
      setFilteredLogs(logs);
    } else {
      setFilteredLogs(logs.filter(log => log.role === roleFilter));
    }
  }, [roleFilter, logs]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "super_admin": return <Shield className="h-3 w-3" />;
      case "sipcot_admin": return <Building2 className="h-3 w-3" />;
      default: return <User className="h-3 w-3" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin": return <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">{getRoleIcon(role)} Super Admin</Badge>;
      case "sipcot_admin": return <Badge className="bg-secondary/10 text-secondary border-secondary/20 gap-1">{getRoleIcon(role)} SIPCOT Admin</Badge>;
      case "industry_admin": return <Badge className="bg-accent/10 text-accent border-accent/20 gap-1">{getRoleIcon(role)} Industry Admin</Badge>;
      default: return <Badge variant="outline" className="gap-1">{getRoleIcon(role)} {role}</Badge>;
    }
  };

  return (
    <DashboardLayout
      title="Activity Log"
      subtitle="Login activity for all administrators"
      actions={
        <Button variant="ghost" size="sm" onClick={() => navigate("/super-admin")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>
      }
    >
      <div className="space-y-6">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activities
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium whitespace-nowrap hidden sm:inline-block">Filter by Role:</Label>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px] bg-background/50">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="sipcot_admin">SIPCOT Admin</SelectItem>
                  <SelectItem value="industry_admin">Industry Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log, i) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="hover:bg-primary/5 transition-colors"
                    >
                      <TableCell className="font-medium">{log.username}</TableCell>
                      <TableCell>{getRoleBadge(log.role)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-info/10 text-info border-info/20">
                          {log.activityType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </TableCell>
                    </motion.tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                        No activity logs found for the selected filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ActivityLog;
