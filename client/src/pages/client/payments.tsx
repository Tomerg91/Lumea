import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Calendar, CreditCard, Check, AlertCircle, Clock, ChevronDown } from "lucide-react";
import { t } from "@/lib/i18n";
import { Payment } from "@shared/schema";

export default function ClientPayments() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: payments, isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments/client"],
    enabled: !!user,
  });
  
  const { data: userLinks, isLoading: linksLoading } = useQuery<any[]>({
    queryKey: ["/api/links/client"],
    enabled: !!user,
  });
  
  const isLoading = paymentsLoading || linksLoading;
  
  // Filter payments based on search term and group by status
  const filterAndGroupPayments = () => {
    if (!payments) return { pending: [], paid: [], overdue: [] };
    
    const filteredPayments = payments.filter(payment => {
      const coachName = payment.coach?.name?.toLowerCase() || "";
      const term = searchTerm.toLowerCase();
      return coachName.includes(term);
    });
    
    return {
      pending: filteredPayments.filter(payment => payment.status === "pending")
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
      
      paid: filteredPayments.filter(payment => payment.status === "paid")
        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()),
      
      overdue: filteredPayments.filter(payment => payment.status === "overdue")
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    };
  };
  
  const { pending, paid, overdue } = filterAndGroupPayments();
  
  // Calculate total amounts
  const calculateTotalAmount = (paymentList: Payment[]) => {
    return paymentList.reduce((sum, payment) => sum + payment.amount, 0);
  };
  
  // Calculate total sessions covered
  const calculateTotalSessions = (paymentList: Payment[]) => {
    return paymentList.reduce((sum, payment) => sum + payment.sessionsCovered, 0);
  };
  
  // Format date for display
  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
  };
  
  // Calculate days until due date
  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const differenceMs = due.getTime() - today.getTime();
    const differenceDays = Math.ceil(differenceMs / (1000 * 60 * 60 * 24));
    
    return differenceDays;
  };
  
  // Get coach name
  const getCoachName = (coachId: number) => {
    const link = userLinks?.find(link => link.coach?.id === coachId);
    return link?.coach?.name || "מאמן";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="flex flex-1">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        
        <main className="flex-1 bg-gray-50 p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">התשלומים שלי</h1>
          </div>
          
          <div className="mb-6 relative">
            <Search className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input 
              className="pl-10 pr-10" 
              placeholder="חיפוש תשלומים לפי שם מאמן" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="bg-yellow-100 p-3 rounded-full">
                    <Clock className="text-yellow-600 text-xl" />
                  </div>
                  <div className="mr-4">
                    <h3 className="text-gray-500 text-sm">לתשלום</h3>
                    <p className="text-2xl font-bold">₪{calculateTotalAmount(pending)}</p>
                    <p className="text-sm text-gray-500">{calculateTotalSessions(pending)} פגישות</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="bg-green-100 p-3 rounded-full">
                    <Check className="text-green-600 text-xl" />
                  </div>
                  <div className="mr-4">
                    <h3 className="text-gray-500 text-sm">שולמו</h3>
                    <p className="text-2xl font-bold">₪{calculateTotalAmount(paid)}</p>
                    <p className="text-sm text-gray-500">{calculateTotalSessions(paid)} פגישות</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="bg-red-100 p-3 rounded-full">
                    <AlertCircle className="text-red-600 text-xl" />
                  </div>
                  <div className="mr-4">
                    <h3 className="text-gray-500 text-sm">באיחור</h3>
                    <p className="text-2xl font-bold">₪{calculateTotalAmount(overdue)}</p>
                    <p className="text-sm text-gray-500">{calculateTotalSessions(overdue)} פגישות</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="pending">
              <TabsList className="mb-6">
                <TabsTrigger value="pending">לתשלום ({pending.length})</TabsTrigger>
                <TabsTrigger value="paid">שולמו ({paid.length})</TabsTrigger>
                <TabsTrigger value="overdue">באיחור ({overdue.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="pending">
                {pending.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    אין תשלומים ממתינים
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pending.map((payment) => (
                      <PaymentCard 
                        key={payment.id} 
                        payment={payment} 
                        coachName={payment.coach?.name || getCoachName(payment.coachId)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="paid">
                {paid.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    אין תשלומים ששולמו
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paid.map((payment) => (
                      <PaymentCard 
                        key={payment.id} 
                        payment={payment} 
                        coachName={payment.coach?.name || getCoachName(payment.coachId)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="overdue">
                {overdue.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    אין תשלומים באיחור
                  </div>
                ) : (
                  <div className="space-y-4">
                    {overdue.map((payment) => (
                      <PaymentCard 
                        key={payment.id} 
                        payment={payment} 
                        coachName={payment.coach?.name || getCoachName(payment.coachId)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>
    </div>
  );
}

interface PaymentCardProps {
  payment: Payment;
  coachName: string;
}

function PaymentCard({ payment, coachName }: PaymentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const daysUntilDue = getDaysUntilDue(payment.dueDate);
  const formatDueDate = new Date(payment.dueDate).toLocaleDateString('he-IL');
  const isPaid = payment.status === "paid";
  const isOverdue = payment.status === "overdue";
  
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center mb-3 md:mb-0">
            <div className={`${
              isPaid 
                ? "bg-green-100 text-green-800" 
                : isOverdue
                  ? "bg-red-100 text-red-800"
                  : "bg-yellow-100 text-yellow-800"
            } p-2 rounded-full h-12 w-12 flex items-center justify-center ml-3`}>
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium">תשלום למאמן {coachName}</h3>
              <div className="text-gray-500 text-sm flex items-center">
                <Calendar className="w-4 h-4 ml-1" />
                {isPaid ? (
                  <span>שולם בתאריך: {formatDueDate}</span>
                ) : (
                  <span>לתשלום עד: {formatDueDate}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <div className="text-lg font-medium">₪{payment.amount}</div>
            <div className="text-sm text-gray-500 mb-2">{payment.sessionsCovered} פגישות</div>
            
            <div className="flex items-center">
              <Badge 
                className={`mr-2 ${
                  isPaid 
                    ? "bg-green-100 text-green-800 hover:bg-green-100" 
                    : isOverdue
                      ? "bg-red-100 text-red-800 hover:bg-red-100"
                      : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                }`}
              >
                {isPaid ? "שולם" : isOverdue ? "באיחור" : `בעוד ${daysUntilDue} ימים`}
              </Badge>
              
              {!isPaid && (
                <Button className="bg-primary-600 hover:bg-primary-700 text-white text-sm">
                  לתשלום
                </Button>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex justify-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-500" 
            onClick={toggleExpanded}
          >
            {expanded ? "הסתר פרטים" : "הצג פרטים נוספים"}
            <ChevronDown className={`ml-2 w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </Button>
        </div>
        
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">מזהה תשלום</p>
                <p className="font-medium">{payment.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">תאריך יצירה</p>
                <p className="font-medium">{new Date(payment.createdAt).toLocaleDateString('he-IL')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">סטטוס</p>
                <p className="font-medium">
                  {isPaid ? "שולם" : isOverdue ? "באיחור" : "ממתין לתשלום"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">מספר פגישות</p>
                <p className="font-medium">{payment.sessionsCovered}</p>
              </div>
            </div>
            
            {!isPaid && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-end">
                  <Button className="bg-green-600 hover:bg-green-700 text-white mr-2">שלם עכשיו</Button>
                  <Button variant="outline">פנה למאמן</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getDaysUntilDue(dueDate: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const differenceMs = due.getTime() - today.getTime();
  const differenceDays = Math.ceil(differenceMs / (1000 * 60 * 60 * 24));
  
  return differenceDays;
}
