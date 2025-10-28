import { Platform } from 'react-native';

const SONIOX_API_KEY = '14f5b7c577d9b2c6f1c29351700ec4c9f233684dfdf27f67909a32262c896bde';
const SONIOX_WEBSOCKET_URL = 'wss://stt-rt.soniox.com/transcribe-websocket';

export interface Token {
  text: string;
  isFinal: boolean;
  speaker?: string;
  language?: string;
  translationStatus?: string;
  translation?: string;
}

export interface TranscriptionCallback {
  onTranscript: (text: string, isFinal: boolean, speaker?: string) => void;
  onError: (error: Error) => void;
  onTokens?: (tokens: Token[]) => void;
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
  private isConfigured = false;
  private currentTokens: string[] = [];
  private finalTokens: string[] = [];
  private keepaliveInterval: any = null;
  private audioQueue: ArrayBuffer[] = [];
  private allTokens: Token[] = [];

  async connect(callbacks: TranscriptionCallback): Promise<void> {
    this.callbacks = callbacks;

    try {
      console.log('Connecting to Soniox WebSocket API...');
      
      this.ws = new WebSocket(SONIOX_WEBSOCKET_URL);

      this.ws.onopen = () => {
        console.log('Connected to Soniox WebSocket API');
        this.isConnected = true;
        
        const config = {
          api_key: SONIOX_API_KEY,
          model: 'stt-rt-v3',
          audio_format: 'pcm_s16le',
          sample_rate: 16000,
          num_channels: 1,
          enable_speaker_diarization: true,
          enable_language_identification: true,
          enable_endpoint_detection: true,
        };
        
        console.log('Sending configuration:', config);
        this.ws?.send(JSON.stringify(config));
        
        this.isConfigured = true;
        console.log('Configuration sent, ready to stream audio');
        setTimeout(() => {
          this.processAudioQueue();
        }, 10);
        
        this.keepaliveInterval = setInterval(() => {
          if (this.ws && this.isConnected) {
            try {
              this.ws.send(JSON.stringify({ type: 'keepalive' }));
            } catch (error) {
              console.error('Keepalive error:', error);
            }
          }
        }, 15000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message from Soniox:', data);

          if (data.error_code) {
            console.error('Soniox error:', data.error_message);
            this.callbacks?.onError(new Error(data.error_message || 'Unknown error'));
            return;
          }

          if (data.tokens && data.tokens.length > 0) {
            const finalTokens = data.tokens.filter((t: any) => t.is_final);
            const nonFinalTokens = data.tokens.filter((t: any) => !t.is_final);
            
            const newTokens: Token[] = data.tokens.map((t: any) => ({
              text: t.text,
              isFinal: t.is_final,
              speaker: t.speaker ? 'Speaker ' + t.speaker : undefined,
              language: t.language,
              translationStatus: t.translation_status,
              translation: t.translation,
            }));
            
            if (finalTokens.length > 0) {
              newTokens.forEach((token) => {
                if (token.isFinal) {
                  this.allTokens.push(token);
                }
              });
            } else {
              const tempTokens = [...this.allTokens, ...newTokens.filter((t) => !t.isFinal)];
              this.callbacks?.onTokens?.(tempTokens);
            }
            
            if (finalTokens.length > 0) {
              const speaker = finalTokens[0]?.speaker ? 'Speaker ' + finalTokens[0].speaker : undefined;
              const mergedText = this.mergeTokens(finalTokens);
              this.finalTokens.push(...finalTokens.map((t: any) => t.text));
              this.callbacks?.onTranscript(mergedText, true, speaker);
              this.callbacks?.onTokens?.(this.allTokens);
            }
            
            if (nonFinalTokens.length > 0) {
              const speaker = nonFinalTokens[0]?.speaker ? 'Speaker ' + nonFinalTokens[0].speaker : undefined;
              const mergedNonFinal = this.mergeTokens(nonFinalTokens);
              const fullText = [...this.finalTokens, mergedNonFinal].join(' ');
              this.callbacks?.onTranscript(fullText, false, speaker);
            }
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

  private processAudioQueue(): void {
    while (this.audioQueue.length > 0 && this.isConfigured && this.isConnected && this.ws) {
      const audioData = this.audioQueue.shift();
      if (audioData) {
        try {
          this.ws.send(audioData);
        } catch (error) {
          console.error('Error sending queued audio:', error);
        }
      }
    }
  }

  sendAudio(audioData: string | ArrayBuffer): void {
    if (!this.isConnected || !this.ws) {
      console.warn('WebSocket not connected');
      return;
    }

    try {
      let buffer: ArrayBuffer;
      
      if (typeof audioData === 'string') {
        const binaryData = atob(audioData);
        const bytes = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i);
        }
        buffer = bytes.buffer;
      } else {
        buffer = audioData;
      }
      
      if (!this.isConfigured) {
        this.audioQueue.push(buffer);
      } else {
        this.ws.send(buffer);
      }
    } catch (error) {
      console.error('Error sending audio to Soniox:', error);
      this.callbacks?.onError(error as Error);
    }
  }

  disconnect(): void {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
    }
    
    if (this.ws) {
      console.log('Sending empty frame to finalize...');
      try {
        this.ws.send(new ArrayBuffer(0));
      } catch (error) {
        console.error('Error sending empty frame:', error);
      }
      
      setTimeout(() => {
        if (this.ws) {
          this.ws.close();
          this.ws = null;
          this.isConnected = false;
          this.isConfigured = false;
        }
      }, 1000);
    }
  }

  isActive(): boolean {
    return this.isConnected;
  }

  private mergeTokens(tokens: any[]): string {
    let mergedText = '';
    tokens.forEach((token, i) => {
      const text = token.text;
      
      if (i > 0 && !mergedText.endsWith(' ') && /^[a-z0-9]/i.test(text) && !text.startsWith(' ')) {
        mergedText += text;
      } else {
        mergedText += (mergedText === '' ? '' : ' ') + text;
      }
    });
    return mergedText;
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

      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Invalid audio file: empty or missing');
      }

      let arrayBuffer: ArrayBuffer;
      if (typeof audioBlob.arrayBuffer === 'function') {
        arrayBuffer = await audioBlob.arrayBuffer();
      } else {
        arrayBuffer = await new Response(audioBlob).arrayBuffer();
      }
      console.log('Audio file loaded, size:', arrayBuffer.byteLength, 'format:', audioFormat);

      const ws = new WebSocket(SONIOX_WEBSOCKET_URL);
      const speakers: SpeakerSegment[] = [];
      let fullTranscript = '';
      const tokens: any[] = [];

      let keepaliveInterval: any = null;
      
      ws.onopen = () => {
        console.log('WebSocket connected for file transcription');
        
        const config = {
          api_key: SONIOX_API_KEY,
          model: 'stt-rt-v3',
          audio_format: audioFormat,
          enable_speaker_diarization: true,
          enable_language_identification: true,
          enable_endpoint_detection: true,
        };
        
        console.log('Sending configuration:', config);
        ws.send(JSON.stringify(config));

        keepaliveInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: 'keepalive' }));
              console.log('Keepalive sent');
            } catch (error) {
              console.error('Keepalive error:', error);
            }
          }
        }, 20000);

        const CHUNK_SIZE = 16384;
        let offset = 0;
        let chunksSent = 0;
        
        const sendNextChunk = () => {
          if (ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket closed unexpectedly');
            if (keepaliveInterval) clearInterval(keepaliveInterval);
            return;
          }
          
          if (offset >= arrayBuffer.byteLength) {
            console.log('All audio data sent (' + chunksSent + ' chunks), sending empty frame...');
            ws.send(new ArrayBuffer(0));
            if (keepaliveInterval) clearInterval(keepaliveInterval);
            return;
          }
          
          const end = Math.min(offset + CHUNK_SIZE, arrayBuffer.byteLength);
          const chunk = arrayBuffer.slice(offset, end);
          
          try {
            ws.send(chunk);
            offset = end;
            chunksSent++;
            
            if (chunksSent % 10 === 0) {
              console.log('Sent', chunksSent, 'chunks, progress:', Math.round((offset / arrayBuffer.byteLength) * 100) + '%');
            }
            
            setTimeout(sendNextChunk, 20);
          } catch (error) {
            console.error('Error sending chunk:', error);
            if (keepaliveInterval) clearInterval(keepaliveInterval);
            reject(new Error('Failed to send audio data'));
          }
        };
        
        console.log('Starting audio stream, size:', arrayBuffer.byteLength, 'bytes');
        setTimeout(() => sendNextChunk(), 50);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received from Soniox:', data);

          if (data.error_code) {
            console.error('Soniox error:', data.error_code, data.error_message);
            ws.close();
            reject(new Error(`Transcription error: ${data.error_message || 'Unknown error'}`));
            return;
          }

          if (data.tokens && data.tokens.length > 0) {
            tokens.push(...data.tokens);
          }

          if (data.finished) {
            console.log('Transcription finished, processing', tokens.length, 'tokens...');
            
            const speakerMap = new Map<string, string[]>();
            
            tokens.forEach((token: any) => {
              if (!token.is_final) return;
              
              const speaker = token.speaker ? 'Speaker ' + token.speaker : 'Speaker 1';
              const text = token.text || '';
              
              if (!speakerMap.has(speaker)) {
                speakerMap.set(speaker, []);
              }
              speakerMap.get(speaker)!.push(text);
              
              fullTranscript += (fullTranscript ? ' ' : '') + text;
            });
            
            speakerMap.forEach((texts, speaker) => {
              const mergedText = texts.join(' ').replace(/\s+/g, ' ').trim();
              speakers.push({
                speaker,
                text: mergedText,
              });
            });
            
            const cleanTranscript = fullTranscript.replace(/\s+/g, ' ').trim();
            
            console.log('Final transcript:', cleanTranscript.slice(0, 100));
            console.log('Speakers found:', speakers.length);
            
            ws.close();
            resolve({
              transcript: cleanTranscript || 'No transcription available',
              speakers: speakers.length > 0 ? speakers : [{ speaker: 'Speaker 1', text: cleanTranscript }],
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

      ws.onclose = (event) => {
        console.log('WebSocket closed, code:', event.code, 'reason:', event.reason);
        if (keepaliveInterval) {
          clearInterval(keepaliveInterval);
        }
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

export async function transcribeAudioChunk(audioUri: string): Promise<string> {
  try {
    console.log('Transcribing audio with Soniox async API:', audioUri);
    
    const formData = new FormData();
    
    const fileType = audioUri.split('.').pop()?.toLowerCase() || '';
    const audioFile = {
      uri: audioUri,
      name: `recording.${fileType}`,
      type: `audio/${fileType}`,
    } as any;
    
    formData.append('audio', audioFile);
    
    const response = await fetch('https://api.soniox.com/transcribe-async', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SONIOX_API_KEY}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Soniox async API error:', response.status, errorText);
      throw new Error(`Transcription failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Soniox async response:', data);
    
    if (data.words && Array.isArray(data.words)) {
      return data.words.map((w: any) => w.text || w.word || '').join(' ');
    } else if (data.transcript) {
      return data.transcript;
    } else if (data.result && data.result.transcript) {
      return data.result.transcript;
    }
    
    return '';
  } catch (error) {
    console.error('Async transcription error:', error);
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
    
    const nowET = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' }));
    const todayET = nowET.toISOString().split('T')[0];
    const tomorrowET = new Date(nowET.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dayOfWeekET = nowET.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/Toronto' });
    const dateStringET = nowET.toLocaleString('en-US', { timeZone: 'America/Toronto' });
    
    const systemContent = 'You are an AI assistant that extracts calendar events from conversation transcripts. ' +
      '\n\nExtract any mentions of events, meetings, appointments, or plans with dates and times.' +
      '\n\nIMPORTANT PARSING RULES:' +
      '\n- ALL DATES MUST BE IN EASTERN TIME (Toronto timezone)' +
      '\n- "tomorrow" means ' + tomorrowET +
      '\n- "today" means ' + todayET +
      '\n- "tonight" means ' + todayET +
      '\n- "this evening" means ' + todayET +
      '\n- Convert relative dates ("next Monday", "in 2 days") to YYYY-MM-DD format using Eastern Time' +
      '\n- Parse times like "2pm", "2:00", "14:00" to HH:MM 24-hour format (e.g., "14:00")' +
      '\n- Extract participant names mentioned (e.g., "with Mark", "Mark and I")' +
      '\n- Infer event type from context (e.g., "tennis" → "Tennis with [name]")' +
      '\n- When calculating future dates, use ' + todayET + ' as the reference date' +
      '\n\nReturn ONLY a valid JSON array of events. Each event must have:' +
      '\n- title: Brief description of the event (e.g., "Tennis with Mark")' +
      '\n- date: YYYY-MM-DD format (based on Eastern Time)' +
      '\n- time: HH:MM 24-hour format (optional if time not mentioned)' +
      '\n- description: Full context from transcript' +
      '\n- participants: Array of names mentioned (optional)' +
      '\n\nIf no events are found, return an empty array [].' +
      '\nDo not include any markdown formatting or explanation, just the raw JSON array.' +
      '\n\nCurrent date/time in Eastern Time (Toronto): ' + dateStringET +
      '\nCurrent day of week: ' + dayOfWeekET +
      '\nToday\'s date in YYYY-MM-DD: ' + todayET;
    
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
  } catch {
    console.warn('Calendar event extraction failed, skipping');
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
      enrichedTranscript = speakers.map(s => `${s.speaker}: ${s.text}`).join('\n\n');
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
  } catch {
    console.warn('AURA summary generation failed, using fallback');
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
      enrichedTranscript = speakers.map(s => `${s.speaker}: ${s.text}`).join('\n\n');
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
  } catch {
    console.warn('Summary generation failed, using fallback');
    return 'Recording from ' + new Date().toLocaleDateString();
  }
}
