import { Link, useLocation } from "wouter";
import { Home, Calendar, Book, Settings, Users, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { t } from "@/lib/i18n";

export function MobileNavbar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // Don't render on desktop or if user is not logged in
  if (!isMobile || !user) {
    return null;
  }

  const isActive = (path: string) => {
    return location.startsWith(path);
  };

  // Different navigation options based on user role
  if (user.role === "coach") {
    return (
      <nav className="mobile-nav">
        <NavItem 
          to="/coach/dashboard" 
          label={t("dashboard")} 
          icon={<Home size={20} />} 
          active={isActive("/coach/dashboard")} 
        />
        <NavItem 
          to="/coach/clients" 
          label={t("clients")} 
          icon={<Users size={20} />} 
          active={isActive("/coach/clients")} 
        />
        <NavItem 
          to="/coach/sessions" 
          label={t("sessions")} 
          icon={<Calendar size={20} />} 
          active={isActive("/coach/sessions")} 
        />
        <NavItem 
          to="/coach/resources" 
          label={t("resources")} 
          icon={<Book size={20} />} 
          active={isActive("/coach/resources")} 
        />
        <NavItem 
          to="/coach/payments" 
          label={t("payments")} 
          icon={<CreditCard size={20} />} 
          active={isActive("/coach/payments")} 
        />
      </nav>
    );
  } else {
    // Client navigation
    return (
      <nav className="mobile-nav">
        <NavItem 
          to="/client/dashboard" 
          label={t("dashboard")} 
          icon={<Home size={20} />} 
          active={isActive("/client/dashboard")} 
        />
        <NavItem 
          to="/client/sessions" 
          label={t("sessions")} 
          icon={<Calendar size={20} />} 
          active={isActive("/client/sessions")} 
        />
        <NavItem 
          to="/client/reflections" 
          label={t("reflections")} 
          icon={<Book size={20} />} 
          active={isActive("/client/reflections")} 
        />
        <NavItem 
          to="/client/resources" 
          label={t("resources")} 
          icon={<Book size={20} />} 
          active={isActive("/client/resources")} 
        />
        <NavItem 
          to="/settings" 
          label={t("settings")} 
          icon={<Settings size={20} />} 
          active={isActive("/settings")} 
        />
      </nav>
    );
  }
}

interface NavItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}

function NavItem({ to, label, icon, active }: NavItemProps) {
  return (
    <Link href={to}>
      <a className={`mobile-nav-item ${active ? "active" : ""}`}>
        <span className="mobile-nav-icon">{icon}</span>
        <span>{label}</span>
      </a>
    </Link>
  );
}