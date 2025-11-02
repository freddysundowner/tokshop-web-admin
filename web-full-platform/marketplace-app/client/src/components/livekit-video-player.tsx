import { Room, Track } from 'livekit-client';
import { 
  RoomAudioRenderer, 
  RoomContext,
  VideoTrack,
  useTracks
} from '@livekit/components-react';
import '@livekit/components-styles';

interface LiveKitVideoPlayerProps {
  room: Room;
}

function VideoGrid() {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);

  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      {tracks.length > 0 && (
        <div className="w-full h-full">
          {tracks.map((trackRef) => (
            <div key={trackRef.participant.identity} className="w-full h-full">
              <VideoTrack 
                trackRef={trackRef}
                className="w-full h-full object-cover"
                style={{ 
                  imageRendering: 'auto',
                  transform: 'translateZ(0)', // Force GPU acceleration
                  backfaceVisibility: 'hidden'
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function LiveKitVideoPlayer({ room }: LiveKitVideoPlayerProps) {
  return (
    <RoomContext.Provider value={room}>
      <div className="w-full h-full" data-testid="livekit-video-container">
        <VideoGrid />
        <RoomAudioRenderer />
      </div>
    </RoomContext.Provider>
  );
}
