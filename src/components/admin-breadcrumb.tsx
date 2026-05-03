import { Link } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbEntry {
  label: string;
  to?: string;
}

interface AdminBreadcrumbProps {
  items: BreadcrumbEntry[];
}

export function AdminBreadcrumb({ items }: AdminBreadcrumbProps) {
  return (
    <div className="border-b border-border bg-muted/30 px-4 sm:px-6 py-2">
      <div className="max-w-7xl mx-auto">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/admin">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {items.map((item, i) => (
              <span key={item.label} className="contents">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {item.to && i < items.length - 1 ? (
                    <BreadcrumbLink asChild>
                      <Link to={item.to as never}>{item.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}
