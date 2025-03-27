import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { t } from "@/lib/i18n";

export function CTASection() {
  return (
    <div className="bg-primary-600 text-white py-16">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold mb-6">
          {t("landing.cta.title")}
        </h2>
        <p className="text-xl mb-8">
          {t("landing.cta.subtitle")}
        </p>
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 md:space-x-reverse justify-center">
          <Link href="/auth">
            <Button className="bg-white hover:bg-gray-100 text-primary-600 font-bold py-3 px-8 rounded-lg shadow-lg transition duration-300 text-lg">
              {t("landing.cta.signup")}
            </Button>
          </Link>
          <Link href="/auth">
            <Button variant="outline" className="bg-transparent hover:bg-primary-700 text-white border-2 border-white font-bold py-3 px-8 rounded-lg shadow-lg transition duration-300 text-lg">
              {t("landing.cta.login")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
