import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { t } from "@/lib/i18n";

export function HeroSection() {
  return (
    <div className="bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-20 md:py-28 relative overflow-hidden">
        {/* Background decoration elements */}
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-primary-300 opacity-20 blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-primary-200 opacity-20 blur-3xl"></div>

        <div className="flex flex-col md:flex-row items-center justify-between relative z-10">
          <div className="w-full md:w-1/2 text-center md:text-right mb-12 md:mb-0">
            <div className="mb-6 inline-flex items-center">
              <span className="bg-white text-primary-600 font-bold text-2xl p-2 rounded-lg mr-2">L</span>
              <span className="bg-gradient-to-r from-white to-primary-200 text-transparent bg-clip-text text-3xl font-bold">Lumea</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight bg-gradient-to-r from-white to-primary-200 text-transparent bg-clip-text">
              אימון אישי
              <br />
              <span className="text-white">שעובד למענך</span>
            </h1>
            <p className="text-lg md:text-xl mb-8 text-gray-200 max-w-lg mx-auto md:mr-0 md:ml-auto">
              פלטפורמה חדשנית לאימון אישי שתסייע לך לגלות את הפוטנציאל האמיתי שלך ולהגיע להישגים המשמעותיים בחייך
            </p>
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 md:space-x-reverse justify-center md:justify-end">
              <Link href="/auth">
                <Button className="bg-white text-primary-800 hover:bg-primary-50 font-bold py-3 px-8 rounded-lg shadow-lg transition duration-300 text-lg">
                  {t("landing.login")}
                </Button>
              </Link>
              <Link href="/auth">
                <Button variant="outline" className="border-2 border-white hover:bg-white/10 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition duration-300 text-lg">
                  {t("landing.signup")}
                </Button>
              </Link>
            </div>
          </div>
          <div className="w-full md:w-1/2 md:pl-12">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary-600/30 to-transparent rounded-xl"></div>
              <img 
                src="https://images.unsplash.com/photo-1516321497487-e288fb19713f?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80" 
                alt="Coaching Session" 
                className="rounded-xl shadow-2xl w-full relative z-10"
              />
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full opacity-70 blur-xl"></div>
              <div className="absolute -top-4 -left-4 w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full opacity-70 blur-xl"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
