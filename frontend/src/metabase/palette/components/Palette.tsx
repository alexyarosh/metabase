import { useEffect, useState } from "react";
import { t } from "ttag";
import CommandPalette, {
  getItemIndex,
  type JsonStructure as CommandPaletteActions,
  useHandleOpenCommandPalette,
} from "react-cmdk";
import type { CommandPalettePageId } from "../hooks/useCommandPalette";
import { useCommandPalette } from "../hooks/useCommandPalette";
import "./Palette.css";
import { CommandPaletteStyled } from "./Palette.styled";

const PalettePage = ({
  id,
  actions,
  searchPrefix = [],
}: {
  id: CommandPalettePageId;
  actions: CommandPaletteActions;
  searchPrefix?: string[];
}) => (
  <CommandPalette.Page id={id} searchPrefix={searchPrefix}>
    {actions.length
      ? actions.map(list => (
          <CommandPalette.List key={list.id} heading={list.heading}>
            {list.items.map(({ id, ...rest }) => (
              <CommandPalette.ListItem
                showType={false}
                key={id}
                index={getItemIndex(actions, id)}
                {...rest}
              />
            ))}
          </CommandPalette.List>
        ))
      : null}
  </CommandPalette.Page>
);

export const Palette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState<CommandPalettePageId>("root");
  const { defaultActions, adminSettingsActions } = useCommandPalette({
    query,
    setPage,
    setQuery,
  });
  useHandleOpenCommandPalette(setOpen);

  useEffect(() => {
    // Hacky solution since react-cmdk doesn't provide a ref to the input
    setTimeout(() => {
      const input = document.getElementById("command-palette-search-input");
      if (input) {
        input.setAttribute("autocomplete", "off");
      }
    }, 0);
  }, [query, open]);

  return (
    <CommandPaletteStyled
      onChangeSearch={setQuery}
      onChangeOpen={setOpen}
      search={query}
      isOpen={open}
      page={page}
    >
      <PalettePage id="root" actions={defaultActions} />
      <PalettePage
        id="admin_settings"
        actions={adminSettingsActions}
        searchPrefix={[t`Admin settings`]}
      />
    </CommandPaletteStyled>
  );
};