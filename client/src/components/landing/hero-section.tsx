import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { t } from "@/lib/i18n";

export function HeroSection() {
  return (
    <div className="bg-primary-600 text-white">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="w-full md:w-1/2 text-center md:text-right mb-8 md:mb-0">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {t("landing.welcome")}
            </h1>
            <p className="text-lg md:text-xl mb-8">
              {t("landing.subtitle")}
            </p>
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 md:space-x-reverse justify-center md:justify-end">
              <Link href="/auth">
                <Button className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition duration-300 text-lg">
                  {t("landing.login")}
                </Button>
              </Link>
              <Link href="/auth">
                <Button variant="outline" className="bg-white hover:bg-gray-100 text-primary-600 font-bold py-3 px-6 rounded-lg shadow-lg transition duration-300 text-lg">
                  {t("landing.signup")}
                </Button>
              </Link>
            </div>
          </div>
          <div className="w-full md:w-1/2">
            <img 
              src="https://images.unsplash.com/photo-1516321497487-e288fb19713f?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80" 
              alt="Coaching Session" 
              className="rounded-lg shadow-xl w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
