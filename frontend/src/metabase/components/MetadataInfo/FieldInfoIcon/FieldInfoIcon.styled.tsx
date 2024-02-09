import styled from "@emotion/styled";
import { Icon } from "metabase/ui";

export const PopoverHoverTarget = styled(Icon)`
  padding: 0.7em 0.65em;
  opacity: 0;

  &[aria-disabled="true"] {
    opacity: 0.35;
    pointer-events: none;
  }

  &[aria-expanded="true"] {
    opacity: 1 !important;
  }
`;
