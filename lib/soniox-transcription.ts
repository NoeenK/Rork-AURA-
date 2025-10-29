import { Platform } from 'react-native';

const SONIOX_API_KEY = '14f5b7c577d9b2c6f1c29351700ec4c9f233684dfdf27f67909a32262c896bde';
const SONIOX_WEBSOCKET_URL = 'wss://stt-rt.soniox.com/transcribe-websocket';
const OPENAI_API_KEY = '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';

export interface TranscriptionToken {
  text: string;
  speaker?: string;
  language?: string;
  is_final: boolean;
  translation?: string;
  translation_status?: 'original' | 'translation';
}

export interface TranscriptionCallback {
  onTranscript: (text: string, isFinal: boolean, tokens?: TranscriptionToken[]) => void;
  onError: (error: Error) => void;
}

export class SonioxRealtimeTranscription {
  private ws: WebSocket | null = null;
  private callbacks: TranscriptionCallback | null = null;
  private isConnected = false;
  private finalTokens: TranscriptionToken[] = [];
  private nonFinalTokens: TranscriptionToken[] = [];
  private accumulatedText = '';
  private mediaRecorder: any = null;
  private audioStream: MediaStream | null = null;

  async connect(callbacks: TranscriptionCallback): Promise<void> {
    this.callbacks = callbacks;
    this.finalTokens = [];
    this.nonFinalTokens = [];
    this.accumulatedText = '';

    try {
      console.log('[Soniox] Connecting to WebSocket...');
      
      this.ws = new WebSocket(SONIOX_WEBSOCKET_URL);

      this.ws.onopen = () => {
        console.log('[Soniox] WebSocket connected');
        this.isConnected = true;
        
        const config = {
          api_key: SONIOX_API_KEY,
          model: 'stt-rt-v3',
          language_hints: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ko', 'ja', 'zh'],
          enable_language_identification: true,
          enable_speaker_diarization: true,
          enable_endpoint_detection: true,
          audio_format: 'auto',
          translation: {
            type: 'one_way' as const,
            target_language: 'en',
          },
        };

        this.ws?.send(JSON.stringify(config));
        console.log('[Soniox] Configuration sent:', config);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data.toString());
          
          if (data.error_code) {
            console.error(`[Soniox] Error: ${data.error_code} - ${data.error_message}`);
            
            // Handle 408 timeout specially - it usually means audio format issues
            if (data.error_code === 408) {
              console.error('[Soniox] Audio decode timeout - check audio format compatibility');
              this.callbacks?.onError(new Error('Audio format incompatible. Please try again.'));
            } else {
              this.callbacks?.onError(new Error(data.error_message));
            }
            return;
          }

          if (data.tokens && data.tokens.length > 0) {
            console.log('[Soniox] Received tokens:', data.tokens.length);
            
            // Reset non-final tokens on each response
            this.nonFinalTokens = [];
            
            for (const token of data.tokens) {
              if (token.text) {
                if (token.is_final) {
                  this.finalTokens.push(token);
                } else {
                  this.nonFinalTokens.push(token);
                }
              }
            }

            // Send all tokens (final + non-final) to the UI
            const allTokens = [...this.finalTokens, ...this.nonFinalTokens];
            const fullText = allTokens.map(t => t.text).join('');
            
            console.log('[Soniox] Transcript update:', fullText.slice(0, 100));
            this.callbacks?.onTranscript(fullText, this.nonFinalTokens.length === 0, allTokens);
          }

          if (data.finished) {
            console.log('[Soniox] Session finished');
            const finalText = this.finalTokens.map(t => t.text).join('');
            this.callbacks?.onTranscript(finalText, true, this.finalTokens);
          }
        } catch (error) {
          console.error('[Soniox] Error parsing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[Soniox] WebSocket error:', error);
        this.callbacks?.onError(new Error('WebSocket connection error'));
      };

      this.ws.onclose = () => {
        console.log('[Soniox] WebSocket connection closed');
        this.isConnected = false;
      };
    } catch (error) {
      console.error('[Soniox] Failed to connect:', error);
      throw error;
    }
  }

  async startLiveRecording(): Promise<void> {
    if (Platform.OS === 'web') {
      // Web: Use MediaRecorder for real-time audio chunks
      try {
        console.log('[Soniox] Starting web audio capture...');
        
        this.audioStream = await (navigator.mediaDevices as any).getUserMedia({ 
          audio: {
            channelCount: 1,
            sampleRate: 16000,
          } 
        });
        
        // Use PCM format with specific sample rate for Soniox
        const options = { mimeType: 'audio/webm;codecs=opus' };
        let recorder;
        try {
          recorder = new (window as any).MediaRecorder(this.audioStream, options);
        } catch {
          // Fallback if opus not supported
          console.log('[Soniox] Falling back to default codec');
          recorder = new (window as any).MediaRecorder(this.audioStream);
        }
        this.mediaRecorder = recorder;
        
        this.mediaRecorder.ondataavailable = (event: any) => {
          if (event.data && event.data.size > 0 && this.isConnected && this.ws) {
            console.log('[Soniox] Sending audio chunk:', event.data.size, 'bytes');
            
            // Convert blob to ArrayBuffer and send
            event.data.arrayBuffer().then((buffer: ArrayBuffer) => {
              if (this.ws && this.isConnected) {
                this.ws.send(buffer);
              }
            });
          }
        };
        
        // Request data every 500ms for real-time streaming (better stability)
        this.mediaRecorder.start(500);
        console.log('[Soniox] MediaRecorder started');
        
      } catch (error) {
        console.error('[Soniox] Failed to start web audio:', error);
        this.callbacks?.onError(error as Error);
      }
    } else {
      // Mobile: expo-av doesn't support real-time chunk access
      console.log('[Soniox] Mobile: Real-time transcription not available with expo-av');
      console.log('[Soniox] Recording will be transcribed after completion');
    }
  }

  stopLiveRecording(): void {
    if (Platform.OS === 'web') {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
        console.log('[Soniox] MediaRecorder stopped');
      }
      
      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop());
        this.audioStream = null;
        console.log('[Soniox] Audio stream stopped');
      }
    }
  }

  async sendAudioFile(uri: string): Promise<void> {
    if (!this.isConnected || !this.ws) {
      console.warn('[Soniox] WebSocket not connected');
      return;
    }

    try {
      console.log('[Soniox] Streaming audio file:', uri);
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      
      console.log('[Soniox] Audio file size:', arrayBuffer.byteLength, 'bytes');
      
      // Stream in chunks to simulate real-time
      const chunkSize = 8000; // Larger chunks for better stability
      let offset = 0;
      
      const sendChunk = () => {
        if (offset < arrayBuffer.byteLength && this.isConnected && this.ws) {
          const chunk = arrayBuffer.slice(offset, offset + chunkSize);
          this.ws.send(chunk);
          offset += chunkSize;
          
          // Send chunks at ~200ms intervals (slower = more stable)
          setTimeout(sendChunk, 200);
        } else if (offset >= arrayBuffer.byteLength) {
          console.log('[Soniox] All chunks sent, sending end-of-audio signal');
          this.finishAudio();
        }
      };
      
      sendChunk();
    } catch (error) {
      console.error('[Soniox] Error streaming audio file:', error);
      this.callbacks?.onError(error as Error);
    }
  }

  finishAudio(): void {
    if (!this.isConnected || !this.ws) {
      return;
    }

    try {
      // Send empty message to signal end of audio
      this.ws.send('');
      console.log('[Soniox] End-of-audio signal sent');
    } catch (error) {
      console.error('[Soniox] Error finishing audio:', error);
    }
  }

  disconnect(): void {
    this.stopLiveRecording();
    
    if (this.ws) {
      if (this.isConnected) {
        this.finishAudio();
      }
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  isActive(): boolean {
    return this.isConnected;
  }

  getFinalTranscript(): string {
    return this.finalTokens.map(t => t.text).join('');
  }
}

export interface SpeakerSegment {
  speaker?: string;
  language?: string;
  text: string;
  translation?: string;
}

export async function transcribeAudioFileWithSpeakers(uri: string): Promise<{ transcript: string; segments: SpeakerSegment[] }> {
  return new Promise((resolve, reject) => {
    try {
      console.log('[Soniox] Starting file transcription with speakers:', uri);
      
      const ws = new WebSocket(SONIOX_WEBSOCKET_URL);
      let allTokens: TranscriptionToken[] = [];
      let hasError = false;

      ws.onopen = async () => {
        console.log('[Soniox] WebSocket opened for file transcription');
        
        const config: any = {
          api_key: SONIOX_API_KEY,
          model: 'stt-rt-v3',
          language_hints: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ko', 'ja', 'zh'],
          enable_language_identification: true,
          enable_speaker_diarization: true,
          enable_endpoint_detection: true,
          audio_format: 'auto',
          translation: {
            type: 'one_way' as const,
            target_language: 'en',
          },
        };

        ws.send(JSON.stringify(config));
        console.log('[Soniox] Config sent, streaming audio file...');

        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          
          console.log('[Soniox] Audio file size:', arrayBuffer.byteLength);
          
          const chunkSize = 8000;
          let offset = 0;
          
          const sendChunk = () => {
            if (offset < arrayBuffer.byteLength && !hasError) {
              const chunk = arrayBuffer.slice(offset, offset + chunkSize);
              ws.send(chunk);
              offset += chunkSize;
              setTimeout(sendChunk, 200);
            } else if (offset >= arrayBuffer.byteLength) {
              ws.send('');
              console.log('[Soniox] All audio data sent');
            }
          };
          
          sendChunk();
        } catch (error) {
          console.error('[Soniox] Error reading audio file:', error);
          hasError = true;
          reject(error);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data.toString());

          if (data.error_code) {
            console.error(`[Soniox] Error: ${data.error_code} - ${data.error_message}`);
            hasError = true;
            reject(new Error(data.error_message));
            ws.close();
            return;
          }

          if (data.tokens) {
            for (const token of data.tokens) {
              if (token.text && token.is_final) {
                allTokens.push(token);
              }
            }
          }

          if (data.finished) {
            // Group tokens into speaker segments
            const segments: SpeakerSegment[] = [];
            let currentSegment: SpeakerSegment | null = null;
            
            for (const token of allTokens) {
              const speaker = token.speaker || '1';
              const language = token.language || 'en';
              const text = token.text;
              const isTranslation = token.translation_status === 'translation';
              
              // Start new segment if speaker or translation status changes
              if (!currentSegment || 
                  currentSegment.speaker !== speaker || 
                  (isTranslation && !currentSegment.translation) ||
                  (!isTranslation && currentSegment.translation)) {
                
                if (currentSegment && currentSegment.text.trim()) {
                  segments.push(currentSegment);
                }
                
                currentSegment = {
                  speaker,
                  language,
                  text: isTranslation ? '' : text,
                  translation: isTranslation ? text : undefined,
                };
              } else {
                if (isTranslation) {
                  currentSegment.translation = (currentSegment.translation || '') + text;
                } else {
                  currentSegment.text += text;
                }
              }
            }
            
            if (currentSegment && currentSegment.text.trim()) {
              segments.push(currentSegment);
            }
            
            const fullText = allTokens
              .filter(t => t.translation_status !== 'translation')
              .map(t => t.text)
              .join('');
            
            console.log('[Soniox] Transcription completed with', segments.length, 'segments');
            resolve({ transcript: fullText || 'No transcription available', segments });
            ws.close();
          }
        } catch (error) {
          console.error('[Soniox] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[Soniox] WebSocket error:', error);
        hasError = true;
        reject(new Error('WebSocket error'));
      };

      ws.onclose = () => {
        console.log('[Soniox] WebSocket closed');
        if (!hasError && allTokens.length === 0) {
          reject(new Error('WebSocket closed without receiving transcription'));
        }
      };

      setTimeout(() => {
        if (!hasError && allTokens.length === 0) {
          hasError = true;
          ws.close();
          reject(new Error('Transcription timeout'));
        }
      }, 60000);

    } catch (error) {
      console.error('[Soniox] Transcription error:', error);
      reject(error);
    }
  });
}

