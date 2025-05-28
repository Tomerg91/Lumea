import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Copy, ExternalLink, Share2, QrCode } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface BookingLinkGeneratorProps {
  className?: string;
}

const BookingLinkGenerator: React.FC<BookingLinkGeneratorProps> = ({ className }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [duration, setDuration] = useState('60');
  const [prefilledEmail, setPrefilledEmail] = useState('');
  const [prefilledName, setPrefilledName] = useState('');
  const [prefilledPhone, setPrefilledPhone] = useState('');

  const coachId = profile?.id || 'demo-coach';
  const baseUrl = window.location.origin;
  
  const generateBookingLink = () => {
    const params = new URLSearchParams();
    
    if (duration !== '60') params.append('duration', duration);
    if (prefilledEmail) params.append('email', prefilledEmail);
    if (prefilledName) {
      const [firstName, ...lastNameParts] = prefilledName.split(' ');
      if (firstName) params.append('firstName', firstName);
      if (lastNameParts.length > 0) params.append('lastName', lastNameParts.join(' '));
    }
    if (prefilledPhone) params.append('phone', prefilledPhone);

    const queryString = params.toString();
    return `${baseUrl}/book/${coachId}${queryString ? `?${queryString}` : ''}`;
  };

  const bookingLink = generateBookingLink();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(bookingLink);
      toast({
        title: 'Link Copied!',
        description: 'The booking link has been copied to your clipboard.',
      });
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy the link. Please copy it manually.',
        variant: 'destructive',
      });
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Book a Coaching Session',
          text: 'Schedule a coaching session with me',
          url: bookingLink,
        });
      } catch (error) {
        console.error('Failed to share link:', error);
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const openLink = () => {
    window.open(bookingLink, '_blank');
  };

  return (
    <Card className={`lumea-card ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Booking Link Generator
        </CardTitle>
        <CardDescription>
          Create a personalized booking link to share with clients
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="duration">Default Session Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="prefilledEmail">Pre-fill Email (Optional)</Label>
            <Input
              id="prefilledEmail"
              type="email"
              value={prefilledEmail}
              onChange={(e) => setPrefilledEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </div>

          <div>
            <Label htmlFor="prefilledName">Pre-fill Name (Optional)</Label>
            <Input
              id="prefilledName"
              value={prefilledName}
              onChange={(e) => setPrefilledName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div>
            <Label htmlFor="prefilledPhone">Pre-fill Phone (Optional)</Label>
            <Input
              id="prefilledPhone"
              type="tel"
              value={prefilledPhone}
              onChange={(e) => setPrefilledPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>

        {/* Generated Link */}
        <div>
          <Label htmlFor="bookingLink">Generated Booking Link</Label>
          <div className="flex gap-2">
            <Input
              id="bookingLink"
              value={bookingLink}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              title="Copy Link"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={shareLink} className="flex-1 min-w-[120px]">
            <Share2 className="h-4 w-4 mr-2" />
            Share Link
          </Button>
          <Button variant="outline" onClick={openLink} className="flex-1 min-w-[120px]">
            <ExternalLink className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button variant="outline" onClick={copyToClipboard} className="flex-1 min-w-[120px]">
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
        </div>

        {/* Usage Instructions */}
        <div className="bg-primary/10 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">How to use:</h4>
          <ul className="text-sm space-y-1 opacity-80">
            <li>• Share this link with clients via email, text, or social media</li>
            <li>• Clients can book sessions directly without creating an account</li>
            <li>• Pre-filled information saves time for returning clients</li>
            <li>• The link respects your availability settings and calendar integrations</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingLinkGenerator; 