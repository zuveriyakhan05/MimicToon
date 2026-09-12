import React from 'react';
import { AvatarController } from '../avatar/AvatarController';
import { AvatarKinematics, CharacterProfile, BodyMotion } from '../../types';
import { StageTheme, FaceSignals, AvatarFacePose, HandSignals, AvatarHandPose } from '../../types/avatar';
import { CompanionState, CompanionReactionType } from '../../types/companion';

export interface Avatar3DStageProps {
  character: CharacterProfile;
  modelUrl?: string;
  kinematics: AvatarKinematics;
  themeEnvironment: 'forest' | 'cosmic' | 'playground' | 'toyroom' | 'studio' | 'transparent';
  mouthOpenLevel: number;
  motion?: BodyMotion | null;
  faceSignals?: FaceSignals | null;
  facePose?: AvatarFacePose | null;
  handSignals?: HandSignals | null;
  handPose?: AvatarHandPose | null;
  smoothingFactor?: number;
  movementSensitivity?: number;
  confidenceThreshold?: number;
  isMirrored?: boolean;
  customModelUrl?: string;
  onThemeChange?: (theme: StageTheme) => void;
  onUpdateSettings?: (settings: { smoothingFactor?: number; movementSensitivity?: number }) => void;
  allowTestPresets?: boolean;
  companionState?: CompanionState;
  companionReaction?: CompanionReactionType;
  companionBlend?: number;
  companionMessage?: string;
}

/**
 * Avatar3DStage mounts the React Three Fiber cartoon avatar scene
 * Powered by AvatarController, MotionMapper, MotionSmoother, BoneController, and AvatarRig
 */
export const Avatar3DStage: React.FC<Avatar3DStageProps> = ({
  character,
  modelUrl,
  kinematics,
  themeEnvironment = 'playground',
  mouthOpenLevel,
  motion = null,
  faceSignals = null,
  facePose = null,
  handSignals = null,
  handPose = null,
  smoothingFactor = 0.25,
  movementSensitivity = 1.0,
  confidenceThreshold = 0.45,
  isMirrored = true,
  customModelUrl,
  onThemeChange,
  onUpdateSettings,
  allowTestPresets = true,
  companionState,
  companionReaction,
  companionBlend,
  companionMessage,
}) => {
  return (
    <AvatarController
      character={character}
      kinematics={kinematics}
      motion={motion}
      faceSignals={faceSignals}
      facePose={facePose}
      handSignals={handSignals}
      handPose={handPose}
      mouthOpenLevel={mouthOpenLevel}
      themeEnvironment={themeEnvironment as StageTheme}
      smoothingFactor={smoothingFactor}
      movementSensitivity={movementSensitivity}
      confidenceThreshold={confidenceThreshold}
      isMirrored={isMirrored}
      customModelUrl={customModelUrl || modelUrl || character.modelUrl}
      onThemeChange={onThemeChange}
      onUpdateSettings={onUpdateSettings}
      allowTestPresets={allowTestPresets}
      companionState={companionState}
      companionReaction={companionReaction}
      companionBlend={companionBlend}
      companionMessage={companionMessage}
    />
  );
};

