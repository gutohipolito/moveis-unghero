import * as React from "react"
import { cn } from "@/lib/utils"

export interface DialogProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export function Dialog({ isOpen, onClose, children, className }: DialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null)

  React.useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal()
        document.body.style.overflow = "hidden"
      }
    } else {
      if (dialog.open) {
        dialog.close()
        document.body.style.overflow = ""
      }
    }
  }, [isOpen])

  // Limpa o overflow ao desmontar
  React.useEffect(() => {
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault()
    onClose()
  }

  // Fecha ao clicar fora
  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const rect = dialogRef.current?.getBoundingClientRect()
    if (!rect) return
    const isInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width
    if (!isInDialog) {
      onClose()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleClick}
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-xs outline-hidden focus:outline-hidden w-[95vw] sm:w-[94vw] max-w-xl fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 open:animate-in open:fade-in open:zoom-in-95 max-h-[92vh] sm:max-h-[85vh] open:flex open:flex-col",
        className
      )}
    >
      <div className="p-3.5 sm:p-5 relative overflow-y-auto flex-1 max-h-[92vh] sm:max-h-[85vh] break-words">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 cursor-pointer p-1 bg-slate-100/50 hover:bg-slate-200/50 rounded-full"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <span className="sr-only">Fechar</span>
        </button>
        {children}
      </div>
    </dialog>
  )
}
