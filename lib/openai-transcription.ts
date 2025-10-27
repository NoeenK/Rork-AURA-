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

    console.log('Sending request to OpenAI Whisper API...');
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
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

export interface CalendarEvent {
  title: string;
  date: string;
  time?: string;
  description: string;
  participants?: string[];
}

export async function extractCalendarEvents(transcript: string): Promise<CalendarEvent[]> {
  try {
    console.log('Extracting calendar events from transcript...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that extracts calendar events from conversation transcripts. 
Extract any mentions of events, meetings, appointments, or plans with dates and times. 
Return ONLY a valid JSON array of events. Each event should have: title, date (YYYY-MM-DD format), time (optional, HH:MM format), description, and participants (optional array of names).
If no events are found, return an empty array [].
Do not include any markdown formatting or explanation, just the raw JSON array.`
          },
          {
            role: 'user',
            content: `Extract calendar events from this transcript:\n\n${transcript}\n\nCurrent date: ${new Date().toISOString()}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    console.log('Calendar events response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Calendar events error response:', errorText);
      return [];
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '[]';
    console.log('Calendar events raw response:', content);
    
    const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const events = JSON.parse(cleanedContent);
    console.log('Extracted events:', events);
    
    return Array.isArray(events) ? events : [];
  } catch (error) {
    console.error('Calendar event extraction error:', error);
    return [];
  }
}

export interface AuraSummary {
  overview: string;
  tasks: string[];
}

export async function generateAuraSummary(transcript: string): Promise<AuraSummary> {
  try {
    console.log('Generating AURA summary for transcript...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are AURA, an AI assistant that creates insightful summaries of voice recordings. 
Create a JSON object with two fields:
1. "overview": A concise 2-3 sentence overview of the conversation
2. "tasks": An array of actionable tasks or to-dos mentioned (empty array if none)
Return ONLY valid JSON without markdown formatting.`
          },
          {
            role: 'user',
            content: `Analyze this transcript and provide an overview and tasks:\n\n${transcript}`
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    console.log('AURA summary response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AURA summary error response:', errorText);
      throw new Error(`AURA summary generation failed: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';
    console.log('AURA summary raw response:', content);
    
    const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const summary = JSON.parse(cleanedContent);
    console.log('AURA summary generated successfully');
    
    return {
      overview: summary.overview || 'No overview available',
      tasks: Array.isArray(summary.tasks) ? summary.tasks : [],
    };
  } catch (error) {
    console.error('AURA summary generation error:', error);
    return {
      overview: `Recording from ${new Date().toLocaleDateString()}`,
      tasks: [],
    };
  }
}

export async function generateSummary(transcript: string): Promise<string> {
  try {
    console.log('Generating summary for transcript...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that creates concise, meaningful summaries of voice recordings. Create a summary that captures the key points and main ideas.'
          },
          {
            role: 'user',
            content: `Please create a concise summary of the following transcript:\n\n${transcript}`
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    console.log('Summary response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Summary error response:', errorText);
      throw new Error(`Summary generation failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Summary generated successfully');
    
    return data.choices[0]?.message?.content || 'Summary not available';
  } catch (error) {
    console.error('Summary generation error:', error);
    return `Recording from ${new Date().toLocaleDateString()}`;
  }
}
