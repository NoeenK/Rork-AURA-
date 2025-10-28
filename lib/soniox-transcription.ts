import { Platform } from 'react-native';

const SONIOX_API_KEY = '14f5b7c577d9b2c6f1c29351700ec4c9f233684dfdf27f67909a32262c896bde';
const SONIOX_WEBSOCKET_URL = 'wss://stt-rt.soniox.com/transcribe-websocket';

export interface TranscriptionCallback {
  onTranscript: (text: string, isFinal: boolean, speaker?: string) => void;
  onError: (error: Error) => void;
}

export interface SpeakerSegment {
  speaker: string;
  text: string;
  startTime?: number;
  endTime?: number;
}

export class SonioxRealtimeTranscription {
  private ws: WebSocket | null = null;
  private callbacks: TranscriptionCallback | null = null;
  private isConnected = false;

  async connect(callbacks: TranscriptionCallback): Promise<void> {
    this.callbacks = callbacks;

    try {
      console.log('Connecting to Soniox WebSocket API...');
      
      const wsUrl = SONIOX_WEBSOCKET_URL + '?api_key=' + SONIOX_API_KEY;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Connected to Soniox WebSocket API');
        this.isConnected = true;
        
        this.ws?.send(JSON.stringify({
          api_key: SONIOX_API_KEY,
          model: 'stt-rt-preview',
          audio_format: 'pcm_s16le',
          sample_rate: 16000,
          num_channels: 1,
          enable_speaker_diarization: true,
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message from Soniox:', data);

          if (data.error_code) {
            this.callbacks?.onError(new Error(data.error_message || 'Unknown error'));
            return;
          }

          if (data.tokens && data.tokens.length > 0) {
            const hasFinal = data.tokens.some((t: any) => t.is_final);
            const text = data.tokens.map((t: any) => t.text).join(' ');
            const speaker = data.tokens[0]?.speaker || undefined;
            this.callbacks?.onTranscript(text, hasFinal, speaker);
          }
        } catch (error) {
          console.error('Error parsing Soniox message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('Soniox WebSocket error:', error);
        this.callbacks?.onError(new Error('WebSocket connection error'));
      };

      this.ws.onclose = () => {
        console.log('Soniox WebSocket connection closed');
        this.isConnected = false;
      };
    } catch (error) {
      console.error('Failed to connect to Soniox:', error);
      throw error;
    }
  }

  sendAudio(audioData: string | ArrayBuffer): void {
    if (!this.isConnected || !this.ws) {
      console.warn('WebSocket not connected');
      return;
    }

    try {
      if (typeof audioData === 'string') {
        const binaryData = atob(audioData);
        const bytes = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i);
        }
        this.ws.send(bytes.buffer);
      } else {
        this.ws.send(audioData);
      }
    } catch (error) {
      console.error('Error sending audio to Soniox:', error);
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

export async function transcribeAudioFile(uri: string): Promise<{
  transcript: string;
  speakers: SpeakerSegment[];
}> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Transcribing audio file with Soniox via WebSocket:', uri);
      
      let audioBlob: Blob;
      let audioFormat = 'auto';
      
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        audioBlob = await response.blob();
        audioFormat = audioBlob.type.includes('webm') ? 'webm' : 'auto';
      } else {
        const response = await fetch(uri);
        audioBlob = await response.blob();
        const fileType = uri.split('.').pop()?.toLowerCase() || '';
        if (fileType === 'm4a') audioFormat = 'm4a';
        else if (fileType === 'wav') audioFormat = 'wav';
        else if (fileType === 'mp3') audioFormat = 'mp3';
      }

      const arrayBuffer = await audioBlob.arrayBuffer();
      console.log('Audio file loaded, size:', arrayBuffer.byteLength, 'format:', audioFormat);

      const ws = new WebSocket(SONIOX_WEBSOCKET_URL);
      const speakers: SpeakerSegment[] = [];
      let fullTranscript = '';
      const tokens: any[] = [];

      ws.onopen = () => {
        console.log('WebSocket connected for file transcription');
        
        ws.send(JSON.stringify({
          api_key: SONIOX_API_KEY,
          model: 'stt-rt-preview',
          audio_format: audioFormat,
          enable_speaker_diarization: true,
        }));

        console.log('Sending audio data...');
        ws.send(arrayBuffer);
        
        console.log('Sending empty frame to finish...');
        ws.send(new ArrayBuffer(0));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received from Soniox:', data);

          if (data.error_code) {
            ws.close();
            reject(new Error(data.error_message || 'Transcription error'));
            return;
          }

          if (data.tokens && data.tokens.length > 0) {
            tokens.push(...data.tokens);
          }

          if (data.finished) {
            console.log('Transcription finished, processing tokens...');
            
            let currentSpeaker = '';
            let currentText = '';
            
            tokens.forEach((token: any) => {
              if (!token.is_final) return;
              
              const speaker = token.speaker || 'Speaker 1';
              const text = token.text || '';
              
              if (speaker !== currentSpeaker && currentText) {
                speakers.push({
                  speaker: currentSpeaker,
                  text: currentText.trim(),
                  startTime: token.start_ms,
                  endTime: token.end_ms,
                });
                currentText = '';
              }
              
              currentSpeaker = speaker;
              currentText += (currentText ? ' ' : '') + text;
              fullTranscript += (fullTranscript ? ' ' : '') + text;
            });
            
            if (currentText) {
              speakers.push({
                speaker: currentSpeaker,
                text: currentText.trim(),
              });
            }
            
            ws.close();
            resolve({
              transcript: fullTranscript || 'No transcription available',
              speakers: speakers.length > 0 ? speakers : [{ speaker: 'Speaker 1', text: fullTranscript }],
            });
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(new Error('WebSocket connection error'));
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
      };

      setTimeout(() => {
        if (ws.readyState !== WebSocket.CLOSED) {
          ws.close();
          reject(new Error('Transcription timeout'));
        }
      }, 120000);
      
    } catch (error) {
      console.error('Transcription error:', error);
      reject(error);
    }
  });
}

