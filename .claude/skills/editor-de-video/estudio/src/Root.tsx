import React from 'react';
import {CalculateMetadataFunction, Composition} from 'remotion';
import {PROPS_GALERIA} from './demo';
import type {VideoProps} from './tipos';
import {Video} from './Video';
import './fontes';

export const FORMATOS = [
  {id: '9x16', w: 1080, h: 1920}, // Reels, TikTok, Shorts
  {id: '1x1', w: 1080, h: 1080}, // feed
  {id: '16x9', w: 1920, h: 1080}, // YouTube
] as const;

const metadados: CalculateMetadataFunction<VideoProps> = ({props}) => ({
  durationInFrames: Math.max(1, Math.round((props.duracao + (props.plano.extraFinal ?? 0)) * props.fps)),
  fps: props.fps,
});

export const Root: React.FC = () => (
  <>
    {FORMATOS.map((f) => (
      <Composition
        key={f.id}
        id={`Video${f.id}`}
        component={Video}
        width={f.w}
        height={f.h}
        fps={30}
        durationInFrames={300}
        defaultProps={PROPS_GALERIA}
        calculateMetadata={metadados}
      />
    ))}
  </>
);
