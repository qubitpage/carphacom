"use client"

import { cn } from "@/lib/utils"

interface ResponsiveTableProps {
  children: React.ReactNode
  className?: string
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className={cn("overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0", className)}>
      <div className="min-w-[600px] lg:min-w-0">
        {children}
      </div>
    </div>
  )
}

interface MobileCardListProps<T> {
  items: T[]
  renderCard: (item: T, index: number) => React.ReactNode
  className?: string
}

export function MobileCardList<T>({ items, renderCard, className }: MobileCardListProps<T>) {
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item, index) => renderCard(item, index))}
    </div>
  )
}

interface DataCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function DataCard({ children, className, onClick }: DataCardProps) {
  return (
    <div 
      className={cn(
        "bg-white rounded-xl border border-gray-200 p-4 space-y-3",
        onClick && "cursor-pointer hover:border-blue-300 active:scale-[0.99] transition-all",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface DataRowProps {
  label: string
  value: React.ReactNode
  className?: string
}

export function DataRow({ label, value, className }: DataRowProps) {
  return (
    <div className={cn("flex justify-between items-start gap-2", className)}>
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right truncate">{value}</span>
    </div>
  )
}
