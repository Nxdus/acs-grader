"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { ArrowLeft } from "lucide-react"

import { cn } from "@/lib/utils"
import {
    signInWithGithub,
    signInWithGoogle,
    signUp,
    updateUser,
} from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { FaGithub, FaGoogle } from "react-icons/fa"
import Image from "next/image"
import { Role } from "@/generated/prisma/enums"

type Step = "email" | "name" | "password"
export function SignupForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [step, setStep] = useState<Step>("email")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [nameDialogError, setNameDialogError] = useState<string | null>(null)
    const [isNameSubmitting, setIsNameSubmitting] = useState(false)

    const [email, setEmail] = useState("")
    const [name, setName] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const next = () => {
        setError(null)
        setSuccess(null)
        if (step === "email") setStep("name")
        else if (step === "name") setStep("password")
    }

    const back = () => {
        setError(null)
        setSuccess(null)
        if (step === "password") setStep("name")
        else if (step === "name") setStep("email")
    }

    const isNewOAuthUser = searchParams.get("new-user") === "1"
    const redirectUrl = "/"
    const [isNameDialogOpen, setIsNameDialogOpen] = useState(
        () => isNewOAuthUser,
    )

    const handleSocialSignIn = async (provider: "google" | "github") => {
        const newUserCallbackURL = `${window.location.pathname}?new-user=1`
        const options = {
            callbackURL: redirectUrl,
            newUserCallbackURL,
        }

        try {
            if (provider === "google") {
                await signInWithGoogle(options)
                return
            }

            await signInWithGithub(options)
        } catch {
            setError("Something went wrong. Please try again.")
        }
    }

    const handleNameDialogContinue = async () => {
        const trimmedName = name.trim()
        if (!trimmedName) {
            setNameDialogError("Please enter your name.")
            return
        }

        setNameDialogError(null)
        setIsNameSubmitting(true)
        const res = await updateUser({ name: trimmedName })
        setIsNameSubmitting(false)

        if (res.error) {
            setNameDialogError(res.error.message || "Something went wrong.")
            return
        }

        setIsNameDialogOpen(false)
        router.replace(redirectUrl)
    }

    async function handleSubmit() {
        setError(null)
        if (!name.trim()) {
            setError("Please enter your name.")
            setStep("name")
            return
        }

        if (password !== confirmPassword) {
            setError("Password and confirm password must match.")
            return
        }

        setIsSubmitting(true)
        const res = await signUp.email({
            email,
            name,
            password,
            role: Role.USER,
        })
        setIsSubmitting(false)

        if (res.error) {
            setError(res.error.message || "Something went wrong.")
            return
        }

        setSuccess("Sign up successful! Please check your email.")
    }

    return (
        <div
            className={cn(
                "flex items-center justify-center",
                className
            )}
            {...props}
        >
            <div className="min-w-sm max-w-md">
                <FieldGroup>
                    <div className="flex flex-col items-center gap-2 text-center">
                        <Image draggable={false} src={"/images/acs.svg"} alt="@ACS" width={128} height={128} className="w-16 dark:invert" />
                        <h1 className="text-xl font-bold text-primary">
                            Create your account
                        </h1>
                        <FieldDescription>
                            Already have an account?{" "}
                            <Link href="/sign-in" className="underline">
                                Sign in
                            </Link>
                        </FieldDescription>
                    </div>

                    {step === "email" && (
                        <Field>
                            <FieldLabel htmlFor="email">Email</FieldLabel>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <Button
                                className="w-full"
                                onClick={next}
                                disabled={!email}
                            >
                                Continue
                            </Button>
                        </Field>
                    )}

                    {step === "name" && (
                        <Field>
                            <FieldLabel htmlFor="name">Name</FieldLabel>
                            <Input
                                id="name"
                                placeholder="your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                            <div className="flex items-center gap-2">
                                <Button
                                    size={"icon"}
                                    variant="secondary"
                                    onClick={back}
                                >
                                    <ArrowLeft />
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={next}
                                    disabled={!name}
                                >
                                    Continue
                                </Button>
                            </div>
                        </Field>
                    )}

                    {step === "password" && (
                        <>
                            <Field>
                                <FieldLabel htmlFor="password">Password</FieldLabel>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    minLength={8}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="confirmPassword">
                                    Confirm password
                                </FieldLabel>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    minLength={8}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </Field>

                            {error && <p className="text-center text-sm text-destructive">{error}</p>}
                            {success && (
                                <p className="text-center text-sm text-emerald-400">{success}</p>
                            )}

                            <div className="flex items-center gap-2">
                                <Button
                                    size={"icon"}
                                    variant="secondary"
                                    onClick={back}
                                >
                                    <ArrowLeft />
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Creating account..." : "Create Account"}
                                </Button>
                            </div>
                        </>
                    )}

                    <FieldSeparator />

                    <Field className="grid gap-4 sm:grid-cols-2">
                        <Button
                            onClick={() => handleSocialSignIn("google")}
                            variant="secondary"
                            size={"icon-lg"}
                            type="button"
                        >
                            <FaGoogle />
                        </Button>
                        <Button
                            onClick={() => handleSocialSignIn("github")}
                            variant="secondary"
                            size={"icon-lg"}
                            type="button"
                        >
                            <FaGithub />
                        </Button>
                    </Field>
                </FieldGroup>
            </div>
            <Dialog
                open={isNameDialogOpen}
                onOpenChange={(open) => {
                    if (!open && isNewOAuthUser) {
                        return
                    }
                    setIsNameDialogOpen(open)
                    if (!open) {
                        setNameDialogError(null)
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enter your name</DialogTitle>
                        <DialogDescription>
                            We need your name to create your account.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium" htmlFor="social-name">
                            Name
                        </label>
                        <Input
                            id="social-name"
                            placeholder="your name"
                            value={name}
                            onChange={(e) => {
                                const nextName = e.target.value
                                setName(nextName)
                                if (nameDialogError && nextName.trim()) {
                                    setNameDialogError(null)
                                }
                            }}
                            required
                        />
                        {nameDialogError && (
                            <p className="text-sm text-destructive">
                                {nameDialogError}
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            onClick={handleNameDialogContinue}
                            disabled={isNameSubmitting}
                        >
                            {isNameSubmitting ? "Saving..." : "Continue"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
