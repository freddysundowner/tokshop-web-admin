import { useState, useEffect, useCallback } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { apiRequest } from '@/lib/queryClient';

export interface LiveKitConfig {
  roomId: string;
  userId: string;
  userName?: string;
  // Role is determined server-side, not provided by client
  enabled?: boolean;
}

export interface LiveKitState {
  room: Room | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  hasVideo: boolean;
  hasAudio: boolean;
  isHost: boolean;
  isMuted: boolean;
}

export function useLiveKit(config: LiveKitConfig) {
  const [state, setState] = useState<LiveKitState>({
    room: null,
    isConnecting: false,
    isConnected: false,
    error: null,
    hasVideo: false,
    hasAudio: false,
    isHost: false,
    isMuted: false,
  });

  const connect = useCallback(async () => {
    if (!config.enabled || !config.roomId || !config.userId) {
      return;
    }

    try {
      setState(prev => ({ ...prev, isConnecting: true, error: null }));

      console.log('🔌 Getting LiveKit token...', config);

      // Get token from backend - role is determined server-side based on room ownership
      const res = await apiRequest('POST', `/livekit/token`, {
        room: config.roomId,
        userId: config.userId,
        userName: config.userName || config.userId,
      });

      const response = await res.json() as { token: string; url: string; role?: string; piptoken?: string };
      const { token, url, role: serverRole } = response;
      
      if (!token || !url) {
        throw new Error('Invalid token response from server');
      }
      
      // Use server-verified role, not client-provided role
      const isHost = serverRole === 'host';
      console.log('🔐 Server verified role:', serverRole, 'isHost:', isHost);
      
      // Store role in state
      setState(prev => ({ ...prev, isHost }));

      console.log('✅ LiveKit token received, connecting to room...', { url, roomId: config.roomId, role: serverRole });

      // Create and connect to room with high quality settings
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: {
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30, min: 24 }
          },
        },
      });

      // Set up event listeners before connecting
      room.on(RoomEvent.Connected, () => {
        console.log('✅ Connected to LiveKit room');
        setState(prev => ({ 
          ...prev, 
          isConnecting: false, 
          isConnected: true,
          room,
        }));
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log('❌ Disconnected from LiveKit room');
        setState(prev => ({ 
          ...prev, 
          isConnected: false,
          room: null,
        }));
      });

      room.on(RoomEvent.Reconnecting, () => {
        console.log('🔄 Reconnecting to LiveKit room...');
      });

      room.on(RoomEvent.Reconnected, () => {
        console.log('✅ Reconnected to LiveKit room');
      });

      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('📹 Track subscribed:', track.kind, participant.identity);
        
        if (track.kind === Track.Kind.Video) {
          setState(prev => ({ ...prev, hasVideo: true }));
        } else if (track.kind === Track.Kind.Audio) {
          setState(prev => ({ ...prev, hasAudio: true }));
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        console.log('📹 Track unsubscribed:', track.kind, participant.identity);
      });

      room.on(RoomEvent.LocalTrackPublished, (publication, participant) => {
        console.log('📤 Local track published:', publication.kind);
        
        if (publication.kind === Track.Kind.Video) {
          setState(prev => ({ ...prev, hasVideo: true }));
        } else if (publication.kind === Track.Kind.Audio) {
          setState(prev => ({ ...prev, hasAudio: true }));
        }
      });

      // Connect to room
      await room.connect(url, token);

      console.log('✅ LiveKit room connected successfully');

      // Check if user has publish permissions (host) - this is set in the token by the server
      const canPublish = room.localParticipant.permissions?.canPublish ?? false;
      console.log('🔐 LiveKit permissions:', { 
        canPublish,
        role: serverRole,
        willEnableCamera: canPublish 
      });

      // If user has publish permissions (host), enable camera and microphone
      if (canPublish) {
        console.log('🎥 Enabling camera and microphone for host...');
        try {
          // Enable microphone first
          await room.localParticipant.setMicrophoneEnabled(true);
          
          // Enable camera with explicit high-quality constraints
          await room.localParticipant.setCameraEnabled(true, {
            resolution: {
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
              frameRate: { ideal: 30, min: 24 }
            }
          });
          
          console.log('✅ Camera and microphone enabled');
        } catch (error) {
          console.error('❌ Failed to enable camera/microphone:', error);
          setState(prev => ({ 
            ...prev, 
            error: 'Failed to access camera or microphone. Please check permissions.',
          }));
        }
      } else {
        console.log('👁️ User is viewer (no publish permissions)');
      }

    } catch (error) {
      console.error('❌ LiveKit connection error:', error);
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: error instanceof Error ? error.message : 'Failed to connect to live stream',
      }));
    }
  }, [config.enabled, config.roomId, config.userId, config.userName]);

  const disconnect = useCallback(async () => {
    if (state.room) {
      console.log('🔌 Disconnecting from LiveKit room...');
      await state.room.disconnect();
      setState({
        room: null,
        isConnecting: false,
        isConnected: false,
        error: null,
        hasVideo: false,
        hasAudio: false,
        isHost: false,
        isMuted: false,
      });
    }
  }, [state.room]);

  const toggleCamera = useCallback(async () => {
    if (!state.room) return;
    
    // Only allow toggling if user has canPublish permission (host)
    if (!state.room.localParticipant.permissions?.canPublish) {
      console.warn('Cannot toggle camera: user does not have publish permissions');
      return;
    }
    
    try {
      const enabled = state.room.localParticipant.isCameraEnabled;
      await state.room.localParticipant.setCameraEnabled(!enabled);
      setState(prev => ({ ...prev, hasVideo: !enabled }));
    } catch (error) {
      console.error('Failed to toggle camera:', error);
    }
  }, [state.room]);

  const toggleMicrophone = useCallback(async () => {
    if (!state.room) return;
    
    // Only allow toggling if user has canPublish permission (host)
    if (!state.room.localParticipant.permissions?.canPublish) {
      console.warn('Cannot toggle microphone: user does not have publish permissions');
      return;
    }
    
    try {
      const enabled = state.room.localParticipant.isMicrophoneEnabled;
      await state.room.localParticipant.setMicrophoneEnabled(!enabled);
      setState(prev => ({ ...prev, hasAudio: !enabled }));
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
    }
  }, [state.room]);

  // Toggle audio mute - different behavior for host vs viewer
  const toggleAudioMute = useCallback(async () => {
    if (!state.room) return;

    const newMutedState = !state.isMuted;

    if (state.isHost) {
      // Host: Mute microphone AND update room endpoint
      console.log('🎤 Host toggling microphone:', { currentlyMuted: state.isMuted, willBeMuted: newMutedState });
      try {
        await state.room.localParticipant.setMicrophoneEnabled(!newMutedState);
        setState(prev => ({ ...prev, isMuted: newMutedState, hasAudio: !newMutedState }));
        console.log('✅ Host microphone toggled:', { muted: newMutedState });
        
        // Update room endpoint with audioMuted field
        console.log('📡 Updating room audioMuted status:', newMutedState);
        try {
          await apiRequest('PATCH', `/api/rooms/${config.roomId}`, {
            audioMuted: newMutedState
          });
          console.log('✅ Room audioMuted status updated');
        } catch (error) {
          console.error('❌ Failed to update room audioMuted status:', error);
        }
      } catch (error) {
        console.error('❌ Failed to toggle host microphone:', error);
      }
    } else {
      // Viewer: Mute remote audio tracks locally (don't broadcast state change)
      console.log('🔇 Viewer muting remote audio:', newMutedState);
      state.room.remoteParticipants.forEach(participant => {
        participant.audioTrackPublications.forEach(publication => {
          if (publication.audioTrack) {
            // Attach/detach audio element to mute/unmute playback
            const audioElement = publication.audioTrack.attachedElements[0] as HTMLAudioElement;
            if (audioElement) {
              audioElement.muted = newMutedState;
            }
          }
        });
      });
      setState(prev => ({ ...prev, isMuted: newMutedState }));
    }
  }, [state.room, state.isHost, state.isMuted, config.roomId]);

  // Auto-connect when enabled
  useEffect(() => {
    // Don't retry if there's an error - user needs to manually retry
    if (config.enabled && !state.isConnected && !state.isConnecting && !state.error) {
      connect();
    }
  }, [config.enabled, config.roomId, config.userId, config.userName, state.isConnected, state.isConnecting, state.error]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.room) {
        state.room.disconnect();
      }
    };
  }, [state.room]);

  return {
    ...state,
    connect,
    disconnect,
    toggleCamera,
    toggleMicrophone,
    toggleAudioMute,
  };
}