export async function transcribeAudioFile(uri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      console.log('[Soniox] Starting file transcription:', uri);
      
      const ws = new WebSocket(SONIOX_WEBSOCKET_URL);
      let finalTokens: any[] = [];
      let hasError = false;

      ws.onopen = async () => {
        console.log('[Soniox] WebSocket opened for file transcription');
        
        const config: any = {
          api_key: SONIOX_API_KEY,
          model: 'stt-rt-v3',
          language_hints: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ko', 'ja', 'zh'],
          enable_language_identification: true,
          enable_speaker_diarization: true,
          enable_endpoint_detection: true,
          audio_format: 'auto',
          translation: {
            type: 'one_way' as const,
            target_language: 'en',
          },
        };

        ws.send(JSON.stringify(config));
        console.log('[Soniox] Config sent, streaming audio file...');

        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          
          console.log('[Soniox] Audio file size:', arrayBuffer.byteLength);
          
          const chunkSize = 8000;
          let offset = 0;
          
          const sendChunk = () => {
            if (offset < arrayBuffer.byteLength && !hasError) {
              const chunk = arrayBuffer.slice(offset, offset + chunkSize);
              ws.send(chunk);
              offset += chunkSize;
              setTimeout(sendChunk, 200);
            } else if (offset >= arrayBuffer.byteLength) {
              ws.send('');
              console.log('[Soniox] All audio data sent');
            }
          };
          
          sendChunk();
        } catch (error) {
          console.error('[Soniox] Error reading audio file:', error);
          hasError = true;
          reject(error);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data.toString());

          if (data.error_code) {
            console.error(`[Soniox] Error: ${data.error_code} - ${data.error_message}`);
            hasError = true;
            reject(new Error(data.error_message));
            ws.close();
            return;
          }

          if (data.tokens) {
            for (const token of data.tokens) {
              if (token.text && token.is_final) {
                finalTokens.push(token);
              }
            }
          }

          if (data.finished) {
            const fullText = finalTokens.map(t => t.text).join('');
            console.log('[Soniox] Transcription completed:', fullText.slice(0, 100));
            resolve(fullText || 'No transcription available');
            ws.close();
          }
        } catch (error) {
          console.error('[Soniox] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[Soniox] WebSocket error:', error);
        hasError = true;
        reject(new Error('WebSocket error'));
      };

      ws.onclose = () => {
        console.log('[Soniox] WebSocket closed');
        if (!hasError && finalTokens.length === 0) {
          reject(new Error('WebSocket closed without receiving transcription'));
        }
      };

      setTimeout(() => {
        if (!hasError && finalTokens.length === 0) {
          hasError = true;
          ws.close();
          reject(new Error('Transcription timeout'));
        }
      }, 60000);

    } catch (error) {
      console.error('[Soniox] Transcription error:', error);
      reject(error);
    }
  });
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
    
    // Calculate next week dates
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayOfWeek = now.getDay();
    const currentHour = now.getHours();
    const nextWeekDates: Record<string, string> = {};
    const thisWeekDates: Record<string, string> = {};
    
    // For each day of the week, calculate this week and next week occurrence
    for (let targetDay = 0; targetDay < 7; targetDay++) {
      let daysUntilTargetThisWeek = targetDay - currentDayOfWeek;
      let daysUntilTargetNextWeek = targetDay - currentDayOfWeek;
      
      // This week: if it's the same day but later in the day, or future days this week
      if (daysUntilTargetThisWeek < 0 || (daysUntilTargetThisWeek === 0 && currentHour >= 18)) {
        // Day has passed or it's late today
        daysUntilTargetThisWeek += 7;
      }
      
      // Next week is always 7+ days away
      if (daysUntilTargetNextWeek <= 0) {
        daysUntilTargetNextWeek += 7;
      }
      
      const thisWeekDate = new Date(now.getTime() + daysUntilTargetThisWeek * 24 * 60 * 60 * 1000);
      const nextWeekDate = new Date(now.getTime() + (daysUntilTargetNextWeek + 7) * 24 * 60 * 60 * 1000);
      const dayName = daysOfWeek[targetDay];
      
      thisWeekDates[dayName] = thisWeekDate.toISOString().split('T')[0];
      nextWeekDates[dayName] = nextWeekDate.toISOString().split('T')[0];
    }
    
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

