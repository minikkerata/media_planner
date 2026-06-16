import React from 'react';
import VideoGridCard from './VideoGridCard';
import VideoListCard from './VideoListCard';

export default function VideoCard(props) {
  if (props.isListView) {
    return <VideoListCard {...props} />;
  }
  return <VideoGridCard {...props} />;
}