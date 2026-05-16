import {
  LayoutDashboard,
  Target,
  FileText,
  Package,
  Users,
  Wallet,
  Settings2,
  type LucideIcon,
} from "lucide-react";

export interface AppDef {
  to: string;
  label: string;
  short: string;
  desc: string;
  icon: LucideIcon;
  /** tailwind class fragments for the icon chip */
  tile: string;
  dot: string;
}

export const APPS: AppDef[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    short: "Dashboard",
    desc: "Company-wide KPIs & financial snapshot",
    icon: LayoutDashboard,
    tile: "bg-primary-600",
    dot: "bg-primary-600",
  },
  {
    to: "/crm",
    label: "CRM",
    short: "CRM",
    desc: "Leads, pipeline, customers & activities",
    icon: Target,
    tile: "bg-accentpurple",
    dot: "bg-accentpurple",
  },
  {
    to: "/invoicing",
    label: "Invoicing",
    short: "Invoicing",
    desc: "Build, theme & download invoices as PDF",
    icon: FileText,
    tile: "bg-info",
    dot: "bg-info",
  },
  {
    to: "/erp",
    label: "Sales & Inventory",
    short: "Sales",
    desc: "Products, sales orders & VAT invoices",
    icon: Package,
    tile: "bg-warning",
    dot: "bg-warning",
  },
  {
    to: "/hr",
    label: "People",
    short: "People",
    desc: "Employees, attendance & payroll",
    icon: Users,
    tile: "bg-success",
    dot: "bg-success",
  },
  {
    to: "/finance",
    label: "Accounting",
    short: "Accounting",
    desc: "Accounts, expenses & financial reports",
    icon: Wallet,
    tile: "bg-primary-700",
    dot: "bg-primary-700",
  },
  {
    to: "/tools",
    label: "Settings",
    short: "Settings",
    desc: "Users, company settings & audit log",
    icon: Settings2,
    tile: "bg-brand-600",
    dot: "bg-brand-600",
  },
];
