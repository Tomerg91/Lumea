import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AudioRecorder, { RecordingData } from './AudioRecorder';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';

const AudioRecorderDemo: React.FC = () => {
  const { t } = useTranslation();
  const [recordings, setRecordings] = useState<RecordingData[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<RecordingData | null>(null);

  const handleRecordingComplete = (audioBlob: Blob, duration: number) => {
    const recordingData: RecordingData = {
      blob: audioBlob,
      url: URL.createObjectURL(audioBlob),
      duration,
      mimeType: audioBlob.type
    };
    
    setRecordings(prev => [...prev, recordingData]);
    console.log('Recording completed:', {
      duration,
      size: audioBlob.size,
      type: audioBlob.type
    });
  };

  const handleRecordingError = (error: string) => {
    console.error('Recording error:', error);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadRecording = (recording: RecordingData, index: number) => {
    const link = document.createElement('a');
    link.href = recording.url;
    link.download = `recording-${index + 1}.${recording.mimeType.split('/')[1]}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const playRecording = (recording: RecordingData) => {
    if (selectedRecording?.url === recording.url) {
      setSelectedRecording(null);
    } else {
      setSelectedRecording(recording);
    }
  };

  const clearRecordings = () => {
    recordings.forEach(recording => {
      URL.revokeObjectURL(recording.url);
    });
    setRecordings([]);
    setSelectedRecording(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Audio Recorder Demo
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          This demo showcases the AudioRecorder component with real-time waveform visualization, 
          multiple audio format support, and comprehensive error handling.
        </p>
      </div>

      {/* Basic Recorder */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Basic Audio Recorder</h2>
        <AudioRecorder
          onRecordingComplete={handleRecordingComplete}
          onRecordingError={handleRecordingError}
          maxDuration={300} // 5 minutes
          showWaveform={true}
        />
      </div>

      {/* Compact Recorder */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Compact Recorder (No Waveform)</h2>
        <AudioRecorder
          onRecordingComplete={handleRecordingComplete}
          onRecordingError={handleRecordingError}
          maxDuration={60} // 1 minute
          showWaveform={false}
          className="max-w-md mx-auto"
        />
      </div>

      {/* Recordings List */}
      {recordings.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              Recorded Audio Files ({recordings.length})
            </h2>
            <Button onClick={clearRecordings} variant="outline" size="sm">
              Clear All
            </Button>
          </div>
          
          <div className="grid gap-4">
            {recordings.map((recording, index) => (
              <div
                key={index}
                className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      Recording {index + 1}
                    </h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Duration: {formatDuration(recording.duration)}</p>
                      <p>Format: {recording.mimeType}</p>
                      <p>Size: {(recording.blob.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => playRecording(recording)}
                      variant={selectedRecording?.url === recording.url ? "secondary" : "outline"}
                      size="sm"
                    >
                      {selectedRecording?.url === recording.url ? 'Stop' : 'Play'}
                    </Button>
                    <Button
                      onClick={() => downloadRecording(recording, index)}
                      variant="outline"
                      size="sm"
                    >
                      Download
                    </Button>
                  </div>
                </div>
                
                {/* Audio Player */}
                {selectedRecording?.url === recording.url && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <audio
                      src={recording.url}
                      controls
                      autoPlay
                      className="w-full"
                      onEnded={() => setSelectedRecording(null)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technical Information */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Technical Features</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h3 className="font-medium text-gray-800 mb-2">Browser Compatibility</h3>
            <ul className="space-y-1">
              <li>• WebM with Opus codec (Chrome, Firefox)</li>
              <li>• MP4 audio (Safari, Edge)</li>
              <li>• OGG with Opus (Firefox)</li>
              <li>• WAV fallback (older browsers)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-800 mb-2">Features</h3>
            <ul className="space-y-1">
              <li>• Real-time waveform visualization</li>
              <li>• Pause/resume functionality</li>
              <li>• Automatic format detection</li>
              <li>• Maximum duration limits</li>
              <li>• Comprehensive error handling</li>
              <li>• Mobile optimization</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Usage Instructions */}
      <Alert variant="info">
        <div className="space-y-2">
          <p className="font-medium">How to use:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Click "Start Recording" to begin (browser will request microphone permission)</li>
            <li>Speak into your microphone - you'll see the waveform respond</li>
            <li>Use "Pause" to temporarily stop and "Resume" to continue</li>
            <li>Click "Stop" when finished or wait for the maximum duration</li>
            <li>Your recording will appear in the list below with playback and download options</li>
          </ol>
        </div>
      </Alert>
    </div>
  );
};

export default AudioRecorderDemo; 