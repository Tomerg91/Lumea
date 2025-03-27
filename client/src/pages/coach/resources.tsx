import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, 
  Search, 
  Plus, 
  FileText, 
  File, 
  FileAudio, 
  FileVideo, 
  FileImage, 
  Download, 
  ExternalLink, 
  Edit, 
  Trash2, 
  UserPlus 
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Resource } from "@shared/schema";

export default function CoachResources() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [newResourceDialog, setNewResourceDialog] = useState(false);
  const [shareResourceDialog, setShareResourceDialog] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  
  const { data: resources, isLoading: resourcesLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources/coach"],
    enabled: !!user,
  });
  
  const { data: clientLinks, isLoading: clientsLoading } = useQuery<any[]>({
    queryKey: ["/api/links/coach"],
    enabled: !!user,
  });
  
  const isLoading = resourcesLoading || clientsLoading;

  // New resource form state
  const [newResource, setNewResource] = useState({
    title: "",
    description: "",
    type: "pdf",
    fileUrl: "",
    visibleToClients: true
  });
  
  // Share resource form state
  const [shareData, setShareData] = useState({
    clientId: "",
    resourceId: ""
  });
  
  const createResourceMutation = useMutation({
    mutationFn: async (resourceData: any) => {
      await apiRequest("POST", "/api/resources", {
        coachId: user!.id,
        title: resourceData.title,
        description: resourceData.description,
        fileUrl: resourceData.fileUrl,
        type: resourceData.type,
        visibleToClients: resourceData.visibleToClients
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources/coach"] });
      toast({
        title: "חומר לימוד נוצר בהצלחה",
        description: "החומר נוסף למאגר חומרי הלימוד שלך.",
      });
      setNewResourceDialog(false);
      setNewResource({
        title: "",
        description: "",
        type: "pdf",
        fileUrl: "",
        visibleToClients: true
      });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה ביצירת חומר לימוד",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const shareResourceMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/resource-access", {
        resourceId: parseInt(data.resourceId),
        clientId: parseInt(data.clientId)
      });
    },
    onSuccess: () => {
      toast({
        title: "חומר לימוד שותף בהצלחה",
        description: "המתאמן יוכל כעת לצפות בחומר הלימוד.",
      });
      setShareResourceDialog(false);
      setShareData({
        clientId: "",
        resourceId: ""
      });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה בשיתוף חומר הלימוד",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Filter resources based on search term
  const filteredResources = resources?.filter(resource => {
    const title = resource.title.toLowerCase();
    const description = resource.description?.toLowerCase() || "";
    const term = searchTerm.toLowerCase();
    return title.includes(term) || description.includes(term);
  }) || [];
  
  // Group resources by type
  const resourcesByType = filteredResources.reduce((acc: Record<string, Resource[]>, resource) => {
    if (!acc[resource.type]) {
      acc[resource.type] = [];
    }
    acc[resource.type].push(resource);
    return acc;
  }, {});
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewResource(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCheckboxChange = (checked: boolean) => {
    setNewResource(prev => ({ ...prev, visibleToClients: checked }));
  };
  
  const handleCreateResource = () => {
    if (!newResource.title || !newResource.type || !newResource.fileUrl) {
      toast({
        title: "נתונים חסרים",
        description: "אנא מלא את כל השדות הנדרשים",
        variant: "destructive",
      });
      return;
    }
    
    createResourceMutation.mutate(newResource);
  };
  
  const handleShareResource = (resource: Resource) => {
    setSelectedResource(resource);
    setShareData(prev => ({ ...prev, resourceId: resource.id.toString() }));
    setShareResourceDialog(true);
  };
  
  const handleShareSubmit = () => {
    if (!shareData.clientId || !shareData.resourceId) {
      toast({
        title: "נתונים חסרים",
        description: "אנא בחר מתאמן לשיתוף",
        variant: "destructive",
      });
      return;
    }
    
    shareResourceMutation.mutate(shareData);
  };
  
  // Get icon based on resource type
  const getResourceIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="text-red-600 text-xl" />;
      case "audio":
        return <FileAudio className="text-green-600 text-xl" />;
      case "video":
        return <FileVideo className="text-purple-600 text-xl" />;
      case "image":
        return <FileImage className="text-blue-600 text-xl" />;
      default:
        return <File className="text-gray-600 text-xl" />;
    }
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
            <h1 className="text-2xl font-bold text-gray-800">חומרי לימוד</h1>
            <Dialog open={newResourceDialog} onOpenChange={setNewResourceDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary-600">
                  <Plus className="w-4 h-4 ml-2" /> הוספת חומר חדש
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>הוספת חומר לימוד חדש</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label htmlFor="title" className="text-sm font-medium">כותרת</label>
                    <Input 
                      id="title" 
                      name="title" 
                      placeholder="כותרת החומר"
                      value={newResource.title}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="description" className="text-sm font-medium">תיאור (אופציונלי)</label>
                    <Textarea 
                      id="description" 
                      name="description" 
                      placeholder="תיאור החומר"
                      value={newResource.description}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="type" className="text-sm font-medium">סוג חומר</label>
                    <Select 
                      name="type" 
                      value={newResource.type} 
                      onValueChange={(value) => setNewResource(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר סוג חומר" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">מסמך PDF</SelectItem>
                        <SelectItem value="audio">קובץ שמע</SelectItem>
                        <SelectItem value="video">קובץ וידאו</SelectItem>
                        <SelectItem value="image">תמונה</SelectItem>
                        <SelectItem value="text">טקסט</SelectItem>
                        <SelectItem value="other">אחר</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="fileUrl" className="text-sm font-medium">קישור לקובץ / כתובת URL</label>
                    <Input 
                      id="fileUrl" 
                      name="fileUrl" 
                      placeholder="הזן קישור לקובץ"
                      value={newResource.fileUrl}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox 
                      id="visibleToClients" 
                      checked={newResource.visibleToClients}
                      onCheckedChange={handleCheckboxChange}
                    />
                    <label
                      htmlFor="visibleToClients"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      גלוי לכל המתאמנים שלי
                    </label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewResourceDialog(false)}>ביטול</Button>
                  <Button onClick={handleCreateResource} disabled={createResourceMutation.isPending}>
                    {createResourceMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    הוספת חומר
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="mb-6 relative">
            <Search className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input 
              className="pl-10 pr-10" 
              placeholder="חיפוש חומרי לימוד" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="all">
              <TabsList className="mb-6">
                <TabsTrigger value="all">הכל ({filteredResources.length})</TabsTrigger>
                {Object.keys(resourcesByType).map(type => (
                  <TabsTrigger key={type} value={type}>
                    {type === "pdf" && "מסמכים"}
                    {type === "audio" && "קבצי שמע"}
                    {type === "video" && "סרטונים"}
                    {type === "image" && "תמונות"}
                    {type === "text" && "טקסטים"}
                    {type === "other" && "אחר"}
                    ({resourcesByType[type].length})
                  </TabsTrigger>
                ))}
              </TabsList>
              
              <TabsContent value="all">
                {filteredResources.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    לא נמצאו חומרי לימוד
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredResources.map((resource) => (
                      <ResourceCard 
                        key={resource.id} 
                        resource={resource} 
                        onShare={() => handleShareResource(resource)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              {Object.keys(resourcesByType).map(type => (
                <TabsContent key={type} value={type}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {resourcesByType[type].map((resource) => (
                      <ResourceCard 
                        key={resource.id} 
                        resource={resource} 
                        onShare={() => handleShareResource(resource)}
                      />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
          
          {/* Share Resource Dialog */}
          <Dialog open={shareResourceDialog} onOpenChange={setShareResourceDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>שיתוף חומר לימוד</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {selectedResource && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-md">
                    <h3 className="font-medium">{selectedResource.title}</h3>
                    <p className="text-sm text-gray-500">{selectedResource.description}</p>
                  </div>
                )}
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label htmlFor="clientId" className="text-sm font-medium">בחר מתאמן לשיתוף</label>
                    <Select 
                      name="clientId" 
                      value={shareData.clientId} 
                      onValueChange={(value) => setShareData(prev => ({ ...prev, clientId: value }))}
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
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShareResourceDialog(false)}>ביטול</Button>
                <Button onClick={handleShareSubmit} disabled={shareResourceMutation.isPending}>
                  {shareResourceMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  שיתוף
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}

interface ResourceCardProps {
  resource: Resource;
  onShare: () => void;
}

function ResourceCard({ resource, onShare }: ResourceCardProps) {
  // Get background and icon based on resource type
  const getTypeStyles = (type: string) => {
    switch (type) {
      case "pdf":
        return { bg: "bg-red-100", icon: <FileText className="text-red-600 text-xl" /> };
      case "audio":
        return { bg: "bg-green-100", icon: <FileAudio className="text-green-600 text-xl" /> };
      case "video":
        return { bg: "bg-purple-100", icon: <FileVideo className="text-purple-600 text-xl" /> };
      case "image":
        return { bg: "bg-blue-100", icon: <FileImage className="text-blue-600 text-xl" /> };
      default:
        return { bg: "bg-gray-100", icon: <File className="text-gray-600 text-xl" /> };
    }
  };
  
  const { bg, icon } = getTypeStyles(resource.type);
  
  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('he-IL');
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start">
          <div className={`${bg} p-3 rounded-lg ml-3`}>
            {icon}
          </div>
          <div>
            <h3 className="font-medium">{resource.title}</h3>
            <p className="text-gray-500 text-sm mb-2">
              נוסף בתאריך {formatDate(resource.createdAt)}
            </p>
            {resource.description && (
              <p className="text-gray-700 text-sm mb-3">{resource.description}</p>
            )}
            <div className="flex space-x-2 space-x-reverse">
              <a 
                href={resource.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
              >
                {resource.type === "pdf" || resource.type === "audio" ? (
                  <>
                    <Download className="w-4 h-4 ml-1" /> הורדה
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 ml-1" /> צפייה
                  </>
                )}
              </a>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between">
        <div className="text-xs text-gray-500">
          {resource.visibleToClients ? "גלוי לכל המתאמנים" : "גלוי רק למתאמנים נבחרים"}
        </div>
        <div className="flex space-x-2 space-x-reverse">
          <Button variant="ghost" size="sm" onClick={onShare}>
            <UserPlus className="w-4 h-4 ml-1" /> שיתוף
          </Button>
          <Button variant="ghost" size="sm">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800 hover:bg-red-50">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
