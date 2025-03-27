import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, UserPlus, Mail, Phone } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function CoachClients() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  
  const { data: clientLinks, isLoading } = useQuery<any[]>({
    queryKey: ["/api/links/coach"],
    enabled: !!user,
  });
  
  const linkClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      await apiRequest("POST", "/api/links", {
        coachId: user!.id,
        clientId,
        status: "active"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/links/coach"] });
      toast({
        title: "לקוח חדש נוסף בהצלחה",
        description: "הלקוח מקושר כעת לפרופיל שלך.",
      });
      setLinkDialogOpen(false);
      setNewClientEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה בהוספת לקוח",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Filter clients based on search term
  const filteredClients = clientLinks?.filter(link => {
    const clientName = link.client?.name?.toLowerCase() || "";
    const clientEmail = link.client?.email?.toLowerCase() || "";
    const term = searchTerm.toLowerCase();
    return clientName.includes(term) || clientEmail.includes(term);
  });
  
  // Group clients by status
  const activeClients = filteredClients?.filter(link => link.status === "active") || [];
  const pendingClients = filteredClients?.filter(link => link.status === "pending") || [];
  const inactiveClients = filteredClients?.filter(link => link.status === "inactive") || [];
  
  const handleAddClient = () => {
    // For demo, we'll simulate finding a client with ID 3
    // In a real app, you would search for the client by email
    linkClientMutation.mutate(3);
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
            <h1 className="text-2xl font-bold text-gray-800">המתאמנים שלי</h1>
            <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary-600">
                  <UserPlus className="w-4 h-4 ml-2" /> הוספת מתאמן חדש
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>הוספת מתאמן חדש</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">דוא"ל המתאמן</label>
                    <Input 
                      placeholder="הזן את הדואל של המתאמן" 
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                    />
                    <p className="text-sm text-gray-500">
                      אנחנו נשלח למתאמן הזמנה להצטרף לפלטפורמה אם טרם נרשם.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>ביטול</Button>
                  <Button onClick={handleAddClient} disabled={linkClientMutation.isPending}>
                    {linkClientMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    הוספה
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="mb-6 relative">
            <Search className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input 
              className="pl-10 pr-10" 
              placeholder="חיפוש מתאמנים לפי שם ודואר"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="active">
              <TabsList className="mb-6">
                <TabsTrigger value="active">פעילים ({activeClients.length})</TabsTrigger>
                <TabsTrigger value="pending">ממתינים ({pendingClients.length})</TabsTrigger>
                <TabsTrigger value="inactive">לא פעילים ({inactiveClients.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="active">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeClients.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                      אין מתאמנים פעילים כרגע
                    </div>
                  ) : (
                    activeClients.map((link) => (
                      <ClientCard key={link.id} client={link.client} />
                    ))
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="pending">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingClients.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                      אין מתאמנים ממתינים כרגע
                    </div>
                  ) : (
                    pendingClients.map((link) => (
                      <ClientCard key={link.id} client={link.client} />
                    ))
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="inactive">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {inactiveClients.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                      אין מתאמנים לא פעילים כרגע
                    </div>
                  ) : (
                    inactiveClients.map((link) => (
                      <ClientCard key={link.id} client={link.client} />
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>
    </div>
  );
}

interface ClientCardProps {
  client: {
    id: number;
    name: string;
    email: string;
    profilePicture?: string;
  };
}

function ClientCard({ client }: ClientCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center">
          <Avatar className="w-20 h-20 mb-4">
            <AvatarImage src={client.profilePicture || ""} alt={client.name} />
            <AvatarFallback className="text-lg">{client.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <h3 className="font-bold text-lg text-center">{client.name}</h3>
          <p className="text-gray-500 text-sm mb-4">{client.email}</p>
          <div className="flex space-x-2 space-x-reverse mt-2">
            <Button variant="outline" size="sm">
              <Mail className="w-4 h-4 ml-1" /> שליחת הודעה
            </Button>
            <Button variant="outline" size="sm">
              <Phone className="w-4 h-4 ml-1" /> יצירת קשר
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
