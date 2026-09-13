export async function revalidateLearnerPaths(paths: string[]): Promise<void> {
  const learnerUrl =
    process.env.LEARNER_APP_URL ||
    process.env.NEXT_PUBLIC_LEARNER_APP_URL ||
    "https://dailygerman.vercel.app";
  const secret = process.env.REVALIDATION_SECRET;

  if (!secret) {
    console.warn("REVALIDATION_SECRET is not set in Admin. Skipping instant revalidation webhook.");
    return;
  }

  try {
    const endpoint = `${learnerUrl.replace(/\/$/, "")}/api/revalidate`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret,
        paths,
      }),
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`Revalidation webhook returned HTTP ${res.status}: ${errText}`);
    } else {
      console.log(`Successfully triggered revalidation for: ${paths.join(", ")}`);
    }
  } catch (err: unknown) {
    // Non-blocking warning so admin save operations never fail
    console.warn("Failed to trigger revalidation on learner site:", (err as Error).message);
  }
}
