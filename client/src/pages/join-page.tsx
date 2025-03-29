import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";
import { Loader2, CheckCircle, UserCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useAuth } from "@/hooks/use-auth";

const joinFormSchema = z.object({
  name: z.string().min(2, {
    message: t("error.minLength").replace("{{count}}", "2"),
  }),
  email: z.string().email({
    message: t("error.email"),
  }),
  password: z.string().min(6, {
    message: t("error.minLength").replace("{{count}}", "6"),
  }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: t("error.passwordMatch"),
  path: ["confirmPassword"],
});

type JoinFormValues = z.infer<typeof joinFormSchema>;

export default function JoinPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [match, params] = useRoute("/join/:inviteId");
  const [inviteData, setInviteData] = useState<{
    coachId?: number;
    coachName?: string;
    email?: string;
    name?: string;
  }>({});
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isValidInvite, setIsValidInvite] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation(`/${user.role}/dashboard`);
    }
  }, [user, setLocation]);

  // Parse URL parameters
  useEffect(() => {
    if (match) {
      const searchParams = new URLSearchParams(window.location.search);
      const coachId = searchParams.get("coach");
      const email = searchParams.get("email");
      const name = searchParams.get("name");
      const coachName = searchParams.get("coachName");

      if (coachId && email) {
        setInviteData({
          coachId: parseInt(coachId, 10),
          email: decodeURIComponent(email),
          name: name ? decodeURIComponent(name) : undefined,
          coachName: coachName ? decodeURIComponent(coachName) : undefined,
        });
        setIsValidInvite(true);
      } else {
        setIsValidInvite(false);
      }
      setIsLoading(false);
    }
  }, [match]);

  // Set up form with defaults from URL
  const form = useForm<JoinFormValues>({
    resolver: zodResolver(joinFormSchema),
    defaultValues: {
      name: inviteData.name || "",
      email: inviteData.email || "",
      password: "",
      confirmPassword: "",
    },
    values: {
      name: inviteData.name || "",
      email: inviteData.email || "",
      password: "",
      confirmPassword: "",
    },
  });

  // Join mutation
  const joinMutation = useMutation({
    mutationFn: async (data: JoinFormValues & { coachId: number }) => {
      const res = await apiRequest("POST", "/api/clients/join", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create account");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: t("join.success"),
        description: t("join.successDescription"),
      });
      setIsSuccessful(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        setLocation("/auth");
      }, 3000);
    },
    onError: (error: Error) => {
      toast({
        title: t("join.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: JoinFormValues) => {
    if (!inviteData.coachId) {
      toast({
        title: t("join.error"),
        description: t("join.invalidInvite"),
        variant: "destructive",
      });
      return;
    }

    joinMutation.mutate({
      ...values,
      coachId: inviteData.coachId,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isValidInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("join.invalidInvite")}</CardTitle>
            <CardDescription>
              {t("join.invalidInviteDescription")}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              className="w-full"
              onClick={() => setLocation("/auth")}
            >
              {t("auth.backToLogin")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isSuccessful) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle>{t("join.success")}</CardTitle>
            <CardDescription>
              {t("join.successDescription")}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              className="w-full"
              onClick={() => setLocation("/auth")}
            >
              {t("auth.login.submit")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-primary-50 to-white">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="rounded-full p-2 bg-primary-100 mb-4">
              <UserCircle className="h-16 w-16 text-primary" />
            </div>
            
            <CardTitle className="text-xl text-center">
              {t("join.title")}
            </CardTitle>
            
            {inviteData.coachName && (
              <CardDescription className="text-center mt-2">
                {t("join.invitedBy").replace("{{coachName}}", inviteData.coachName)}
              </CardDescription>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.signup.fullName")}</FormLabel>
                    <FormControl>
                      <Input {...field} dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.signup.email")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.signup.password")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.signup.confirmPassword")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full mt-6"
                disabled={joinMutation.isPending}
              >
                {joinMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                {t("join.submit")}
              </Button>
              
              <div className="text-center mt-4">
                <Button 
                  variant="link"
                  onClick={() => setLocation("/auth")}
                >
                  {t("auth.signup.hasAccount")} {t("auth.signup.loginLink")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}