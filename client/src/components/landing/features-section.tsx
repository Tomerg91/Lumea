import { t } from "@/lib/i18n";
import { Users, BookOpen, BarChart3, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function FeaturesSection() {
  const features = [
    {
      icon: Users,
      title: t("landing.features.personal.title"),
      description: t("landing.features.personal.description"),
      color: "from-blue-500 to-primary-600",
      iconBg: "bg-blue-50",
    },
    {
      icon: BookOpen,
      title: t("landing.features.resources.title"),
      description: t("landing.features.resources.description"),
      color: "from-amber-500 to-orange-500",
      iconBg: "bg-amber-50",
    },
    {
      icon: BarChart3,
      title: t("landing.features.progress.title"),
      description: t("landing.features.progress.description"),
      color: "from-emerald-500 to-green-600",
      iconBg: "bg-emerald-50",
    },
  ];

  return (
    <div className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t("landing.features.title")}
          </h2>
          <div className="w-24 h-1 bg-primary-500 mx-auto rounded-full"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-100"
            >
              <div className="p-8">
                <div className={cn("w-14 h-14 flex items-center justify-center rounded-lg mb-6", feature.iconBg)}>
                  <feature.icon className={`w-8 h-8 bg-gradient-to-r ${feature.color} text-transparent bg-clip-text`} />
                </div>
                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                <p className="text-gray-600 mb-6">{feature.description}</p>
                <div className={`flex items-center text-sm font-bold bg-gradient-to-r ${feature.color} text-transparent bg-clip-text`}>
                  קרא עוד <ArrowRight className="mr-2 h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