export async function transcribeAudioChunk(uri: string): Promise<string> {
  try {
    console.log('Transcribing audio chunk with Soniox:', uri);
    
    const result = await transcribeAudioFile(uri);
    return result.transcript;
  } catch (error) {
    console.error('Chunk transcription error:', error);
    return '';
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
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const systemContent = 'You are an AI assistant that extracts calendar events from conversation transcripts. ' +
      '\n\nExtract any mentions of events, meetings, appointments, or plans with dates and times.' +
      '\n\nIMPORTANT PARSING RULES:' +
      '\n- "tomorrow" means ' + tomorrow +
      '\n- "today" means ' + today +
      '\n- "tonight" means ' + today +
      '\n- "this evening" means ' + today +
      '\n- Convert relative dates ("next Monday", "in 2 days") to YYYY-MM-DD format' +
      '\n- Parse times like "2pm", "2:00", "14:00" to HH:MM 24-hour format (e.g., "14:00")' +
      '\n- Extract participant names mentioned (e.g., "with Mark", "Mark and I")' +
      '\n- Infer event type from context (e.g., "tennis" → "Tennis with [name]")' +
      '\n\nReturn ONLY a valid JSON array of events. Each event must have:' +
      '\n- title: Brief description of the event (e.g., "Tennis with Mark")' +
      '\n- date: YYYY-MM-DD format' +
      '\n- time: HH:MM 24-hour format (optional if time not mentioned)' +
      '\n- description: Full context from transcript' +
      '\n- participants: Array of names mentioned (optional)' +
      '\n\nIf no events are found, return an empty array [].' +
      '\nDo not include any markdown formatting or explanation, just the raw JSON array.' +
      '\n\nCurrent date/time for reference: ' + now.toISOString() +
      '\nDay of week: ' + now.toLocaleDateString('en-US', { weekday: 'long' });
    
    const { generateText } = await import('@rork/toolkit-sdk');
    const response = await generateText({
      messages: [
        {
          role: 'user',
          content: systemContent + '\n\nExtract calendar events from this transcript:\n\n' + transcript
        }
      ],
    });

    console.log('Calendar events raw response:', response);
    
    const cleanedContent = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
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

export async function generateAuraSummary(transcript: string, speakers?: SpeakerSegment[]): Promise<AuraSummary> {
  try {
    console.log('Generating AURA summary for transcript...');
    
    let enrichedTranscript = transcript;
    if (speakers && speakers.length > 1) {
      enrichedTranscript = speakers.map(s => s.speaker + ': ' + s.text).join('\n');
    }
    
    const speakerText = speakers && speakers.length > 1 ? ' (mention different speakers if present)' : '';
    const systemContent = 'You are AURA, an AI assistant that creates insightful summaries of voice recordings. ' +
      'Create a JSON object with two fields:\n' +
      '1. "overview": A concise 2-3 sentence overview of the conversation' + speakerText + '\n' +
      '2. "tasks": An array of actionable tasks or to-dos mentioned (empty array if none)\n' +
      'Return ONLY valid JSON without markdown formatting.';
    
    const { generateText } = await import('@rork/toolkit-sdk');
    const response = await generateText({
      messages: [
        {
          role: 'user',
          content: systemContent + '\n\nAnalyze this transcript and provide an overview and tasks:\n\n' + enrichedTranscript
        }
      ],
    });

    console.log('AURA summary raw response:', response);
    
    const cleanedContent = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const summary = JSON.parse(cleanedContent);
    console.log('AURA summary generated successfully');
    
    return {
      overview: summary.overview || 'No overview available',
      tasks: Array.isArray(summary.tasks) ? summary.tasks : [],
    };
  } catch (error) {
    console.error('AURA summary generation error:', error);
    return {
      overview: 'Recording from ' + new Date().toLocaleDateString(),
      tasks: [],
    };
  }
}

export async function generateSummary(transcript: string, speakers?: SpeakerSegment[]): Promise<string> {
  try {
    console.log('Generating summary for transcript...');
    
    let enrichedTranscript = transcript;
    if (speakers && speakers.length > 1) {
      enrichedTranscript = speakers.map(s => s.speaker + ': ' + s.text).join('\n');
    }
    
    const speakerText = speakers && speakers.length > 1 ? ' When multiple speakers are present, mention the conversation dynamics.' : '';
    const systemContent = 'You are a helpful assistant that creates concise, meaningful summaries of voice recordings. ' +
      'Create a summary that captures the key points and main ideas.' + speakerText;
    
    const { generateText } = await import('@rork/toolkit-sdk');
    const response = await generateText({
      messages: [
        {
          role: 'user',
          content: systemContent + '\n\nPlease create a concise summary of the following transcript:\n\n' + enrichedTranscript
        }
      ],
    });

    console.log('Summary generated successfully');
    
    return response || 'Summary not available';
  } catch (error) {
    console.error('Summary generation error:', error);
    return 'Recording from ' + new Date().toLocaleDateString();
  }
}
