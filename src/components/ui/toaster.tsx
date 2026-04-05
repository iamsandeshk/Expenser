import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={2200}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const compactMessage =
          typeof title === "string" && title.trim().length > 0
            ? title
            : typeof description === "string"
              ? description
              : title || description

        return (
          <Toast key={id} {...props}>
            <div className="min-w-0 flex-1">
              {compactMessage && <ToastTitle className="truncate">{compactMessage}</ToastTitle>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
