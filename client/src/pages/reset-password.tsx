import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { t } from "@/lib/i18n";
import { Link, useLocation } from "wouter";

// Reset password schema
const resetPasswordSchema = z
  .object({
    password: z.string().min(6, t("error.minLength").replace("{{count}}", "6")),
    confirmPassword: z.string().min(6, t("error.minLength").replace("{{count}}", "6")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: t("error.passwordMatch"),
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [location] = useLocation();
  const token = location.split("/").pop();
  const [isSuccessful, setIsSuccessful] = useState(false);

  // Form setup
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Validate token
  const { data, isLoading, isError } = useQuery({
    queryKey: [`/api/reset-password/${token}`],
    queryFn: async () => {
      const res = await fetch(`/api/reset-password/${token}`);
      if (!res.ok) {
        throw new Error("Invalid or expired token");
      }
      return res.json();
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordValues) => {
      const res = await apiRequest("POST", `/api/reset-password/${token}`, data);
      return await res.json();
    },
    onSuccess: () => {
      setIsSuccessful(true);
      toast({
        title: t("auth.resetPassword.success"),
        description: t("auth.resetPassword.successDescription"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("auth.resetPassword.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: ResetPasswordValues) => {
    resetPasswordMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">
              {t("auth.resetPassword.validating")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive flex items-center justify-center">
              <XCircle className="mr-2 h-6 w-6" />
              {t("auth.resetPassword.invalidToken")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-4">
              {t("auth.resetPassword.invalidTokenDescription")}
            </p>
            <div className="flex justify-center">
              <Button asChild>
                <Link href="/forgot-password">
                  {t("auth.resetPassword.requestNewLink")}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccessful) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-primary flex items-center justify-center">
              <CheckCircle className="mr-2 h-6 w-6" />
              {t("auth.resetPassword.success")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-4">
              {t("auth.resetPassword.successDescription")}
            </p>
            <div className="flex justify-center">
              <Button asChild>
                <Link href="/auth">{t("auth.login.title")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {t("auth.resetPassword.setNewPassword")}
            </CardTitle>
            <CardDescription className="text-center">
              {t("auth.resetPassword.setNewPasswordDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth.resetPassword.newPassword")}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
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
                      <FormLabel>{t("auth.resetPassword.confirmPassword")}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {t("auth.resetPassword.resetButton")}
                </Button>
                <div className="text-center mt-4">
                  <Button variant="link" asChild>
                    <Link href="/auth">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      {t("auth.backToLogin")}
                    </Link>
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}