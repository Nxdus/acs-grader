import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import type { auth } from '@/lib/auth'


export const { signIn, signUp, signOut, useSession, updateUser } = createAuthClient({
    plugins: [inferAdditionalFields<typeof auth>()],
})

type SocialSignInOptions = {
    callbackURL?: string
    newUserCallbackURL?: string
}

export const signInWithGoogle = async (options?: SocialSignInOptions) => {
    await signIn.social({
        provider: "google",
        ...options,
    })
}

export const signInWithGithub = async (options?: SocialSignInOptions) => {
    await signIn.social({
        provider: "github",
        ...options,
    })
}
