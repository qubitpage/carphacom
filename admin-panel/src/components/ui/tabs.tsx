"use client"

import * as React from "react"

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

export function Tabs({ 
  value, 
  defaultValue, 
  onValueChange, 
  children, 
  className = "",
  ...props 
}: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  const currentValue = value !== undefined ? value : internalValue
  
  const handleValueChange = React.useCallback((newValue: string) => {
    setInternalValue(newValue)
    onValueChange?.(newValue)
  }, [onValueChange])

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsList({ 
  children, 
  className = "" 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <div className={`flex gap-2 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  )
}

export function TabsTrigger({ 
  value, 
  children, 
  className = "",
  disabled = false
}: { 
  value: string
  children: React.ReactNode
  className?: string 
  disabled?: boolean
}) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("TabsTrigger must be used within Tabs")
  
  const isActive = context.value === value
  
  return (
    <button
      onClick={() => !disabled && context.onValueChange(value)}
      disabled={disabled}
      className={`px-4 py-2 text-sm font-medium transition-colors ${
        disabled
          ? "text-gray-400 cursor-not-allowed"
          : isActive 
            ? "border-b-2 border-blue-600 text-blue-600" 
            : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function TabsContent({ 
  value, 
  children, 
  className = "" 
}: { 
  value: string
  children: React.ReactNode
  className?: string 
}) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("TabsContent must be used within Tabs")
  
  if (context.value !== value) return null
  
  return (
    <div className={`pt-4 ${className}`}>
      {children}
    </div>
  )
}
