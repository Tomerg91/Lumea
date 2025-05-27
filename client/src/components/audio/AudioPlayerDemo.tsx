import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AudioRecorder, { RecordingData } from './AudioRecorder';
import AudioPlayer from './AudioPlayer';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';

const AudioPlayerDemo: React.FC = () => {
  const { t } = useTranslation();
  const [recordings, setRecordings] = useState<RecordingData[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<RecordingData | null>(null);
  
  // Player configuration options
  const [showWaveform, setShowWaveform] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [showSpeed, setShowSpeed] = useState(true);
  const [showDownload, setShowDownload] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);

  const handleRecordingComplete = (audioBlob: Blob, duration: number) => {
    const recordingData: RecordingData = {
      blob: audioBlob,
      url: URL.createObjectURL(audioBlob),
      duration,
      mimeType: audioBlob.type
    };
    
    setRecordings(prev => [...prev, recordingData]);
    setSelectedRecording(recordingData);
    console.log('Recording completed:', {
      duration,
      size: audioBlob.size,
      type: audioBlob.type
    });
  };

  const handleRecordingError = (error: string) => {
    console.error('Recording error:', error);
  };

  const handlePlayerTimeUpdate = (currentTime: number) => {
    // console.log('Current time:', currentTime);
  };

  const handlePlayerEnded = () => {
    console.log('Playback ended');
  };

  const handlePlayerError = (error: string) => {
    console.error('Player error:', error);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const clearRecordings = () => {
    recordings.forEach(recording => {
      URL.revokeObjectURL(recording.url);
    });
    setRecordings([]);
    setSelectedRecording(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Audio Player Demo
        </h1>
        <p className="text-gray-600 max-w-3xl mx-auto">
          This demo showcases the AudioPlayer component with comprehensive playback controls, 
          waveform visualization, and configurable features. Record audio first, then test 
          the playback interface.
        </p>
      </div>

      {/* Recording Section */}
      <Card>
        <CardHeader>
          <CardTitle>Audio Recording</CardTitle>
        </CardHeader>
        <CardContent>
          <AudioRecorder
            onRecordingComplete={handleRecordingComplete}
            onRecordingError={handleRecordingError}
            maxDuration={180} // 3 minutes
            showWaveform={true}
          />
        </CardContent>
      </Card>

      {/* Player Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Player Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="waveform"
                checked={showWaveform}
                onCheckedChange={setShowWaveform}
              />
              <label htmlFor="waveform" className="text-sm font-medium">
                Show Waveform
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="controls"
                checked={showControls}
                onCheckedChange={setShowControls}
              />
              <label htmlFor="controls" className="text-sm font-medium">
                Show Controls
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="volume"
                checked={showVolume}
                onCheckedChange={setShowVolume}
              />
              <label htmlFor="volume" className="text-sm font-medium">
                Volume Control
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="speed"
                checked={showSpeed}
                onCheckedChange={setShowSpeed}
              />
              <label htmlFor="speed" className="text-sm font-medium">
                Speed Control
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="download"
                checked={showDownload}
                onCheckedChange={setShowDownload}
              />
              <label htmlFor="download" className="text-sm font-medium">
                Download Button
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="autoplay"
                checked={autoPlay}
                onCheckedChange={setAutoPlay}
              />
              <label htmlFor="autoplay" className="text-sm font-medium">
                Auto Play
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio Player Section */}
      {selectedRecording && (
        <Card>
          <CardHeader>
            <CardTitle>Audio Player</CardTitle>
          </CardHeader>
          <CardContent>
            <AudioPlayer
              audioBlob={selectedRecording.blob}
              audioUrl={selectedRecording.url}
              duration={selectedRecording.duration}
              showWaveform={showWaveform}
              showControls={showControls}
              showVolume={showVolume}
              showSpeed={showSpeed}
              showDownload={showDownload}
              autoPlay={autoPlay}
              onTimeUpdate={handlePlayerTimeUpdate}
              onEnded={handlePlayerEnded}
              onError={handlePlayerError}
            />
          </CardContent>
        </Card>
      )}

      {/* Recordings List */}
      {recordings.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Recorded Audio Files ({recordings.length})</CardTitle>
              <Button onClick={clearRecordings} variant="outline" size="sm">
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recordings.map((recording, index) => (
                <div key={index}>
                  <div
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedRecording?.url === recording.url
                        ? 'border-lumea-primary bg-lumea-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedRecording(recording)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          Recording {index + 1}
                          {selectedRecording?.url === recording.url && ' (Active)'}
                        </h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Duration: {formatDuration(recording.duration)}</p>
                          <p>Format: {recording.mimeType}</p>
                          <p>Size: {(recording.blob.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRecording(recording);
                          }}
                          variant={selectedRecording?.url === recording.url ? "default" : "outline"}
                          size="sm"
                        >
                          {selectedRecording?.url === recording.url ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {index < recordings.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Recording Audio:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Click "Start Recording" to begin capturing audio</li>
              <li>Use pause/resume buttons during recording</li>
              <li>Click "Stop" to finish recording</li>
              <li>The waveform shows real-time audio levels</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Playing Audio:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Click on any recording to select it for playback</li>
              <li>Use the waveform to seek to specific positions</li>
              <li>Control playback speed (0.5x to 2x)</li>
              <li>Adjust volume or mute audio</li>
              <li>Skip forward/backward by 10 seconds</li>
              <li>Download recordings for external use</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Player Features:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Interactive waveform visualization with progress tracking</li>
              <li>Click-to-seek on both waveform and progress bar</li>
              <li>Responsive design for mobile and desktop</li>
              <li>Cross-browser audio format support</li>
              <li>Real-time playback state indicators</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AudioPlayerDemo; 