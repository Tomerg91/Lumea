import { t } from "@/lib/i18n";

export function TestimonialsSection() {
  const testimonials = [
    {
      name: "מיכל כהן",
      title: "מנהלת משאבי אנוש",
      image: "https://randomuser.me/api/portraits/women/48.jpg",
      quote: "\"שיטת סאטיה עזרה לי להתמודד עם אתגרים ניהוליים ולשפר את האיזון בין העבודה לחיים האישיים. המאמן שלי היה תמיד זמין ותומך.\"",
    },
    {
      name: "דניאל לוי",
      title: "יזם",
      image: "https://randomuser.me/api/portraits/men/32.jpg",
      quote: "\"האימון דרך פלטפורמת סאטיה עזר לי לגבש חזון ברור לעסק שלי ולהתמקד במה שחשוב באמת. הכלים שקיבלתי משמשים אותי יום יום.\"",
    },
  ];

  return (
    <div className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          {t("landing.testimonials.title")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full ml-4"
                />
                <div>
                  <h4 className="font-semibold">{testimonial.name}</h4>
                  <p className="text-gray-600 text-sm">{testimonial.title}</p>
                </div>
              </div>
              <p className="text-gray-700">{testimonial.quote}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
