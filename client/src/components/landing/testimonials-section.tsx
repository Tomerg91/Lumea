import { t } from "@/lib/i18n";
import { QuoteIcon } from "lucide-react";

export function TestimonialsSection() {
  const testimonials = [
    {
      name: "מיכל כהן",
      title: "מנהלת משאבי אנוש",
      image: "https://randomuser.me/api/portraits/women/48.jpg",
      quote: "אימון אישי ב-Lumea עזר לי להתמודד עם אתגרים ניהוליים ולשפר את האיזון בין העבודה לחיים האישיים. המאמן שלי היה תמיד זמין ותומך.",
    },
    {
      name: "דניאל לוי",
      title: "יזם",
      image: "https://randomuser.me/api/portraits/men/32.jpg",
      quote: "האימון דרך פלטפורמת Lumea עזר לי לגבש חזון ברור לעסק שלי ולהתמקד במה שחשוב באמת. הכלים שקיבלתי משמשים אותי יום יום.",
    },
    {
      name: "יעל אברהם",
      title: "מנהלת פרויקטים",
      image: "https://randomuser.me/api/portraits/women/67.jpg",
      quote: "המשוב ותהליכי הרפלקציה שפיתחנו יחד עם המאמן שלי ב-Lumea שינו את הדרך שבה אני מתקדמת בקריירה. עכשיו יש לי כלים מעשיים להצלחה.",
    },
  ];

  return (
    <div className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t("landing.testimonials.title")}
          </h2>
          <div className="w-24 h-1 bg-primary-500 mx-auto rounded-full"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-100"
            >
              <div className="p-6">
                <div className="flex justify-end mb-4">
                  <QuoteIcon className="h-8 w-8 text-primary-200" />
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed">{testimonial.quote}</p>
                <div className="flex items-center pt-4 border-t border-gray-100">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full ml-4 object-cover border-2 border-primary-100"
                  />
                  <div>
                    <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                    <p className="text-primary-600 text-sm font-medium">{testimonial.title}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
