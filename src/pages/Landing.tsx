import { Link } from "react-router-dom";
import { Shield, Building2, Factory, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const roles = [
  {
    title: "Super Admin",
    description: "Manage all districts, SIPCOTs, and industries across the system",
    icon: Shield,
    path: "/login/super-admin",
    gradient: "from-primary to-info",
    shadow: "shadow-primary/25",
    borderHover: "hover:border-primary/30",
  },
  {
    title: "SIPCOT Admin",
    description: "Oversee industries and operations within your assigned estate",
    icon: Building2,
    path: "/login/sipcot-admin",
    gradient: "from-secondary to-success",
    shadow: "shadow-secondary/25",
    borderHover: "hover:border-secondary/30",
  },
  {
    title: "Industry Admin",
    description: "Manage your industry data, investments, and compliance records",
    icon: Factory,
    path: "/login/industry-admin",
    gradient: "from-accent to-warning",
    shadow: "shadow-accent/25",
    borderHover: "hover:border-accent/30",
  },
];

const Landing = () => {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4">
      <div className="absolute inset-0">
        <motion.div
          className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-primary/[0.08] blur-[120px]"
          animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" as const }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-secondary/[0.08] blur-[120px]"
          animate={{ x: [0, -50, 0], y: [0, -40, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" as const }}
        />
        <motion.div
          className="absolute left-1/2 top-1/4 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-[100px]"
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" as const }}
        />
      </div>

      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `linear-gradient(hsl(var(--foreground) / 0.1) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-primary/40"
          style={{ left: `${10 + i * 12}%`, top: `${15 + (i % 4) * 20}%` }}
          animate={{ y: [0, -40, 0], x: [0, i % 2 === 0 ? 15 : -15, 0], opacity: [0.1, 0.7, 0.1], scale: [0.5, 1.5, 0.5] }}
          transition={{ duration: 4 + i * 0.6, repeat: Infinity, ease: "easeInOut" as const, delay: i * 0.5 }}
        />
      ))}

      <div className="relative z-10 w-full max-w-5xl">
        <motion.div className="mb-16 text-center" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" as const }}>
          <motion.div className="flex items-center justify-center gap-2 mb-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}>
            <Sparkles className="h-5 w-5 text-accent" />
            <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Welcome to</span>
            <Sparkles className="h-5 w-5 text-accent" />
          </motion.div>

          <motion.h1 className="font-display text-6xl font-bold tracking-tight text-foreground" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}>
            SIP<span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Track</span>
          </motion.h1>

          <motion.p className="mt-4 text-lg text-muted-foreground max-w-md mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.4 }}>
            Industrial Estate Management System
          </motion.p>

          <motion.div className="mx-auto mt-6 flex items-center justify-center gap-2" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.6 }}>
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/50" />
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <div className="h-px w-24 bg-gradient-to-r from-primary to-secondary" />
            <div className="h-1.5 w-1.5 rounded-full bg-secondary" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-secondary/50" />
          </motion.div>
        </motion.div>

        <motion.p className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          Select your role to continue
        </motion.p>

        <div className="grid gap-6 sm:grid-cols-3">
          {roles.map((role, index) => {
            const Icon = role.icon;
            return (
              <motion.div key={role.path} initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, delay: 0.4 + index * 0.15, ease: "easeOut" as const }}>
                <Link to={role.path} className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-8 transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl ${role.shadow} ${role.borderHover}`}>
                  <div className={`absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${role.gradient} opacity-0 blur-3xl transition-all duration-700 group-hover:opacity-20`} />
                  <div className={`absolute -left-16 -bottom-16 h-32 w-32 rounded-full bg-gradient-to-br ${role.gradient} opacity-0 blur-3xl transition-all duration-700 group-hover:opacity-10`} />
                  <motion.div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br ${role.gradient} shadow-lg`} whileHover={{ scale: 1.15, rotate: 8 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                    <Icon className="h-8 w-8 text-primary-foreground" />
                  </motion.div>
                  <h2 className="mb-2 text-xl font-bold text-foreground">{role.title}</h2>
                  <p className="mb-6 flex-1 text-sm leading-relaxed text-muted-foreground">{role.description}</p>
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-all duration-300 group-hover:text-foreground group-hover:gap-3">
                    <span>Sign in</span>
                    <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" as const }}>
                      <ArrowRight className="h-4 w-4" />
                    </motion.div>
                  </div>
                  <div className={`absolute bottom-0 left-0 h-1 w-full origin-left scale-x-0 bg-gradient-to-r ${role.gradient} transition-transform duration-500 group-hover:scale-x-100`} />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Landing;
