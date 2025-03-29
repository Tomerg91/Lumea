import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { t } from "@/lib/i18n";

// Login form schema
const loginSchema = z.object({
  email: z.string().email(t("error.email")),
  password: z.string().min(6, t("error.minLength").replace("{{count}}", "6")),
  rememberMe: z.boolean().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;

// Register form schema
const registerSchema = z.object({
  name: z.string().min(2, t("error.minLength").replace("{{count}}", "2")),
  email: z.string().email(t("error.email")),
  password: z.string().min(6, t("error.minLength").replace("{{count}}", "6")),
  confirmPassword: z.string().min(6, t("error.minLength").replace("{{count}}", "6")),
  role: z.enum(["client", "coach"]),
}).refine((data) => data.password === data.confirmPassword, {
  message: t("error.passwordMatch"),
  path: ["confirmPassword"],
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");
  
  // Login form
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  // Register form
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "client",
    },
  });

  // If already logged in, redirect to dashboard
  if (!isLoading && user) {
    const dashboardUrl = user.role === "coach" ? "/coach/dashboard" : "/client/dashboard";
    return <Redirect to={dashboardUrl} />;
  }

  const onLoginSubmit = (values: LoginValues) => {
    loginMutation.mutate({
      email: values.email,
      password: values.password,
    });
  };

  const onRegisterSubmit = (values: RegisterValues) => {
    const { confirmPassword, ...userData } = values;
    registerMutation.mutate({
      ...userData,
      confirmPassword,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t("auth.login.title")}</TabsTrigger>
              <TabsTrigger value="register">{t("auth.signup.title")}</TabsTrigger>
            </TabsList>
            
            {/* Login Form */}
            <TabsContent value="login">
              <CardHeader>
                <CardTitle className="text-center">{t("auth.login.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.login.email")}</FormLabel>
                          <FormControl>
                            <Input placeholder="your@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.login.password")}</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-center justify-between">
                      <FormField
                        control={loginForm.control}
                        name="rememberMe"
                        render={({ field }) => (
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox
                              id="rememberMe"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                            <label
                              htmlFor="rememberMe"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {t("auth.login.rememberMe")}
                            </label>
                          </div>
                        )}
                      />
                      <a href="#" className="text-sm text-primary-600 hover:text-primary-800">
                        {t("auth.login.forgotPassword")}
                      </a>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {t("auth.login.submit")}
                    </Button>
                    <div className="text-center mt-4">
                      <span className="text-gray-600">{t("auth.login.noAccount")}</span>
                      <Button variant="link" onClick={() => setActiveTab("register")} className="mr-1">
                        {t("auth.login.signupLink")}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </TabsContent>
            
            {/* Register Form */}
            <TabsContent value="register">
              <CardHeader>
                <CardTitle className="text-center">{t("auth.signup.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.signup.fullName")}</FormLabel>
                          <FormControl>
                            <Input placeholder="ישראל ישראלי" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.signup.email")}</FormLabel>
                          <FormControl>
                            <Input placeholder="your@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.signup.password")}</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.signup.confirmPassword")}</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.signup.roleSelect")}</FormLabel>
                          <div className="grid grid-cols-2 gap-4">
                            <Button
                              type="button"
                              variant={field.value === "client" ? "default" : "outline"}
                              className={`py-3 px-4 rounded-lg text-center transition-colors duration-200 ${
                                field.value === "client"
                                  ? "bg-primary-600 text-white"
                                  : "border-2 border-gray-300 hover:bg-gray-50"
                              }`}
                              onClick={() => field.onChange("client")}
                            >
                              <div className="flex flex-col items-center">
                                <i className="fas fa-user text-lg mb-1"></i>
                                <div className="font-medium">{t("auth.signup.roleClient")}</div>
                              </div>
                            </Button>
                            <Button
                              type="button"
                              variant={field.value === "coach" ? "default" : "outline"}
                              className={`py-3 px-4 rounded-lg text-center transition-colors duration-200 ${
                                field.value === "coach"
                                  ? "bg-primary-600 text-white"
                                  : "border-2 border-gray-300 hover:bg-gray-50"
                              }`}
                              onClick={() => field.onChange("coach")}
                            >
                              <div className="flex flex-col items-center">
                                <i className="fas fa-user-tie text-lg mb-1"></i>
                                <div className="font-medium">{t("auth.signup.roleCoach")}</div>
                              </div>
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {t("auth.signup.submit")}
                    </Button>
                    <div className="text-center mt-4">
                      <span className="text-gray-600">{t("auth.signup.hasAccount")}</span>
                      <Button variant="link" onClick={() => setActiveTab("login")} className="mr-1">
                        {t("auth.signup.loginLink")}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
