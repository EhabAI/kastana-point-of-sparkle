import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
}

export function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <Card className="shadow-card hover-lift cursor-pointer">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-semibold text-foreground">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center transition-colors group-hover:bg-primary/20">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
