import styled from "@emotion/styled";
import { FieldInfoIcon } from "metabase/components/MetadataInfo/FieldInfoIcon";
import { color, alpha, darken } from "metabase/lib/colors";
import { Icon } from "metabase/ui";

export const ItemTitle = styled.div`
  min-width: 10ch;
`;

export const ColumnItem = styled.li`
  &:first-child {
    margin-top: 0.5em;
  }
  &:last-child {
    margin-bottom: 0.5em;
  }

  label {
    position: relative;
    display: flex;
    align-items: center;
    margin: 0.25em 0.5em;
    padding: 0.5em;
    padding-right: 4em;
    border-radius: 6px;
    cursor: pointer;

    &:hover {
      background: ${color("bg-medium")};
    }
  }

  ${FieldInfoIcon.HoverTarget} {
    color: ${alpha(darken(color("brand"), 0.6), 0.8)};
    position: absolute;
    right: 0;
  }

  &:hover {
    ${FieldInfoIcon.HoverTarget} {
      opacity: 0.5;
    }
  }
`;

export const ToggleItem = styled(ColumnItem)`
  border-bottom: 1px solid ${color("border")};

  ${ItemTitle} {
    margin-left: 0.75em;
  }
`;

export const StackedRoot = styled.div`
  position: relative;
`;

export const StackedBackground = styled.div<{ checked: boolean }>`
  width: 100%;
  height: 100%;
  border-radius: 4px;
  position: absolute;
  display: inline-block;
  box-sizing: border-box;

  top: -4px;
  left: -4px;

  transition: background 100ms;

  border: 1px solid rgb(147, 161, 171);
  background: ${props => (props.checked ? color("brand") : "none")};
`;

export const ItemIcon = styled(Icon)`
  margin: 0 0.5em;
  margin-left: 0.75em;
  color: ${color("text-dark")};
`;
