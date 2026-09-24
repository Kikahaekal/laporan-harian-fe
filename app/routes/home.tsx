import type { Route } from "./+types/home";
import Dashboard from "~/pages/dashboard/Dashboard";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "POS Pinang Maju Sejahtera" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return <Dashboard />;
}
