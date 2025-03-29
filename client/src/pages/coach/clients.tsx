import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { t } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

import {
  Users,
  UserPlus,
  Mail,
  Search,
  Link as LinkIcon,
  Copy,
  Plus,
  Loader2,
  MoreHorizontal,
  CalendarClock,
  MessageSquare,
  Phone,
  BadgeAlert,
  Check,
  X
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Types
type ClientWithLink = {
  id: number;
  name: string;
  email: string;
  profilePicture: string | null;
  role: string;
  status: "active" | "pending" | "inactive";
  linkId: number;
  lastSession?: string;
  phone?: string;
};

const inviteFormSchema = z.object({
  name: z.string().min(2, {
    message: t("error.minLength").replace("{{count}}", "2"),
  }),
  email: z.string().email({
    message: t("error.email"),
  }),
  message: z.string().optional(),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

export default function ClientsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [invitationLink, setInvitationLink] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  
  // Fetch clients
  const { data: clientLinks = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ["/api/links/coach"],
    select: (data: any) => data.map((link: any) => ({
      id: link.client.id,
      name: link.client.name,
      email: link.client.email,
      profilePicture: link.client.profilePicture,
      role: link.client.role,
      status: link.status,
      linkId: link.id,
      phone: link.client.phone || "",
      lastSession: "N/A" // Would be populated in a real app
    })),
  });
  
  // Filter clients
  const filteredClients = clientLinks.filter((client: ClientWithLink) => {
    // Filter by tab
    if (activeTab !== "all" && client.status !== activeTab) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm && !client.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !client.email.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });
  
  // Invite form
  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      name: "",
      email: "",
      message: t("coach.clients.invite.messagePlaceholder")
    },
  });
  
  // Client invite mutation
  const inviteMutation = useMutation({
    mutationFn: async (data: InviteFormValues) => {
      const res = await apiRequest("POST", "/api/clients/invite", data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: t("coach.clients.invite.success"),
        description: "הקישור נוצר בהצלחה",
      });
      
      setInvitationLink(data.invitationLink);
      
      // If it's an existing client that was linked to this coach
      if (data.link) {
        queryClient.invalidateQueries({ queryKey: ["/api/links/coach"] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה בשליחת ההזמנה",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle invite form submission
  const onInviteSubmit = (data: InviteFormValues) => {
    inviteMutation.mutate(data);
  };
  
  // Handle invite dialog close
  const handleDialogClose = () => {
    setIsInviteDialogOpen(false);
    setInvitationLink("");
    inviteForm.reset();
  };
  
  // Copy invitation link to clipboard
  const copyInvitationLink = () => {
    navigator.clipboard.writeText(invitationLink);
    toast({
      title: t("coach.clients.invite.linkCopied"),
      duration: 2000,
    });
  };
  
  // Get client status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">{t("coach.clients.status.active")}</Badge>;
      case "pending":
        return <Badge className="bg-amber-500">{t("coach.clients.status.invited")}</Badge>;
      case "inactive":
        return <Badge className="bg-gray-500">{t("coach.clients.status.inactive")}</Badge>;
      default:
        return null;
    }
  };
  
  return (
    <div className="container mx-auto p-4 pt-6 md:pt-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">מתאמנים</h1>
          <p className="text-gray-500 mt-1">נהל את רשימת המתאמנים שלך</p>
        </div>
        
        <div className="mt-4 md:mt-0 space-y-3 md:space-y-0 md:space-x-4 md:space-x-reverse flex flex-col md:flex-row">
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-5 w-5" />
                {t("coach.clients.invite")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{t("coach.clients.invite.title")}</DialogTitle>
                <DialogDescription>
                  {t("coach.clients.invite.description")}
                </DialogDescription>
              </DialogHeader>
              
              {!invitationLink ? (
                <Form {...inviteForm}>
                  <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4">
                    <FormField
                      control={inviteForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("coach.clients.invite.nameLabel")}</FormLabel>
                          <FormControl>
                            <Input {...field} dir="rtl" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={inviteForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("coach.clients.invite.emailLabel")}</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" dir="ltr" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={inviteForm.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("coach.clients.invite.messageLabel")}</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              dir="rtl"
                              rows={3}
                              placeholder={t("coach.clients.invite.messagePlaceholder")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter className="mt-6">
                      <Button type="submit" disabled={inviteMutation.isPending}>
                        {inviteMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                        {t("coach.clients.invite.submit")}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-primary-50 p-3 rounded-md">
                    <div className="text-sm text-primary-800 break-all">{invitationLink}</div>
                  </div>
                  
                  <Button
                    type="button"
                    className="w-full gap-2"
                    variant="outline"
                    onClick={copyInvitationLink}
                  >
                    <Copy className="h-4 w-4" />
                    {t("coach.clients.invite.copyLink")}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
          
          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t("coach.clients.search")}
              className="pl-3 pr-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              dir="rtl"
            />
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            <Users className="ml-2 h-4 w-4" /> כל המתאמנים
          </TabsTrigger>
          <TabsTrigger value="active">
            <Check className="ml-2 h-4 w-4" /> פעילים
          </TabsTrigger>
          <TabsTrigger value="pending">
            <BadgeAlert className="ml-2 h-4 w-4" /> ממתינים
          </TabsTrigger>
          <TabsTrigger value="inactive">
            <X className="ml-2 h-4 w-4" /> לא פעילים
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="pt-2">
          {isLoadingClients ? (
            <div className="flex justify-center p-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : filteredClients.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("coach.clients.table.name")}</TableHead>
                      <TableHead>{t("coach.clients.table.email")}</TableHead>
                      <TableHead>{t("coach.clients.table.phone")}</TableHead>
                      <TableHead>{t("coach.clients.table.status")}</TableHead>
                      <TableHead>{t("coach.clients.table.lastSession")}</TableHead>
                      <TableHead className="text-left">{t("coach.clients.table.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client: ClientWithLink) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={client.profilePicture || ""} alt={client.name} />
                              <AvatarFallback>{client.name.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{client.name}</span>
                          </div>
                        </TableCell>
                        <TableCell dir="ltr">{client.email}</TableCell>
                        <TableCell dir="ltr">{client.phone || "-"}</TableCell>
                        <TableCell>{getStatusBadge(client.status)}</TableCell>
                        <TableCell>{client.lastSession}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2 justify-start">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Link href={`/coach/sessions/schedule?clientId=${client.id}`}>
                                    <div className="flex w-full items-center">
                                      <CalendarClock className="ml-2 h-4 w-4" />
                                      קבע פגישה
                                    </div>
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Link href={`/coach/messages?clientId=${client.id}`}>
                                    <div className="flex w-full items-center">
                                      <MessageSquare className="ml-2 h-4 w-4" />
                                      שלח הודעה
                                    </div>
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <div className="flex items-center">
                                    <Phone className="ml-2 h-4 w-4" />
                                    התקשר
                                  </div>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Link href={`/coach/clients/${client.id}`}>
                                    <div className="flex w-full items-center">
                                      <Users className="ml-2 h-4 w-4" />
                                      צפה בפרופיל
                                    </div>
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-2">
              <CardContent className="py-10 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t("coach.clients.empty")}</h3>
                <p className="text-gray-500 max-w-md mb-6">{t("coach.clients.empty.description")}</p>
                <Button onClick={() => setIsInviteDialogOpen(true)}>
                  <UserPlus className="ml-2 h-4 w-4" />
                  {t("coach.clients.invite")}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}