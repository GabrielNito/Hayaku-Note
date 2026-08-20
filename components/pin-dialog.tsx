"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Button } from "@/components/ui/button"

interface PinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (pin: string) => Promise<void> | void
  title?: string
  description?: string
}

export function PinDialog({
  open,
  onOpenChange,
  onSuccess,
  title = "Confirmação de PIN",
  description = "Digite o PIN de 6 dígitos para autorizar esta ação.",
}: PinDialogProps) {
  const [pin, setPin] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState("")
  const [shake, setShake] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const [prevOpen, setPrevOpen] = React.useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setPin("")
      setError(false)
      setErrorMessage("")
      setLoading(false)
      setShake(false)
    }
  }

  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [open])

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (pin.length !== 6) return

    setLoading(true)
    setError(false)
    setErrorMessage("")

    try {
      await onSuccess(pin)
      onOpenChange(false)
    } catch (err: unknown) {
      setPin("")
      setError(true)
      setShake(true)
      setTimeout(() => {
        setShake(false)
        inputRef.current?.focus()
      }, 400)
      if (err instanceof Error) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage("PIN inválido ou erro na operação.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={`sm:max-w-100 px-0 transition-all duration-200 ${shake ? "animate-ios-shake ring-2 ring-destructive/50" : ""}`}>
        <AlertDialogHeader className="px-4">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 p-0">
          <InputOTP
            ref={inputRef}
            maxLength={6}
            value={pin}
            onChange={(value) => {
              setPin(value)
              if (error) setError(false)
            }}
            disabled={loading}
            autoFocus
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          {error && (
            <p className="text-xs text-destructive font-mono animate-ios-pop">
              {errorMessage || "PIN incorreto."}
            </p>
          )}

          <AlertDialogFooter className="w-full flex justify-end gap-2 pt-2">
            <AlertDialogCancel type="button" disabled={loading} className="ios-press">
              Cancelar
            </AlertDialogCancel>
            <Button
              type="submit"
              disabled={pin.length !== 6 || loading}
              className="ios-press"
            >
              {loading ? "Validando..." : "Confirmar"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
