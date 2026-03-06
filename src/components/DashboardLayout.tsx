import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut, Building2, Factory, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const roleIcons = {
  super_admin: Shield,
  sipcot_admin: Building2,
  industry_admin: Factory,
};

const roleLabels = {
  super_admin: "Super Admin",
  sipcot_admin: "SIPCOT Admin",
  industry_admin: "Industry Admin",
};

const roleGradients = {
  super_admin: "from-primary to-info",
  sipcot_admin: "from-secondary to-success",
  industry_admin: "from-accent to-warning",
};

export function DashboardLayout({ children, title, subtitle, actions }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const Icon = user ? roleIcons[user.role] : Shield;
  const gradient = user ? roleGradients[user.role] : "from-primary to-info";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <motion.div
          className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-primary/[0.04] blur-[120px]"
          animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-secondary/[0.04] blur-[120px]"
          animate={{ x: [0, -50, 0], y: [0, -40, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <Icon className="h-5 w-5 text-primary-foreground" />
            </motion.div>
            <div>
              <h1 className="font-display text-lg font-bold leading-tight">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {actions}
            {user && (
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="container py-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
