import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Search, 
  Plus, 
  Calendar, 
  Check,
  Clock,
  AlertCircle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Payment } from "@shared/schema";

export default function CoachPayments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [newPaymentDialog, setNewPaymentDialog] = useState(false);
  
  const { data: payments, isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments/coach"],
    enabled: !!user,
  });
  
  const { data: clientLinks, isLoading: clientsLoading } = useQuery<any[]>({
    queryKey: ["/api/links/coach"],
    enabled: !!user,
  });
  
  const isLoading = paymentsLoading || clientsLoading;

  // New payment form state
  const [newPayment, setNewPayment] = useState({
    clientId: "",
    amount: "",
    dueDate: "",
    sessionsCovered: "",
    notes: ""
  });
  
  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      await apiRequest("POST", "/api/payments", {
        coachId: user!.id,
        clientId: parseInt(paymentData.clientId),
        amount: parseFloat(paymentData.amount),
        dueDate: new Date(paymentData.dueDate),
        status: "pending",
        reminderSent: false,
        sessionsCovered: parseInt(paymentData.sessionsCovered),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/coach"] });
      toast({
        title: "תשלום נוצר בהצלחה",
        description: "בקשת התשלום נשלחה למתאמן.",
      });
      setNewPaymentDialog(false);
      setNewPayment({
        clientId: "",
        amount: "",
        dueDate: "",
        sessionsCovered: "",
        notes: ""
      });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה ביצירת תשלום",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const markAsPaidMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      await apiRequest("PUT", `/api/payments/${paymentId}`, {
        status: "paid"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/coach"] });
      toast({
        title: "תשלום עודכן בהצלחה",
        description: "התשלום סומן כשולם.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה בעדכון תשלום",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Filter payments based on search term and group by status
  const filterAndGroupPayments = () => {
    if (!payments) return { pending: [], paid: [], overdue: [] };
    
    const filteredPayments = payments.filter(payment => {
      const clientName = clientLinks?.find(link => link.client?.id === payment.clientId)?.client?.name?.toLowerCase() || "";
      const term = searchTerm.toLowerCase();
      return clientName.includes(term);
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
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewPayment(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCreatePayment = () => {
    if (!newPayment.clientId || !newPayment.amount || !newPayment.dueDate || !newPayment.sessionsCovered) {
      toast({
        title: "נתונים חסרים",
        description: "אנא מלא את כל השדות הנדרשים",
        variant: "destructive",
      });
      return;
    }
    
    createPaymentMutation.mutate(newPayment);
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="flex flex-1">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        
        <main className="flex-1 bg-gray-50 p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">ניהול תשלומים</h1>
            <Dialog open={newPaymentDialog} onOpenChange={setNewPaymentDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary-600">
                  <Plus className="w-4 h-4 ml-2" /> תשלום חדש
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>יצירת בקשת תשלום חדשה</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label htmlFor="clientId" className="text-sm font-medium">בחר מתאמן</label>
                    <Select 
                      name="clientId" 
                      value={newPayment.clientId} 
                      onValueChange={(value) => setNewPayment(prev => ({ ...prev, clientId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר מתאמן" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientLinks?.filter(link => link.status === "active").map((link) => (
                          <SelectItem key={link.client.id} value={link.client.id.toString()}>
                            {link.client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="amount" className="text-sm font-medium">סכום (₪)</label>
                    <Input 
                      id="amount" 
                      name="amount" 
                      type="number"
                      placeholder="הזן סכום בש״ח"
                      value={newPayment.amount}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="dueDate" className="text-sm font-medium">תאריך לתשלום</label>
                    <Input 
                      id="dueDate" 
                      name="dueDate" 
                      type="date" 
                      value={newPayment.dueDate}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="sessionsCovered" className="text-sm font-medium">מספר פגישות</label>
                    <Input 
                      id="sessionsCovered" 
                      name="sessionsCovered" 
                      type="number"
                      placeholder="מספר פגישות כלולות בתשלום"
                      value={newPayment.sessionsCovered}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="notes" className="text-sm font-medium">הערות (אופציונלי)</label>
                    <Textarea 
                      id="notes" 
                      name="notes" 
                      placeholder="הערות לתשלום"
                      value={newPayment.notes}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewPaymentDialog(false)}>ביטול</Button>
                  <Button onClick={handleCreatePayment} disabled={createPaymentMutation.isPending}>
                    {createPaymentMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    שליחת בקשת תשלום
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="mb-6 relative">
            <Search className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input 
              className="pl-10 pr-10" 
              placeholder="חיפוש תשלומים לפי שם מתאמן" 
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
                    <h3 className="text-gray-500 text-sm">ממתינים לתשלום</h3>
                    <p className="text-2xl font-bold">{pending.length}</p>
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
                    <p className="text-2xl font-bold">{paid.length}</p>
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
                    <p className="text-2xl font-bold">{overdue.length}</p>
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
                <TabsTrigger value="pending">ממתינים לתשלום ({pending.length})</TabsTrigger>
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
                        client={clientLinks?.find(link => link.client?.id === payment.clientId)?.client}
                        onMarkAsPaid={() => markAsPaidMutation.mutate(payment.id)}
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
                        client={clientLinks?.find(link => link.client?.id === payment.clientId)?.client}
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
                        client={clientLinks?.find(link => link.client?.id === payment.clientId)?.client}
                        onMarkAsPaid={() => markAsPaidMutation.mutate(payment.id)}
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
  client: any;
  onMarkAsPaid?: () => void;
}

function PaymentCard({ payment, client, onMarkAsPaid }: PaymentCardProps) {
  const daysUntilDue = getDaysUntilDue(payment.dueDate);
  const formatDueDate = new Date(payment.dueDate).toLocaleDateString('he-IL');
  const isPaid = payment.status === "paid";
  const isOverdue = payment.status === "overdue";
  
  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center mb-3 md:mb-0">
          <div className="ml-3">
            <h3 className="font-medium">{client?.name || "לקוח"}</h3>
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
            
            {!isPaid && onMarkAsPaid && (
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white text-sm"
                onClick={onMarkAsPaid}
              >
                סמן כשולם
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
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
