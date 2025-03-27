import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, FileText, FileAudio, FileVideo, FileImage, File, Download, ExternalLink } from "lucide-react";
import { Resource } from "@shared/schema";

export default function ClientResources() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: resources, isLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources/client"],
    enabled: !!user,
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
  
  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('he-IL');
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
                      <ResourceCard key={resource.id} resource={resource} />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              {Object.keys(resourcesByType).map(type => (
                <TabsContent key={type} value={type}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {resourcesByType[type].map((resource) => (
                      <ResourceCard key={resource.id} resource={resource} />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </main>
      </div>
    </div>
  );
}

interface ResourceCardProps {
  resource: Resource;
}

function ResourceCard({ resource }: ResourceCardProps) {
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
  
  // Get appropriate action text based on resource type
  const getActionText = (type: string) => {
    switch (type) {
      case "pdf":
        return "הורדה";
      case "audio":
        return "האזנה";
      case "video":
        return "צפייה";
      case "image":
        return "צפייה";
      default:
        return "פתיחה";
    }
  };
  
  // Get appropriate action icon based on resource type
  const getActionIcon = (type: string) => {
    return ["pdf", "audio"].includes(type) ? (
      <Download className="w-4 h-4 ml-1" />
    ) : (
      <ExternalLink className="w-4 h-4 ml-1" />
    );
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
            {resource.coach && (
              <p className="text-gray-500 text-sm mb-3">
                <span className="font-medium">שותף ע"י:</span> {resource.coach.name}
              </p>
            )}
            <div className="flex space-x-2 space-x-reverse">
              <a 
                href={resource.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
              >
                {getActionIcon(resource.type)} {getActionText(resource.type)}
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
