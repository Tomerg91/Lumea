import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, User, Camera } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { t } from "@/lib/i18n";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const profileSchema = z.object({
  name: z.string().min(2, {
    message: t("error.minLength").replace("{{count}}", "2"),
  }),
  email: z.string().email({
    message: t("error.email"),
  }),
  phone: z.string().optional(),
  bio: z.string().optional(),
});

const securitySchema = z.object({
  currentPassword: z.string().min(1, {
    message: t("error.required"),
  }),
  newPassword: z.string().min(6, {
    message: t("error.minLength").replace("{{count}}", "6"),
  }),
  confirmPassword: z.string().min(6, {
    message: t("error.minLength").replace("{{count}}", "6"),
  }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: t("error.passwordMatch"),
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type SecurityFormValues = z.infer<typeof securitySchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [isUploading, setIsUploading] = useState(false);
  
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      bio: user?.bio || "",
    },
  });

  const securityForm = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const res = await apiRequest("PATCH", "/api/user", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "הפרופיל עודכן בהצלחה",
        description: "השינויים שביצעת נשמרו בהצלחה",
      });
    },
    onError: (error) => {
      toast({
        title: "שגיאה בעדכון הפרופיל",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Password update mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: SecurityFormValues) => {
      const res = await apiRequest("POST", "/api/user/change-password", data);
      return await res.json();
    },
    onSuccess: () => {
      securityForm.reset();
      toast({
        title: "הסיסמה עודכנה בהצלחה",
        description: "סיסמתך עודכנה בהצלחה",
      });
    },
    onError: (error) => {
      toast({
        title: "שגיאה בעדכון הסיסמה",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Profile picture update handler (mock for now)
  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    
    // Mock upload - in a real app, you'd upload to server
    setTimeout(() => {
      setIsUploading(false);
      toast({
        title: "תמונת הפרופיל עודכנה",
        description: "תמונת הפרופיל שלך עודכנה בהצלחה",
      });
    }, 1500);
  };
  
  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };
  
  const onSecuritySubmit = (data: SecurityFormValues) => {
    updatePasswordMutation.mutate(data);
  };
  
  return (
    <div className="container mx-auto p-4 pt-6 md:pt-10 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
        <p className="text-gray-500 mt-2">{t("settings.subtitle")}</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="space-y-6">
        <TabsList className="w-full justify-start border-b rounded-none p-0">
          <TabsTrigger 
            value="profile" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2"
          >
            {t("settings.tabs.profile")}
          </TabsTrigger>
          <TabsTrigger 
            value="security" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2"
          >
            {t("settings.tabs.security")}
          </TabsTrigger>
          <TabsTrigger 
            value="notifications" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2"
          >
            {t("settings.tabs.notifications")}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile picture */}
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.profilePicture.title")}</CardTitle>
                <CardDescription>
                  {t("settings.profilePicture.description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center space-y-4">
                <Avatar className="w-32 h-32 border-2 border-primary/20">
                  <AvatarImage src={user?.profilePicture || ""} alt={user?.name} />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-primary-200 to-primary-100 text-primary-700">
                    {user?.name?.slice(0, 2) || <User className="w-16 h-16 text-primary-300" />}
                  </AvatarFallback>
                </Avatar>
                
                <div className="relative">
                  <Input
                    id="picture"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfilePictureUpload}
                  />
                  <Label
                    htmlFor="picture"
                    className="inline-flex items-center justify-center gap-2 cursor-pointer bg-primary-50 hover:bg-primary-100 text-primary-700 px-4 py-2 rounded-md transition-colors"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                    {t("settings.profilePicture.upload")}
                  </Label>
                </div>
              </CardContent>
            </Card>
            
            {/* Profile details */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>{t("settings.profileInfo.title")}</CardTitle>
                <CardDescription>
                  {t("settings.profileInfo.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("settings.profileInfo.name")}</FormLabel>
                            <FormControl>
                              <Input {...field} dir="rtl" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("settings.profileInfo.email")}</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" dir="ltr" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("settings.profileInfo.phone")}</FormLabel>
                            <FormControl>
                              <Input {...field} dir="ltr" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={profileForm.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("settings.profileInfo.bio")}</FormLabel>
                          <FormControl>
                            <Input {...field} dir="rtl" className="min-h-[100px]" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full md:w-auto"
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending && (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      )}
                      <Save className="ml-2 h-4 w-4" />
                      {t("settings.profileInfo.save")}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.security.title")}</CardTitle>
              <CardDescription>
                {t("settings.security.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...securityForm}>
                <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-6">
                  <FormField
                    control={securityForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("settings.security.currentPassword")}</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" dir="ltr" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={securityForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("settings.security.newPassword")}</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" dir="ltr" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={securityForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("settings.security.confirmPassword")}</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" dir="ltr" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full md:w-auto"
                    disabled={updatePasswordMutation.isPending}
                  >
                    {updatePasswordMutation.isPending && (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    )}
                    {t("settings.security.updatePassword")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.notifications.title")}</CardTitle>
              <CardDescription>
                {t("settings.notifications.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="email_notifications">{t("settings.notifications.email")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.notifications.emailDescription")}
                  </p>
                </div>
                <Switch id="email_notifications" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="sms_notifications">{t("settings.notifications.sms")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.notifications.smsDescription")}
                  </p>
                </div>
                <Switch id="sms_notifications" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="marketing_emails">{t("settings.notifications.marketing")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.notifications.marketingDescription")}
                  </p>
                </div>
                <Switch id="marketing_emails" />
              </div>
              
              <Button className="w-full md:w-auto mt-6">
                {t("settings.notifications.save")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}