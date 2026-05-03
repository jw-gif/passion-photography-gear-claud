import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin_/photo-requests")({
  component: () => <Navigate to="/admin/requests-photography" replace />,
});
