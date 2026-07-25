"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Grainient from "@/components/react-bits/Grainient";
import ShinyText from "@/components/react-bits/ShinyText";
import { useSession } from "@/lib/auth-client";
import { useEffect, useState } from "react";

export default function Page() {
  const { data: session, isPending } = useSession();
  const [letsGoEnabled, setLetsGoEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/lets-go", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to check access");
        }

        const payload = (await response.json()) as { enabled?: boolean };
        setLetsGoEnabled(payload.enabled === true);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setLetsGoEnabled(false);
        }
      });

    return () => controller.abort();
  }, []);

  const isCheckingAccess = isPending || letsGoEnabled === null;
  const isDisabled = isCheckingAccess || !letsGoEnabled;

  return (
    <main className="relative flex min-h-svh w-full items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <Grainient
          color1="#737373"
          color2="#262626"
          color3="#404040"
          timeSpeed={0.25}
          colorBalance={0}
          warpStrength={1}
          warpFrequency={5}
          warpSpeed={2}
          warpAmplitude={50}
          blendAngle={0}
          blendSoftness={0.05}
          rotationAmount={500}
          noiseScale={2}
          grainAmount={0.1}
          grainScale={2}
          grainAnimated={false}
          contrast={1.5}
          gamma={1}
          saturation={1}
          centerX={0}
          centerY={0}
          zoom={0.9}
        />
      </div>

      <section className="absolute z-10 flex w-full max-w-3xl flex-col items-center gap-8 text-center">
        <ShinyText
          text="ACS GRADER"
          className="font-mono text-6xl font-extrabold sm:text-8xl"
          speed={2}
          delay={0}
          color="#b5b5b5"
          shineColor="#ffffff"
          spread={120}
          direction="left"
          yoyo={false}
          pauseOnHover={false}
          disabled={false}
        />

        <div className="flex flex-col items-center gap-2">
          {isDisabled ? (
            <Button
              size="lg"
              className="h-11 px-5 text-sm"
              disabled
              aria-label={isCheckingAccess ? "Checking access" : "Let's Go is disabled"}
            >
              Let&apos;s go
              <ArrowRight />
            </Button>
          ) : (
            <Button
              size="lg"
              className="h-11 px-5 text-sm"
              asChild
            >
              <Link href={session?.user ? "/problems" : "/sign-in"}>
                Let&apos;s go
                <ArrowRight />
              </Link>
            </Button>
          )}
          {letsGoEnabled === false ? (
            <p className="text-xs text-white/70">
              Access is currently disabled.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  )
}
