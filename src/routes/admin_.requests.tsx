import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin_/requests")({
  component: () => <Navigate to="/admin/requests-gear" replace />,
});
