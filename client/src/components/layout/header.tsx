import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Bell,
  ChevronDown,
  Menu,
  X
} from "lucide-react";
import { Sidebar } from "./sidebar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { t } from "@/lib/i18n";

export function Header() {
  const { user, logoutMutation } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  if (!user) return null;
  
  const isCoach = user.role === 'coach';
  const baseUrl = `/${user.role}`;
  
  const toggleMobileNav = () => {
    setMobileNavOpen(!mobileNavOpen);
  };
  
  const closeMobileNav = () => {
    setMobileNavOpen(false);
  };

  return (
    <>
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <button 
              type="button" 
              className="lg:hidden text-gray-600 ml-3"
              onClick={toggleMobileNav}
            >
              <Menu className="text-xl" />
            </button>
            <Link href={baseUrl + "/dashboard"}>
              <a className="text-primary-600 font-bold text-xl">שיטת סאטיה</a>
            </Link>
          </div>
          <div className="flex items-center">
            <div className="ml-4 relative">
              <DropdownMenu>
                <DropdownMenuTrigger className="text-gray-600 hover:text-gray-800 focus:outline-none">
                  <div className="relative">
                    <Bell className="text-xl" />
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {isCoach ? 2 : 1}
                    </span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isCoach ? (
                    <>
                      <DropdownMenuItem>
                        <span className="text-sm">מיכל דוד הגישה רפלקציה חדשה</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <span className="text-sm">תשלום חדש התקבל מאבי כהן</span>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem>
                      <span className="text-sm">תזכורת: פגישה היום בשעה 10:00</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center focus:outline-none">
                <Avatar className="w-8 h-8 ml-2">
                  <AvatarImage src={user.profilePicture || ""} alt={user.name} />
                  <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <span className="text-gray-800 font-medium hidden md:block">{user.name}</span>
                <ChevronDown className="text-gray-500 ml-2 text-xs" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Link href={`${baseUrl}/settings`}>
                    <a className="w-full">{t("dashboard.settings")}</a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                  {t("dashboard.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div 
        className={`lg:hidden fixed inset-0 z-40 bg-gray-800 bg-opacity-80 transform transition-transform duration-300 ${
          mobileNavOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="absolute inset-y-0 right-0 w-64 bg-gray-800 shadow-xl transform transition-transform duration-300 translate-x-0">
          <div className="flex justify-start p-4">
            <button className="text-white" onClick={closeMobileNav}>
              <X className="text-xl" />
            </button>
          </div>
          <Sidebar onClose={closeMobileNav} />
        </div>
      </div>
    </>
  );
}
