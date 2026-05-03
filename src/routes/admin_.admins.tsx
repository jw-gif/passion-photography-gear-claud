import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin_/admins")({
  component: () => <Navigate to="/admin/team" replace />,
});
