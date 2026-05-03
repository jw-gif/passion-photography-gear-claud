import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin_/photographers")({
  component: () => <Navigate to="/admin/team" search={{ tab: "photographers" }} replace />,
});
