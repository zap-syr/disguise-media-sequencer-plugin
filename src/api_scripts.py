__all__ = ["getMediaList", "getMappingList"]

def getMediaList():
      return (resourceManager.allResources(VideoClip))

def getMappingList():
      return (resourceManager.allResources(Projection))