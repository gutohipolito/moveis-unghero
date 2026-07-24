import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsProps {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

type TabInjectProps = {
  activeTab: string
  setActiveTab: (value: string) => void
}

function injectTabProps(
  children: React.ReactNode,
  props: TabInjectProps
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child

    const type = child.type as { displayName?: string } | string
    const name =
      typeof type === "function" || typeof type === "object"
        ? (type as { displayName?: string }).displayName
        : undefined

    const isList = name === "TabsList" || type === TabsList
    const isContent = name === "TabsContent" || type === TabsContent

    if (isList || isContent) {
      return React.cloneElement(child as React.ReactElement<any>, {
        ...props,
        children: injectTabProps(
          (child as React.ReactElement<any>).props?.children,
          props
        ),
      })
    }

    const nested = (child as React.ReactElement<any>).props?.children
    if (nested == null) return child

    return React.cloneElement(child as React.ReactElement<any>, {
      children: injectTabProps(nested, props),
    })
  })
}

export function Tabs({ defaultValue, value, onValueChange, children, className }: TabsProps) {
  const [activeTab, setActiveTab] = React.useState(value || defaultValue || "")

  React.useEffect(() => {
    if (value !== undefined) {
      setActiveTab(value)
    }
  }, [value])

  const handleTabChange = (newValue: string) => {
    if (value === undefined) {
      setActiveTab(newValue)
    }
    if (onValueChange) {
      onValueChange(newValue)
    }
  }

  return (
    <div className={cn("w-full min-w-0 max-w-full", className)}>
      {injectTabProps(children, {
        activeTab,
        setActiveTab: handleTabChange,
      })}
    </div>
  )
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
  activeTab?: string
  setActiveTab?: (value: string) => void
}

export function TabsList({ children, className, activeTab, setActiveTab }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex h-9 max-w-full min-w-0 items-center justify-start gap-0.5 overflow-x-auto overscroll-x-contain rounded-lg bg-secondary p-1 text-muted-foreground border border-border/40",
        className
      )}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const element = child as React.ReactElement<{ value: string; [key: string]: any }>
          return React.cloneElement(element, {
            active: activeTab === element.props.value,
            onClick: () => setActiveTab && setActiveTab(element.props.value),
          })
        }
        return child
      })}
    </div>
  )
}
TabsList.displayName = "TabsList"

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
  active?: boolean
  onClick?: () => void
}

export function TabsTrigger({ value, children, className, active, onClick }: TabsTriggerProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      role="tab"
      aria-selected={active}
      className={cn(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
        active
          ? "bg-card text-foreground shadow-xs font-semibold border border-border/50"
          : "hover:text-foreground opacity-75 hover:opacity-100",
        className
      )}
    >
      {children}
    </button>
  )
}
TabsTrigger.displayName = "TabsTrigger"

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
  activeTab?: string
}

export function TabsContent({ value, children, className, activeTab }: TabsContentProps) {
  if (activeTab !== value) return null

  return (
    <div
      role="tabpanel"
      className={cn("mt-4 outline-hidden animate-in fade-in duration-200", className)}
    >
      {children}
    </div>
  )
}
TabsContent.displayName = "TabsContent"
