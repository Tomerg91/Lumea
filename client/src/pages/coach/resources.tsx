import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
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
  UserPlus,
  Filter,
  Tag,
  X,
  Star,
  Clock
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Resource } from "@shared/schema";

// Interface for resource filters
interface ResourceFilters {
  type?: string | string[];
  category?: string | string[];
  tags?: string[];
  difficulty?: string;
  search?: string;
  featured?: boolean;
  languageCode?: string;
  minDuration?: number;
  maxDuration?: number;
}

export default function CoachResources() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [newResourceDialog, setNewResourceDialog] = useState(false);
  const [shareResourceDialog, setShareResourceDialog] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  
  // Advanced filter states
  const [filters, setFilters] = useState<ResourceFilters>({});
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  // State for the new improved resource form
  const [newResourceExpanded, setNewResourceExpanded] = useState({
    category: "general",
    tags: [] as string[],
    difficulty: "beginner",
    languageCode: "he",
    durationMinutes: 0,
    featured: false
  });
  
  // Resources query - default unfiltered
  const { data: resources, isLoading: resourcesLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources/coach"],
    enabled: !!user && Object.keys(filters).length === 0,
  });
  
  // Filtered resources query
  const { data: filteredResourcesData, isLoading: filteredResourcesLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources/coach/filter", filters],
    enabled: !!user && Object.keys(filters).length > 0,
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/resources/coach/filter", filters);
      return await response.json();
    }
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
    category: "general",
    tags: [] as string[],
    difficulty: "beginner",
    languageCode: "he",
    durationMinutes: 0,
    featured: false,
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
        category: resourceData.category || "general",
        tags: resourceData.tags || [],
        difficulty: resourceData.difficulty || "beginner",
        languageCode: resourceData.languageCode || "he",
        durationMinutes: resourceData.durationMinutes || null,
        featured: resourceData.featured || false,
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
        category: "general",
        tags: [],
        difficulty: "beginner",
        languageCode: "he",
        durationMinutes: 0,
        featured: false,
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
  
  // Effect to update search filter
  useEffect(() => {
    if (searchTerm) {
      setFilters(prev => ({ ...prev, search: searchTerm }));
      if (!activeFilters.includes("search")) {
        setActiveFilters(prev => [...prev, "search"]);
      }
    } else {
      // Remove search from filters if search term is empty
      const { search, ...restFilters } = filters;
      setFilters(restFilters);
      setActiveFilters(prev => prev.filter(f => f !== "search"));
    }
  }, [searchTerm]);
  
  // Use the appropriate resources array based on whether filters are applied
  const displayResources = Object.keys(filters).length > 0 ? filteredResourcesData : resources;
  
  // Determine if we are in a loading state
  const isResourcesLoading = resourcesLoading || filteredResourcesLoading;
  
  // Group resources by type
  const resourcesByType = (displayResources || []).reduce((acc: Record<string, Resource[]>, resource) => {
    if (!acc[resource.type]) {
      acc[resource.type] = [];
    }
    acc[resource.type].push(resource);
    return acc;
  }, {});
  
  // Apply a filter
  const applyFilter = (filterType: keyof ResourceFilters, value: any) => {
    // If the value is empty or null, remove the filter
    if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
      const { [filterType]: _, ...rest } = filters;
      setFilters(rest);
      setActiveFilters(prev => prev.filter(f => f !== filterType));
    } else {
      // Otherwise add/update the filter
      setFilters(prev => ({ ...prev, [filterType]: value }));
      if (!activeFilters.includes(filterType)) {
        setActiveFilters(prev => [...prev, filterType]);
      }
    }
  };
  
  // Remove a specific filter
  const removeFilter = (filterType: string) => {
    const { [filterType as keyof ResourceFilters]: _, ...rest } = filters;
    setFilters(rest);
    setActiveFilters(prev => prev.filter(f => f !== filterType));
    
    // Special case for search term
    if (filterType === 'search') {
      setSearchTerm('');
    }
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    setFilters({});
    setActiveFilters([]);
    setSearchTerm('');
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewResource(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCheckboxChange = (checked: boolean) => {
    setNewResource(prev => ({ ...prev, visibleToClients: checked }));
  };
  
  // Tag input handling
  const [tagInput, setTagInput] = useState("");
  
  const handleAddTag = () => {
    if (tagInput.trim()) {
      setNewResource(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput("");
    }
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setNewResource(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
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
                  
                  <div className="grid gap-2">
                    <label htmlFor="category" className="text-sm font-medium">קטגוריה</label>
                    <Select 
                      name="category" 
                      value={newResource.category} 
                      onValueChange={(value) => setNewResource(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר קטגוריה" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mindfulness">מיינדפולנס</SelectItem>
                        <SelectItem value="exercises">תרגילים</SelectItem>
                        <SelectItem value="assessments">הערכות</SelectItem>
                        <SelectItem value="readings">חומרי קריאה</SelectItem>
                        <SelectItem value="worksheets">דפי עבודה</SelectItem>
                        <SelectItem value="general">כללי</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <label htmlFor="difficulty" className="text-sm font-medium">רמת קושי</label>
                    <Select 
                      name="difficulty" 
                      value={newResource.difficulty} 
                      onValueChange={(value) => setNewResource(prev => ({ ...prev, difficulty: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר רמת קושי" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">מתחילים</SelectItem>
                        <SelectItem value="intermediate">בינוני</SelectItem>
                        <SelectItem value="advanced">מתקדם</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <label htmlFor="durationMinutes" className="text-sm font-medium">משך זמן (בדקות)</label>
                    <Input 
                      id="durationMinutes" 
                      name="durationMinutes"
                      type="number"
                      min="0"
                      placeholder="משך זמן בדקות"
                      value={newResource.durationMinutes}
                      onChange={(e) => setNewResource(prev => ({ 
                        ...prev, 
                        durationMinutes: parseInt(e.target.value) || 0 
                      }))}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <label htmlFor="tags" className="text-sm font-medium">תגיות</label>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {newResource.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <button 
                            type="button" 
                            onClick={() => handleRemoveTag(tag)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="tagInput"
                        placeholder="הוסף תגית..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                      />
                      <Button 
                        type="button" 
                        size="sm" 
                        onClick={handleAddTag}
                        disabled={!tagInput.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 space-x-reverse mb-2">
                    <Checkbox 
                      id="featured" 
                      checked={newResource.featured}
                      onCheckedChange={(checked) => setNewResource(prev => ({ 
                        ...prev, 
                        featured: !!checked
                      }))}
                    />
                    <label
                      htmlFor="featured"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      מומלץ
                    </label>
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
          
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input 
                className="pl-10 pr-10" 
                placeholder="חיפוש חומרי לימוד" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute left-2 top-1/2 transform -translate-y-1/2"
                onClick={() => setShowFilterPanel(!showFilterPanel)}
              >
                <Filter className={`w-5 h-5 ${showFilterPanel ? 'text-primary-600' : 'text-gray-400'}`} />
              </Button>
            </div>
            
            {/* Active Filters */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-2 py-2">
                {activeFilters.map(filter => (
                  <Badge key={filter} variant="outline" className="flex items-center gap-1 px-3 py-1">
                    <span>
                      {filter === 'type' && 'סוג: ' + (typeof filters.type === 'string' ? filters.type : filters.type?.join(', '))}
                      {filter === 'category' && 'קטגוריה: ' + (typeof filters.category === 'string' ? filters.category : filters.category?.join(', '))}
                      {filter === 'difficulty' && 'רמת קושי: ' + filters.difficulty}
                      {filter === 'featured' && 'מומלץ'}
                      {filter === 'search' && 'חיפוש: ' + filters.search}
                    </span>
                    <button onClick={() => removeFilter(filter)} className="hover:bg-gray-100 rounded-full">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs">
                  נקה הכל
                </Button>
              </div>
            )}
            
            {/* Filter Panel */}
            {showFilterPanel && (
              <Card className="p-4">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="type">
                    <AccordionTrigger>סוג חומר</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-2">
                        {['pdf', 'audio', 'video', 'image', 'text', 'other'].map(type => (
                          <div key={type} className="flex items-center">
                            <Checkbox 
                              id={`type-${type}`}
                              checked={filters.type?.includes(type)}
                              onCheckedChange={(checked) => {
                                const currentTypes = Array.isArray(filters.type) ? [...filters.type] : filters.type ? [filters.type] : [];
                                if (checked) {
                                  applyFilter('type', [...currentTypes, type]);
                                } else {
                                  const newTypes = currentTypes.filter(t => t !== type);
                                  applyFilter('type', newTypes.length ? newTypes : null);
                                }
                              }}
                            />
                            <label htmlFor={`type-${type}`} className="mr-2 text-sm">
                              {type === "pdf" && "מסמכים"}
                              {type === "audio" && "קבצי שמע"}
                              {type === "video" && "סרטונים"}
                              {type === "image" && "תמונות"}
                              {type === "text" && "טקסטים"}
                              {type === "other" && "אחר"}
                            </label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="category">
                    <AccordionTrigger>קטגוריה</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-2">
                        {['mindfulness', 'exercises', 'assessments', 'readings', 'worksheets', 'general'].map(category => (
                          <div key={category} className="flex items-center">
                            <Checkbox 
                              id={`category-${category}`}
                              checked={filters.category?.includes(category)}
                              onCheckedChange={(checked) => {
                                const currentCategories = Array.isArray(filters.category) ? [...filters.category] : filters.category ? [filters.category] : [];
                                if (checked) {
                                  applyFilter('category', [...currentCategories, category]);
                                } else {
                                  const newCategories = currentCategories.filter(c => c !== category);
                                  applyFilter('category', newCategories.length ? newCategories : null);
                                }
                              }}
                            />
                            <label htmlFor={`category-${category}`} className="mr-2 text-sm">
                              {category === "mindfulness" && "מיינדפולנס"}
                              {category === "exercises" && "תרגילים"}
                              {category === "assessments" && "הערכות"}
                              {category === "readings" && "חומרי קריאה"}
                              {category === "worksheets" && "דפי עבודה"}
                              {category === "general" && "כללי"}
                            </label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="difficulty">
                    <AccordionTrigger>רמת קושי</AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-col gap-2">
                        {['beginner', 'intermediate', 'advanced'].map(level => (
                          <div key={level} className="flex items-center">
                            <Checkbox 
                              id={`difficulty-${level}`}
                              checked={filters.difficulty === level}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  applyFilter('difficulty', level);
                                } else {
                                  applyFilter('difficulty', null);
                                }
                              }}
                            />
                            <label htmlFor={`difficulty-${level}`} className="mr-2 text-sm">
                              {level === "beginner" && "מתחילים"}
                              {level === "intermediate" && "בינוני"}
                              {level === "advanced" && "מתקדם"}
                            </label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="featured">
                    <AccordionTrigger>מאפיינים נוספים</AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center">
                          <Checkbox 
                            id="featured"
                            checked={filters.featured === true}
                            onCheckedChange={(checked) => {
                              applyFilter('featured', checked ? true : null);
                            }}
                          />
                          <label htmlFor="featured" className="mr-2 text-sm">
                            מומלץ
                          </label>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            )}
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="all">
              <TabsList className="mb-6">
                <TabsTrigger value="all">הכל ({displayResources?.length || 0})</TabsTrigger>
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
                {!displayResources || displayResources.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    לא נמצאו חומרי לימוד
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayResources.map((resource) => (
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
            <div className="flex items-center mb-1">
              <h3 className="font-medium">{resource.title}</h3>
              {resource.featured && (
                <Badge className="mr-2 bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-300">
                  <Star className="w-3 h-3 mr-1" /> מומלץ
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {resource.category && (
                <Badge variant="outline" className="text-xs bg-gray-50">
                  {resource.category === "mindfulness" && "מיינדפולנס"}
                  {resource.category === "exercises" && "תרגילים"}
                  {resource.category === "assessments" && "הערכות"}
                  {resource.category === "readings" && "חומרי קריאה"}
                  {resource.category === "worksheets" && "דפי עבודה"}
                  {resource.category === "general" && "כללי"}
                </Badge>
              )}
              {resource.difficulty && (
                <Badge variant="outline" className="text-xs bg-gray-50">
                  {resource.difficulty === "beginner" && "מתחילים"}
                  {resource.difficulty === "intermediate" && "בינוני"}
                  {resource.difficulty === "advanced" && "מתקדם"}
                </Badge>
              )}
              {resource.durationMinutes && resource.durationMinutes > 0 && (
                <Badge variant="outline" className="text-xs bg-gray-50">
                  <Clock className="w-3 h-3 ml-1" />
                  {resource.durationMinutes} דקות
                </Badge>
              )}
            </div>
            <p className="text-gray-500 text-xs mb-2">
              נוסף בתאריך {formatDate(resource.createdAt)}
            </p>
            {resource.description && (
              <p className="text-gray-700 text-sm mb-3">{resource.description}</p>
            )}
            {resource.tags && resource.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {resource.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs bg-gray-50 px-2">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex space-x-2 space-x-reverse mt-2">
              <a 
                href={resource.fileUrl || '#'} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
              >
                {resource.fileUrl && (resource.type === "pdf" || resource.type === "audio") ? (
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
