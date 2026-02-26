__all__ = ["getMediaList", "getMappingList"]

from ast import If


def getMediaList():
      return (resourceManager.allResources(VideoClip))

def getMappingList():
      return (resourceManager.allResources(Projection))

def createLayers():
      current_track = guisystem.track
      current_playhead_beats = guisystem.player.tCurrent

      MODE = 0 # 0: locked, 1: Normal 
      AT_END_POINT = 2 # 0: loop, 1: Ping-pong, 2: Pause
      FIT_TO_CONTENTS = True # Set value from user input
      SPLIT_SECTION = False # Set value from user input
      ADD_CUE_TAG = False # Set value from user input

      mapping_path = '' # Set value from user input
      cue_tag = '' # Set value from user input

      still_duration_seconds = 5 # Set value from user input
      movie_duration_seconds = 30 # Set value from user input

      # Define overlap in seconds and convert to beats
      overlap_seconds = 0 # Set value from user input
      # To get the length of 1 second in beats at the current playhead:
      overlap_beats = current_track.timeToBeat(current_track.beatToTime(current_playhead_beats) + overlap_seconds) - current_playhead_beats

      created_layers_info = []
      current_start_beats = current_playhead_beats

      for i, clip_path in enumerate():
            clip = resourceManager.loadOrCreate(clip_path, VideoClip)

            # define if clip still image or video and get duration
            if clip.file and clip.file.nFrames > 1 and clip.fileFps > 1:
                  if FIT_TO_CONTENTS:
                        clip_duration_seconds = float(clip.file.nFrames) / clip.fileFps
                  else:
                        clip_duration_seconds = movie_duration_seconds
            else:
                  clip_duration_seconds = still_duration_seconds

            # Convert clip duration to beats, relative to the current_start_beats position
            # This accounts for potential BPM changes on the track.
            clip_end_time_in_seconds = current_track.beatToTime(current_start_beats) + clip_duration_seconds
            clip_length_beats = current_track.timeToBeat(clip_end_time_in_seconds) - current_start_beats

            
            layer_name = "Video Layer - {}".format(clip.description)

            # Add new layer
            # The addNewLayer method expects start_beats and length_beats
            new_layer = current_track.addNewLayer(VariableVideoModule, current_start_beats, clip_length_beats, layer_name)

            if new_layer:
                  mapping_fseq = new_layer.findSequence("mapping")
                  if mapping_fseq:
                        current_insert_beat = current_start_beats

                        markDirty(mapping_fseq)
                        mapping_fseq.disableSequencing = True
                        mapping_resource = resourceManager.loadOrCreate(mapping_path, Projection)
                        mapping_fseq.sequence.setResource(current_insert_beat, mapping_resource)
                        mapping_fseq.saveOnDelete()
                  else:
                        print("Failed to find video sequence in the new layer.")

                  video_fseq = new_layer.findSequence("video")
                  if video_fseq:
                        current_insert_beat = current_start_beats

                        markDirty(video_fseq)
                        video_fseq.disableSequencing = True
                        video_fseq.sequence.setResource(current_insert_beat, clip)
                        video_fseq.saveOnDelete()
                  else:
                        print("Failed to find video sequence in the new layer.")

                  mode_fseq = new_layer.findSequence("mode")
                  if mode_fseq:
                        current_insert_beat = current_start_beats

                        markDirty(mode_fseq)
                        mode_fseq.disableSequencing = True
                        mode_fseq.sequence.setFloat(current_insert_beat, MODE)
                        mode_fseq.saveOnDelete()
                  else:
                        print("Failed to find mode sequence in the new layer.")

                  end_fseq = new_layer.findSequence("At end point")
                  if end_fseq:
                        current_insert_beat = current_start_beats

                        markDirty(end_fseq)
                        end_fseq.disableSequencing = True
                        end_fseq.sequence.setFloat(current_insert_beat, AT_END_POINT)
                        end_fseq.saveOnDelete()
                  else:
                        print("Failed to find at end point sequence in the new layer.")

                  created_layers_info.append({
                        "name": new_layer.name,
                        "uid": new_layer.uid,
                        "video_clip": clip.description,
                        "start_beats": current_start_beats,
                        "length_beats": clip_length_beats
                  })
                  
                  # Calculate the start for the next layer with overlap
                  # The next layer starts at the current layer's end minus the overlap
                  current_start_beats = current_start_beats + clip_length_beats - overlap_beats

                  if SPLIT_SECTION:
                        current_track.splitSectionAtBeat(current_start_beats)

                  if ADD_CUE_TAG:
                        tag = Tag(1, cue_tag) # Tag(tagType, tagText)
                        current_track.setTagAtBeat(current_start_beats, tag)
                        cue_tag += 1

      return {
            "status": "success",
            "message": "Sequenced {} video layers from 'content' folder starting at playhead.".format(len(created_layers_info)),
            "created_layers": created_layers_info
      }