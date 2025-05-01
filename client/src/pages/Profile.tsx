import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/MainLayout';
import ThemeToggle from '@/components/ThemeToggle';

const profileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters long' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  bio: z.string().optional(),
  role: z.enum(['client', 'coach']),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const securitySchema = z
  .object({
    currentPassword: z.string().min(6, { message: 'Current password is required' }),
    newPassword: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SecurityFormValues = z.infer<typeof securitySchema>;

const Profile = () => {
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop'
  );

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: 'Alexandra Chen',
      email: 'alexandra.chen@example.com',
      bio: "I'm passionate about mindfulness practices and somatic healing. Looking forward to my personal growth journey.",
      role: 'client',
    },
  });

  const securityForm = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onProfileSubmit = (data: ProfileFormValues) => {
    console.log('Profile data:', data);
    toast({
      title: 'Profile Updated',
      description: 'Your profile information has been saved successfully.',
    });
  };

  const onSecuritySubmit = (data: SecurityFormValues) => {
    console.log('Security data:', data);
    toast({
      title: 'Password Changed',
      description: 'Your password has been updated successfully.',
    });
    securityForm.reset({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto animate-fade-in">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-playfair mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your personal information and preferences</p>
        </header>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="lumea-card">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details and profile photo</CardDescription>
              </CardHeader>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                <CardContent className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="relative">
                        <div className="h-32 w-32 rounded-full overflow-hidden border-2 border-lumea-beige dark:border-lumea-taupe/50">
                          {imagePreview ? (
                            <img
                              src={imagePreview}
                              alt="Profile"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-lumea-beige dark:bg-lumea-taupe/30 flex items-center justify-center text-4xl font-playfair">
                              {profileForm.getValues('name').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <label
                          htmlFor="profile-image"
                          className="absolute bottom-0 right-0 bg-lumea-stone dark:bg-lumea-stone/80 text-white p-1 rounded-full cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path>
                            <path d="m16 3 5 5"></path>
                            <path d="M14 11a2 2 0 0 1 2-2 2 2 0 0 1 2 2v2h-4v-2Z"></path>
                            <path d="M14 17h4"></path>
                          </svg>
                        </label>
                        <input
                          id="profile-image"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </div>
                      <p className="text-xs text-center text-muted-foreground">
                        Click the edit icon to change photo.
                        <br />
                        JPG, PNG or GIF, max 2MB.
                      </p>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input id="name" {...profileForm.register('name')} />
                          {profileForm.formState.errors.name && (
                            <p className="text-sm text-red-500">
                              {profileForm.formState.errors.name.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" type="email" {...profileForm.register('email')} />
                          {profileForm.formState.errors.email && (
                            <p className="text-sm text-red-500">
                              {profileForm.formState.errors.email.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select
                          value={profileForm.watch('role')}
                          onValueChange={(value: 'client' | 'coach') =>
                            profileForm.setValue('role', value)
                          }
                        >
                          <SelectTrigger id="role">
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="client">Client</SelectItem>
                            <SelectItem value="coach">Coach</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          placeholder="Tell us a bit about yourself..."
                          className="min-h-[100px]"
                          {...profileForm.register('bio')}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button
                    type="submit"
                    className="bg-lumea-stone text-lumea-beige hover:bg-lumea-stone/90"
                  >
                    Save Changes
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="lumea-card">
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Update your password and security preferences</CardDescription>
              </CardHeader>
              <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)}>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        placeholder="••••••••"
                        {...securityForm.register('currentPassword')}
                      />
                      {securityForm.formState.errors.currentPassword && (
                        <p className="text-sm text-red-500">
                          {securityForm.formState.errors.currentPassword.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        placeholder="••••••••"
                        {...securityForm.register('newPassword')}
                      />
                      {securityForm.formState.errors.newPassword && (
                        <p className="text-sm text-red-500">
                          {securityForm.formState.errors.newPassword.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        {...securityForm.register('confirmPassword')}
                      />
                      {securityForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-red-500">
                          {securityForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium mb-3">Two-Factor Authentication</h3>
                    <div className="flex justify-between items-center">
                      <div>
                        <p>Enhance your account security by enabling 2FA</p>
                        <p className="text-sm text-muted-foreground">
                          Receive verification codes via email or authenticator app
                        </p>
                      </div>
                      <Switch id="enable-2fa" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button
                    type="submit"
                    className="bg-lumea-stone text-lumea-beige hover:bg-lumea-stone/90"
                  >
                    Update Password
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card className="lumea-card">
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Customize your app experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">Theme</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose between light and dark mode
                      </p>
                    </div>
                    <ThemeToggle />
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">Language</h3>
                      <p className="text-sm text-muted-foreground">
                        Select your preferred language
                      </p>
                    </div>
                    <Select defaultValue="english">
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select a language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="hebrew">Hebrew</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">Email Notifications</h3>
                      <p className="text-sm text-muted-foreground">
                        Receive emails about your sessions and updates
                      </p>
                    </div>
                    <Switch id="email-notifications" defaultChecked />
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">App Notifications</h3>
                      <p className="text-sm text-muted-foreground">
                        Receive in-app notifications about your sessions
                      </p>
                    </div>
                    <Switch id="app-notifications" defaultChecked />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-3">Privacy</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p>Share profile with coaches</p>
                        <p className="text-sm text-muted-foreground">
                          Allow coaches to view your profile information
                        </p>
                      </div>
                      <Switch id="share-profile" defaultChecked />
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <p>Analytics consent</p>
                        <p className="text-sm text-muted-foreground">
                          Allow anonymous usage data collection to improve app experience
                        </p>
                      </div>
                      <Switch id="analytics-consent" defaultChecked />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-3">Data Management</h3>
                  <div className="flex gap-4">
                    <Button variant="outline">Export Your Data</Button>
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border-red-200 hover:border-red-300 dark:border-red-900 dark:hover:border-red-800"
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button className="bg-lumea-stone text-lumea-beige hover:bg-lumea-stone/90">
                  Save Preferences
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Profile;
