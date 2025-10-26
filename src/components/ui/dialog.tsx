import * as React from "react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={() => onOpenChange?.(false)}
    >
      <div className="fixed inset-0 bg-black/50" />
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  )
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

function DialogContent({ className, children, ...props }: DialogContentProps) {
  return (
    <div
      className={cn(
        "relative z-50 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-6 shadow-lg",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

function DialogHeader({ className, children, ...props }: DialogHeaderProps) {
  return (
    <div className={cn("mb-4", className)} {...props}>
      {children}
    </div>
  )
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
}

function DialogTitle({ className, children, ...props }: DialogTitleProps) {
  return (
    <h3 className={cn("text-xl font-bold text-[color:var(--foreground)]", className)} {...props}>
      {children}
    </h3>
  )
}

interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

function DialogDescription({ className, children, ...props }: DialogDescriptionProps) {
  return (
    <p className={cn("text-sm text-[color:var(--muted-foreground)]", className)} {...props}>
      {children}
    </p>
  )
}

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

function DialogFooter({ className, children, ...props }: DialogFooterProps) {
  return (
    <div className={cn("mt-6 flex justify-end gap-3", className)} {...props}>
      {children}
    </div>
  )
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter }
