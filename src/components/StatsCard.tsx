import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, Metric, Text, Flex, ProgressBar } from '@tremor/react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  color?: 'blue' | 'orange' | 'green' | 'red';
  progress?: number;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  color = 'blue',
  progress
}) => {
  const colorMap = {
    blue: 'primary',
    orange: 'orange',
    green: 'green',
    red: 'red'
  };

  const bgColorMap = {
    blue: 'bg-primary-100',
    orange: 'bg-orange-100',
    green: 'bg-green-100',
    red: 'bg-red-100'
  };

  const textColorMap = {
    blue: 'text-primary-600',
    orange: 'text-orange-600',
    green: 'text-green-600',
    red: 'text-red-600'
  };

  return (
    <Card className="max-w-lg mx-auto overflow-hidden shadow-md hover:shadow-lg transition-all duration-300" decoration="top" decorationColor={colorMap[color]}>
      <Flex alignItems="start">
        <div className="w-full">
          <Text className="text-sm sm:text-base text-gray-500">{title}</Text>
          <Metric className="text-xl sm:text-2xl mt-1">{value}</Metric>
          {trend && (
            <div className="mt-2">
              <Text color={trend.isPositive ? "green" : "red"} className="text-xs">
                {trend.isPositive ? "+" : "-"}{trend.value}%
                {trend.label && <span className="text-gray-500 ml-1">{trend.label}</span>}
              </Text>
            </div>
          )}
          {typeof progress === 'number' && (
            <ProgressBar value={progress} color={colorMap[color]} className="mt-3" />
          )}
        </div>
        <div className={`${bgColorMap[color]} p-3 rounded-full`}>
          <Icon className={`h-6 w-6 ${textColorMap[color]}`} />
        </div>
      </Flex>
    </Card>
  );
};