CURRENT DATE AND TIME REFERENCE:
- Today is: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (${today})
- Current day of week: ${daysOfWeek[now.getDay()]}
- Current time: ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}

IMPORTANT DATE PARSING RULES:
- "tomorrow" = ${tomorrow}
- "today" = ${today}
- "tonight" = ${today}
- "this evening" = ${today}
- "this afternoon" = ${today}

- For day names WITHOUT "next" prefix (e.g., "on Monday", "Monday", "this Monday"):
  - Monday = ${thisWeekDates['Monday']}
  - Tuesday = ${thisWeekDates['Tuesday']}
  - Wednesday = ${thisWeekDates['Wednesday']}
  - Thursday = ${thisWeekDates['Thursday']}
  - Friday = ${thisWeekDates['Friday']}
  - Saturday = ${thisWeekDates['Saturday']}
  - Sunday = ${thisWeekDates['Sunday']}

- For "next [day name]" (explicitly mentions "next"):
  - next Monday = ${nextWeekDates['Monday']}
  - next Tuesday = ${nextWeekDates['Tuesday']}
  - next Wednesday = ${nextWeekDates['Wednesday']}
  - next Thursday = ${nextWeekDates['Thursday']}
  - next Friday = ${nextWeekDates['Friday']}
  - next Saturday = ${nextWeekDates['Saturday']}
  - next Sunday = ${nextWeekDates['Sunday']}

