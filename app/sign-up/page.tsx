"use client";

import { SignupForm } from "@/components/signup/signup-form";
import { Suspense } from "react";

export default function SignUpPage() {
    return (
        <Suspense>
            <main className="min-h-screen bg-linear-to-br from-neutral-950 via-neutral-900 to-neutral-950 px-4 py-12 flex items-center justify-center">
                <SignupForm />
            </main>
        </Suspense>
    );
}
