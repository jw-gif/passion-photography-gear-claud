import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/request")({
  component: () => <Navigate to="/request-gear" replace />,
});