- For "in X days", add X days to today's date
- CRITICAL: When you see a day name without "next", use THIS WEEK's date, NOT next week!

TIME PARSING RULES:
- Parse "2pm", "2 pm", "2:00 pm" as "14:00"
- Parse "2am", "2 am", "2:00 am" as "02:00"
- Parse "noon" or "12pm" as "12:00"
- Parse "midnight" or "12am" as "00:00"
- Default missing minutes to "00"

EVENT EXTRACTION:
- Extract participant names (e.g., "with Mark", "meeting with Sarah")
- Infer activity from context (e.g., "playing tennis with Mark" → title: "Tennis with Mark")
- Include full context in description field

RETURN FORMAT:
Return ONLY a valid JSON array (no markdown, no explanation). Each event must have:
{
  "title": "Brief description (e.g., 'Meeting with Mark')",
  "date": "YYYY-MM-DD format",
  "time": "HH:MM in 24-hour format (optional)",
  "description": "Full context from transcript",
  "participants": ["Array of names (optional)"]
}

If no events found, return: []`
          },
          {
            role: 'user',
            content: `Extract calendar events from this transcript:\n\n${transcript}`
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
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
    console.log('Generating AURA summary with OpenAI...');
    
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
    console.log('Generating summary with OpenAI...');
    
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
