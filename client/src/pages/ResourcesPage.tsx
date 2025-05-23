import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Resource, fetchResources } from '@/services/resourceService';

const ResourcesPage = () => {
  const { toast } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadResources = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedResources = await fetchResources();
        setResources(fetchedResources);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load resources');
        toast({
          title: 'Error',
          description: 'Could not fetch resources. Displaying mock data or an empty list.',
          variant: 'destructive',
        });
      }
      setIsLoading(false);
    };

    loadResources();
  }, [toast]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto flex justify-center items-center h-[calc(100vh-200px)]">
          <p className="text-xl">Loading resources...</p>
          {/* You can add a spinner component here */}
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto flex flex-col justify-center items-center h-[calc(100vh-200px)]">
          <p className="text-xl text-red-500">Error: {error}</p>
          <p>Please try refreshing the page. If the issue persists, the backend might be unavailable.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto animate-fade-in">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-playfair mb-2">Resources</h1>
          <p className="text-muted-foreground">Helpful articles, videos, and tools for your journey.</p>
        </header>

        {resources.length === 0 && !isLoading && (
          <div className="text-center py-10">
            <p className="text-xl text-muted-foreground">No resources available at the moment.</p>
            <p className="text-sm text-muted-foreground">Please check back later or contact support if you believe this is an error.</p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <Card key={resource.id} className="lumea-card flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl font-playfair">{resource.title}</CardTitle>
                <CardDescription className="capitalize text-lumea-orange">{resource.type}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                {
                  resource.type === 'video' && resource.content.startsWith('http') ? (
                    <a 
                      href={resource.content} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-lumea-profile hover:underline block truncate"
                    >
                      Watch Video: {resource.content}
                    </a>
                  ) : (
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {resource.content.length > 150 
                        ? `${resource.content.substring(0, 147)}...` 
                        : resource.content}
                    </p>
                  )
                }
              </CardContent>
              {/* Add a CardFooter if there are actions like 'View More' or 'Save' */}
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default ResourcesPage; 