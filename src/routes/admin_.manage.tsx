import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin_/manage")({
  component: () => <Navigate to="/admin/gear-manage" replace />,
});
