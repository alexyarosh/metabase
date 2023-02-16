import React from "react";
import { t } from "ttag";

import type {
  DashboardOrderedCard,
  VisualizationSettings,
} from "metabase-types/api";

import DashCardActionButton from "./DashCardActionButton";

interface Props {
  dashcard: DashboardOrderedCard;
  onUpdateVisualizationSettings: (
    settings: Partial<VisualizationSettings>,
  ) => void;
}

export default function LinkCardEditButton({
  dashcard,
  onUpdateVisualizationSettings,
}: Props) {
  const entity = dashcard?.visualization_settings?.link?.entity;

  if (!entity) {
    return null;
  }

  const handleClick = () => {
    onUpdateVisualizationSettings({
      link: {
        url: entity.name,
      },
    });
  };

  return (
    <DashCardActionButton tooltip={t`Edit Link`} onClick={handleClick}>
      <DashCardActionButton.Icon name="pencil" />
    </DashCardActionButton>
  );
}
