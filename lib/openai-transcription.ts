import { Platform } from 'react-native';

const OPENAI_API_KEY = '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';

export interface TranscriptionCallback {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (error: Error) => void;
}

export class OpenAIRealtimeTranscription {
  private ws: WebSocket | null = null;
  private callbacks: TranscriptionCallback | null = null;
  private isConnected = false;

  async connect(callbacks: TranscriptionCallback): Promise<void> {
    this.callbacks = callbacks;

    try {
      console.log('Connecting to OpenAI Realtime API...');
      
      this.ws = new WebSocket(
        'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01'
      );

      this.ws.onopen = () => {
        console.log('Connected to OpenAI Realtime API');
        this.isConnected = true;
        
        this.ws?.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'You are a transcription assistant. Transcribe all audio accurately.',
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
          },
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message:', data.type);

          if (data.type === 'conversation.item.input_audio_transcription.completed') {
            this.callbacks?.onTranscript(data.transcript, true);
          } else if (data.type === 'conversation.item.input_audio_transcription.delta') {
            this.callbacks?.onTranscript(data.delta, false);
          } else if (data.type === 'response.audio_transcript.delta') {
            this.callbacks?.onTranscript(data.delta, false);
          } else if (data.type === 'response.audio_transcript.done') {
            this.callbacks?.onTranscript(data.transcript, true);
          } else if (data.type === 'error') {
            this.callbacks?.onError(new Error(data.error?.message || 'Unknown error'));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.callbacks?.onError(new Error('WebSocket connection error'));
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.isConnected = false;
      };
    } catch (error) {
      console.error('Failed to connect to OpenAI:', error);
      throw error;
    }
  }

  sendAudio(audioData: string): void {
    if (!this.isConnected || !this.ws) {
      console.warn('WebSocket not connected');
      return;
    }

    try {
      this.ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: audioData,
      }));
    } catch (error) {
      console.error('Error sending audio:', error);
      this.callbacks?.onError(error as Error);
    }
  }

  commitAudio(): void {
    if (!this.isConnected || !this.ws) {
      return;
    }

    try {
      this.ws.send(JSON.stringify({
        type: 'input_audio_buffer.commit',
      }));

      this.ws.send(JSON.stringify({
        type: 'response.create',
        response: {
          modalities: ['text'],
          instructions: 'Please transcribe the audio.',
        },
      }));
    } catch (error) {
      console.error('Error committing audio:', error);
      this.callbacks?.onError(error as Error);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  isActive(): boolean {
    return this.isConnected;
  }
}

export async function transcribeAudioFile(uri: string): Promise<string> {
  try {
    console.log('Starting transcription for:', uri);
    
    const formData = new FormData();
    
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append('file', blob, 'recording.webm');
    } else {
      const uriParts = uri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      
      const audioFile = {
        uri,
        name: `recording.${fileType}`,
        type: `audio/${fileType}`,
      } as any;
      
      formData.append('file', audioFile);
    }

    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transcription failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Transcription result:', data);
    
    return data.text || 'No transcription available';
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}
