import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
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
import { Loader2, ArrowLeft } from "lucide-react";
import { t } from "@/lib/i18n";
import { Link } from "wouter";

// Email validation schema
const emailSchema = z.object({
  email: z.string().email(t("error.email")),
});

type EmailValues = z.infer<typeof emailSchema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  // Form setup
  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  // Request password reset mutation
  const passwordResetMutation = useMutation({
    mutationFn: async (data: EmailValues) => {
      const res = await apiRequest("POST", "/api/forgot-password", data);
      return await res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: t("auth.resetPassword.emailSent"),
        description: t("auth.resetPassword.checkEmail"),
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

  const onSubmit = (values: EmailValues) => {
    passwordResetMutation.mutate(values);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {t("auth.resetPassword.title")}
            </CardTitle>
            <CardDescription className="text-center">
              {t("auth.resetPassword.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center space-y-4">
                <p className="text-sm">
                  {t("auth.resetPassword.emailSentDescription")}
                </p>
                <Button asChild className="mt-4">
                  <Link href="/auth">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t("auth.backToLogin")}
                  </Link>
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
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
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={passwordResetMutation.isPending}
                  >
                    {passwordResetMutation.isPending ? (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {t("auth.resetPassword.submitButton")}
                  </Button>
                  <div className="text-center mt-4">
                    <Button variant="link" asChild>
                      <Link href="/auth">{t("auth.backToLogin")}</Link>
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}