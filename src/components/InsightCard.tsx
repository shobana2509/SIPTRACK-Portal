import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Lightbulb, AlertTriangle, TrendingUp, TrendingDown, Sparkles } from "lucide-react";

export type InsightType = "prediction" | "anomaly" | "recommendation" | "positive" | "negative";

interface InsightCardProps {
  title: string;
  description: string;
  type: InsightType;
  delay?: number;
}

const getIcon = (type: InsightType) => {
  switch (type) {
    case "prediction": return <Sparkles className="h-5 w-5 text-indigo-500" />;
    case "anomaly": return <AlertTriangle className="h-5 w-5 text-warning" />;
    case "recommendation": return <Lightbulb className="h-5 w-5 text-info" />;
    case "positive": return <TrendingUp className="h-5 w-5 text-success" />;
    case "negative": return <TrendingDown className="h-5 w-5 text-destructive" />;
  }
};

const getGradient = (type: InsightType) => {
  switch (type) {
    case "prediction": return "from-indigo-500/10 to-purple-500/10 border-indigo-500/20";
    case "anomaly": return "from-warning/10 to-orange-500/10 border-warning/20";
    case "recommendation": return "from-info/10 to-cyan-500/10 border-info/20";
    case "positive": return "from-success/10 to-emerald-500/10 border-success/20";
    case "negative": return "from-destructive/10 to-red-500/10 border-destructive/20";
  }
};

export function InsightCard({ title, description, type, delay = 0 }: InsightCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay }}
    >
      <Card className={`border shadow-sm overflow-hidden relative bg-gradient-to-br ${getGradient(type)}`}>
        <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2 space-y-0">
          <div className="bg-background rounded-full p-1.5 shadow-sm">
            {getIcon(type)}
          </div>
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
