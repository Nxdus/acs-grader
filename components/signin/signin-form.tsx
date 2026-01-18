"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { FaGithub, FaGoogle } from "react-icons/fa"

import { Button } from "@/components/ui/button"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
    signIn,
    signInWithGithub,
    signInWithGoogle,
    updateUser,
} from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export function SigninForm({
    className,
    ...props
}: React.ComponentProps<"form">) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [name, setName] = useState("")
    const [isNameDialogOpen, setIsNameDialogOpen] = useState(false)
    const [nameDialogError, setNameDialogError] = useState<string | null>(null)
    const [isNameSubmitting, setIsNameSubmitting] = useState(false)

    const isNewOAuthUser = searchParams.get("new-user") === "1"
    const redirectUrl = "/"

    useEffect(() => {
        if (isNewOAuthUser) {
            setIsNameDialogOpen(true)
        }
    }, [isNewOAuthUser])

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError(null)
        setSuccess(null)
        setIsSubmitting(true)

        const res = await signIn.email({
            email,
            password,
        })

        setIsSubmitting(false)

        if (res.error) {
            setError(res.error.message || "Something went wrong.")
            return
        }

        setSuccess("Signed in! Redirecting...")
        router.push(redirectUrl)
    }

    const handleSocialSignIn = async (provider: "google" | "github") => {
        setError(null)
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

    return (
        <form
            className={cn(
                "flex items-center justify-center",
                className
            )}
            onSubmit={handleSubmit}
            {...props}
        >
            <div className="min-w-sm max-w-md">
                <FieldGroup>
                    <div className="flex flex-col items-center gap-2 text-center">
                        <Image draggable={false} src={"/images/acs.svg"} alt="@ACS" width={128} height={128} className="w-32 dark:invert" />
                        <h1 className="text-xl font-bold text-primary">
                            Welcome back
                        </h1>
                        <FieldDescription>
                            Do not have an account?{" "}
                            <Link href="/sign-up" className="underline">
                                Sign up
                            </Link>
                        </FieldDescription>
                    </div>

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
                    </Field>

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


                    {error && <p className="text-center text-sm text-destructive">{error}</p>}
                    {success && (
                        <p className="text-center text-sm text-emerald-400">{success}</p>
                    )}

                    <Button className="w-full" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Signing in..." : "Sign In"}
                    </Button>

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
                            We need your name to finish creating your account.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium" htmlFor="oauth-name">
                            Name
                        </label>
                        <Input
                            id="oauth-name"
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
        </form>
    )
}
