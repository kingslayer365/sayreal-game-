import { createFileRoute } from "@tanstack/react-router";
import { SayrealApp } from "@/components/sayreal/SayrealApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <SayrealApp />;
}
