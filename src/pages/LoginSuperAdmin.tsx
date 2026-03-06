import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, LogIn, ArrowLeft, Eye, EyeOff, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const LoginSuperAdmin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) {
      const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
      if (user.role !== "super_admin") {
        toast.error("Access denied. This login is for Super Admin only.");
        return;
      }
      toast.success(`Welcome, ${user.name}!`);
      navigate("/super-admin");
    } else {
      toast.error("Invalid username or password");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <motion.div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]"
        animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" as const }} />
      <motion.div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-accent/[0.08] blur-[120px]"
        animate={{ x: [0, -40, 0], y: [0, -30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" as const }} />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(hsl(var(--foreground) / 0.1) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.1) 1px, transparent 1px)`,
        backgroundSize: '50px 50px',
      }} />
      <motion.div initial={{ opacity: 0, y: 40, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, ease: "easeOut" as const }} className="relative z-10 w-full max-w-md">
        <Card className="shadow-2xl shadow-primary/5 border-border bg-card/90 backdrop-blur-md overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary to-info" />
          <CardHeader className="text-center pb-2 pt-8">
            <Link to="/" className="absolute left-6 top-8 text-muted-foreground hover:text-foreground transition-colors">
              <motion.div whileHover={{ x: -4 }} transition={{ type: "spring", stiffness: 400 }}><ArrowLeft className="h-5 w-5" /></motion.div>
            </Link>
            <motion.div className="mx-auto mb-5 relative" animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" as const }}>
              <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-info shadow-lg shadow-primary/30 mx-auto" style={{ height: 72, width: 72 }}>
                <Shield className="h-9 w-9 text-primary-foreground" />
              </div>
            </motion.div>
            <CardTitle className="font-display text-2xl">Super Admin</CardTitle>
            <CardDescription>System-wide management access</CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div className="space-y-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Username</Label>
                <div className={`relative rounded-lg transition-all duration-300 ${isFocused === 'username' ? 'ring-2 ring-primary/30' : ''}`}>
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="username" value={username} onChange={e => setUsername(e.target.value)} onFocus={() => setIsFocused('username')} onBlur={() => setIsFocused(null)} placeholder="Enter username" required className="pl-10 bg-muted/50 border-border" />
                </div>
              </motion.div>
              <motion.div className="space-y-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
                <div className={`relative rounded-lg transition-all duration-300 ${isFocused === 'password' ? 'ring-2 ring-primary/30' : ''}`}>
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onFocus={() => setIsFocused('password')} onBlur={() => setIsFocused(null)} placeholder="Enter password" required className="pl-10 pr-10 bg-muted/50 border-border" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Button type="submit" className="w-full bg-gradient-to-r from-primary to-info hover:from-primary/90 hover:to-info/90 text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5" size="lg">
                  <LogIn className="mr-2 h-4 w-4" />Sign In as Super Admin
                </Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginSuperAdmin;
