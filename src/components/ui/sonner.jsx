import { Toaster as Sonner } from "sonner"

/**
 * Toast 알림 컴포넌트
 * sonner 라이브러리 기반
 */
const Toaster = ({ ...props }) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:border-green-500/50 group-[.toaster]:text-green-600 dark:group-[.toaster]:text-green-400",
          error: "group-[.toaster]:border-red-500/50 group-[.toaster]:text-red-600 dark:group-[.toaster]:text-red-400",
          warning: "group-[.toaster]:border-yellow-500/50 group-[.toaster]:text-yellow-600 dark:group-[.toaster]:text-yellow-400",
          info: "group-[.toaster]:border-blue-500/50 group-[.toaster]:text-blue-600 dark:group-[.toaster]:text-blue-400",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

