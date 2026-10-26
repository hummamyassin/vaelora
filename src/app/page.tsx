import { DashboardApp } from "../components/dashboard-app";
import { configuredModel } from "../server/ai/provider";

export default function Home() {
  // Read at build time: changing provider or activation variables needs a redeploy anyway.
  // On Vercel, public AI also needs the firewall rule; without it the agent refuses at runtime.
  const aiLive =
    configuredModel() !== null && (process.env.VERCEL !== "1" || process.env.VAELORA_AI_PUBLIC_ENABLED === "true");
  return <DashboardApp aiLive={aiLive} />;
}
