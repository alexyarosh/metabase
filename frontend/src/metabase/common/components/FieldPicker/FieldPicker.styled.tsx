import styled from "@emotion/styled";
import { color } from "metabase/lib/colors";

export const ItemTitle = styled.div`
  min-width: 10ch;
  margin-left: 1em;
`;

export const ColumnItem = styled.li`
  position: relative;

  label {
    display: flex;
    align-items: center;
    margin: 0.5em;
    padding: 0.5em;
    padding-right: 3em;
    border-radius: 6px;
    cursor: pointer;

    &:hover {
      background: ${color("bg-medium")};
    }
  }
`;

export const ToggleItem = styled(ColumnItem)`
  border-bottom: 1px solid ${color("border")};
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
