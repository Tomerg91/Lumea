import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { t } from "@/lib/i18n";
import { ChevronLeft } from "lucide-react";

export function CTASection() {
  return (
    <div className="bg-gradient-to-tr from-slate-900 via-primary-950 to-slate-900 text-white py-20 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-primary-400 opacity-20 blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-primary-300 opacity-20 blur-3xl"></div>
      
      <div className="container mx-auto px-4 text-center relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center mb-6">
            <span className="bg-white text-primary-600 font-bold text-xl p-1.5 rounded-lg mr-2">L</span>
            <span className="bg-gradient-to-r from-white to-primary-200 text-transparent bg-clip-text text-2xl font-bold">Lumea</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-white to-primary-200 text-transparent bg-clip-text">
            {t("landing.cta.title")}
          </h2>
          <p className="text-xl mb-10 text-gray-200">
            {t("landing.cta.subtitle")}
          </p>
          
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 md:space-x-reverse justify-center">
            <Link href="/auth">
              <Button className="bg-white hover:bg-primary-50 text-primary-800 font-bold py-3 px-8 rounded-lg shadow-lg transition duration-300 text-lg w-full md:w-auto">
                {t("landing.cta.signup")}
                <ChevronLeft className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/auth">
              <Button variant="outline" className="border-2 border-white hover:bg-white/10 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition duration-300 text-lg w-full md:w-auto">
                {t("landing.cta.login")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
