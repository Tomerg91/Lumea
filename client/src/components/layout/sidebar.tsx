import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  CreditCard, 
  Settings,
  LogOut,
  BookOpen,
  PenTool
} from "lucide-react";
import { t } from "@/lib/i18n";

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  
  if (!user) return null;
  
  const isCoach = user.role === 'coach';
  const baseUrl = `/${user.role}`;
  
  const handleLogout = () => {
    logoutMutation.mutate();
    if (onClose) onClose();
  };
  
  const navItems = isCoach 
    ? [
        { href: `${baseUrl}/dashboard`, label: t("coach.sidebar.dashboard"), icon: <LayoutDashboard className="w-6" /> },
        { href: `${baseUrl}/clients`, label: t("coach.sidebar.clients"), icon: <Users className="w-6" /> },
        { href: `${baseUrl}/sessions`, label: t("coach.sidebar.sessions"), icon: <Calendar className="w-6" /> },
        { href: `${baseUrl}/resources`, label: t("coach.sidebar.resources"), icon: <FileText className="w-6" /> },
        { href: `${baseUrl}/payments`, label: t("coach.sidebar.payments"), icon: <CreditCard className="w-6" /> },
      ]
    : [
        { href: `${baseUrl}/dashboard`, label: t("client.sidebar.dashboard"), icon: <LayoutDashboard className="w-6" /> },
        { href: `${baseUrl}/sessions`, label: t("client.sidebar.sessions"), icon: <Calendar className="w-6" /> },
        { href: `${baseUrl}/reflections`, label: t("client.sidebar.reflections"), icon: <PenTool className="w-6" /> },
        { href: `${baseUrl}/resources`, label: t("client.sidebar.resources"), icon: <BookOpen className="w-6" /> },
        { href: `${baseUrl}/payments`, label: t("client.sidebar.payments"), icon: <CreditCard className="w-6" /> },
      ];

  return (
    <aside className="w-64 bg-gray-800 text-white h-full flex flex-col">
      <nav className="p-4 flex-1">
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={user.profilePicture || ""} alt={user.name} />
              <AvatarFallback className="text-lg">{user.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
          </div>
          <div className="text-center">
            <h3 className="font-bold text-lg">{user.name}</h3>
            <p className="text-gray-400 text-sm">{isCoach ? 'מאמן/ת' : 'מתאמן/ת'}</p>
          </div>
        </div>
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>
                <a 
                  className={`flex items-center p-3 rounded-lg ${
                    location === item.href
                      ? "bg-primary-600 text-white"
                      : "hover:bg-gray-700 text-gray-300 hover:text-white transition-colors duration-200"
                  }`}
                  onClick={onClose}
                >
                  {item.icon}
                  <span className="mr-3">{item.label}</span>
                </a>
              </Link>
            </li>
          ))}
          <li>
            <Link href={`${baseUrl}/settings`}>
              <a 
                className={`flex items-center p-3 rounded-lg ${
                  location === `${baseUrl}/settings`
                    ? "bg-primary-600 text-white"
                    : "hover:bg-gray-700 text-gray-300 hover:text-white transition-colors duration-200"
                }`}
                onClick={onClose}
              >
                <Settings className="w-6" />
                <span className="mr-3">{t("dashboard.settings")}</span>
              </a>
            </Link>
          </li>
        </ul>
      </nav>
      <div className="p-4">
        <button 
          className="flex items-center text-gray-400 hover:text-white transition-colors duration-200"
          onClick={handleLogout}
        >
          <LogOut className="w-6" />
          <span className="mr-3">{t("dashboard.logout")}</span>
        </button>
      </div>
    </aside>
  );
}
