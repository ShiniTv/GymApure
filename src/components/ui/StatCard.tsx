import { type LucideIcon, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from './Card';

type StatColor = 'emerald' | 'blue' | 'orange' | 'red';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color?: StatColor;
  className?: string;
}

const colorMap: Record<StatColor, string> = {
  emerald: 'text-emerald-600 dark:text-emerald-500 bg-emerald-500/10',
  blue: 'text-blue-600 dark:text-blue-500 bg-blue-500/10',
  orange: 'text-orange-600 dark:text-orange-500 bg-orange-500/10',
  red: 'text-red-600 dark:text-red-500 bg-red-500/10',
};

export function StatCard({ title, value, icon: Icon, trend, color = 'emerald', className }: StatCardProps) {
  return (
    <Card padding="md" rounded="xl" className={className}>
      <div className="flex items-center justify-between">
        <div>
          <p className="stat-label leading-none mb-1">{title}</p>
          <p className="stat-value">{value}</p>
        </div>
        <div className={cn('p-3 rounded-lg', colorMap[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span className="text-emerald-600 dark:text-emerald-500 font-medium flex items-center">
            <TrendingUp className="h-4 w-4 mr-1" />
            {trend}
          </span>
        </div>
      )}
    </Card>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent',
        className
      )}
    />
  );
}
