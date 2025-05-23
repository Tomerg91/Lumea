import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  BookOpen, 
  Video, 
  FileText, 
  Search, 
  Filter, 
  Play,
  Download,
  ExternalLink,
  Star,
  Clock
} from 'lucide-react';

interface Resource {
  id: string;
  title: string;
  type: 'article' | 'video' | 'worksheet' | 'guide';
  description: string;
  content?: string;
  url?: string;
  duration?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  rating: number;
  createdAt: string;
}

const ResourcesPage = () => {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  // Mock data - replace with actual API calls
  useEffect(() => {
    const mockResources: Resource[] = [
      {
        id: '1',
        title: 'Goal Setting Fundamentals',
        type: 'article',
        description: 'Learn the basics of setting and achieving meaningful goals in your personal and professional life.',
        content: 'A comprehensive guide to SMART goals and implementation strategies...',
        duration: '5 min read',
        difficulty: 'beginner',
        tags: ['goals', 'productivity', 'planning'],
        rating: 4.8,
        createdAt: '2024-01-15'
      },
      {
        id: '2',
        title: 'Mindfulness Meditation for Beginners',
        type: 'video',
        description: 'A guided meditation session to help you start your mindfulness journey.',
        url: 'https://example.com/meditation-video',
        duration: '15 min',
        difficulty: 'beginner',
        tags: ['mindfulness', 'meditation', 'wellbeing'],
        rating: 4.9,
        createdAt: '2024-01-10'
      },
      {
        id: '3',
        title: 'Personal Values Assessment',
        type: 'worksheet',
        description: 'Discover your core values with this comprehensive self-assessment tool.',
        content: 'Interactive worksheet to identify and prioritize your personal values...',
        duration: '20 min',
        difficulty: 'intermediate',
        tags: ['values', 'self-discovery', 'assessment'],
        rating: 4.7,
        createdAt: '2024-01-05'
      },
      {
        id: '4',
        title: 'Building Resilience in Challenging Times',
        type: 'guide',
        description: 'Advanced strategies for developing mental resilience and emotional strength.',
        content: 'Step-by-step guide to building psychological resilience...',
        duration: '30 min read',
        difficulty: 'advanced',
        tags: ['resilience', 'mental-health', 'coping'],
        rating: 4.6,
        createdAt: '2024-01-01'
      }
    ];

    setTimeout(() => {
      setResources(mockResources);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || resource.type === filterType;
    const matchesDifficulty = filterDifficulty === 'all' || resource.difficulty === filterDifficulty;
    
    return matchesSearch && matchesType && matchesDifficulty;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'article': return <FileText className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      case 'worksheet': return <BookOpen className="w-5 h-5" />;
      case 'guide': return <BookOpen className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'article': return 'bg-blue-100 text-blue-800';
      case 'video': return 'bg-red-100 text-red-800';
      case 'worksheet': return 'bg-green-100 text-green-800';
      case 'guide': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-background py-8">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-white/20 rounded-lg w-1/4"></div>
            <div className="grid gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-white/20 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-background py-8 ${isRTL ? 'rtl-layout' : ''}`}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gradient-purple mb-2">
            Resources
          </h1>
          <p className="text-gray-600">
            {profile?.role === 'coach' 
              ? 'Curated resources to enhance your coaching practice'
              : 'Tools and materials to support your personal growth journey'
            }
          </p>
        </div>

        {/* Search and Filters */}
        <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 ${isRTL ? 'rtl-grid' : ''}`}>
          <div className="relative md:col-span-2">
            <Search className={`absolute top-3 w-4 h-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full glass-input ${isRTL ? 'pr-10' : 'pl-10'}`}
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="glass-input"
          >
            <option value="all">All Types</option>
            <option value="article">Articles</option>
            <option value="video">Videos</option>
            <option value="worksheet">Worksheets</option>
            <option value="guide">Guides</option>
          </select>

          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="glass-input"
          >
            <option value="all">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        {/* Resources Grid */}
        {filteredResources.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-lavender rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm 
                ? 'No resources found'
                : 'No resources available'
              }
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? 'Try adjusting your search terms or filters'
                : 'Resources will be added soon'
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredResources.map((resource) => (
              <div key={resource.id} className="card-lumea hover-lift transition-all duration-300">
                {/* Resource Header */}
                <div className={`flex items-start justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center space-x-2 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className={`p-2 rounded-lg ${getTypeColor(resource.type)}`}>
                      {getTypeIcon(resource.type)}
                    </div>
                    <div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(resource.type)}`}>
                        {resource.type}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(resource.difficulty)}`}>
                    {resource.difficulty}
                  </span>
                </div>

                {/* Resource Content */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">{resource.title}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                    {resource.description}
                  </p>
                  
                  {/* Meta Information */}
                  <div className={`flex items-center justify-between text-xs text-gray-500 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <Clock className="w-3 h-3" />
                      <span>{resource.duration}</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>{resource.rating}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className={`flex flex-wrap gap-1 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {resource.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <button className="btn-primary w-full flex items-center justify-center space-x-2">
                  {resource.type === 'video' ? (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Watch Video</span>
                    </>
                  ) : resource.url ? (
                    <>
                      <ExternalLink className="w-4 h-4" />
                      <span>Open Resource</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Access Resource</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourcesPage; 