import { t } from "@/lib/i18n";

export function FeaturesSection() {
  const features = [
    {
      icon: "fas fa-users",
      title: t("landing.features.personal.title"),
      description: t("landing.features.personal.description"),
    },
    {
      icon: "fas fa-book-open",
      title: t("landing.features.resources.title"),
      description: t("landing.features.resources.description"),
    },
    {
      icon: "fas fa-chart-line",
      title: t("landing.features.progress.title"),
      description: t("landing.features.progress.description"),
    },
  ];

  return (
    <div className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          {t("landing.features.title")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-gray-50 p-6 rounded-lg shadow-md text-center">
              <div className="text-primary-500 text-4xl mb-4">
                <i className={feature.icon}></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
