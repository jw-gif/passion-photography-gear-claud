import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin_/history")({
  component: () => <Navigate to="/admin/gear-history" replace />,
});
