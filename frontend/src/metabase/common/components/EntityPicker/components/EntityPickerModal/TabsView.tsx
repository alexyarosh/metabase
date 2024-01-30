import type { IconName } from "metabase/ui";
import { Tabs, Icon } from "metabase/ui";
import type { SearchResult } from "metabase-types/api";

import {
  EntityPickerSearchTab,
  EntityPickerSearchResults,
} from "../EntityPickerSearch";

import type { EntityPickerOptions, EntityTab, PickerItem } from "../../types";

export const TabsView = ({
  tabs,
  onItemSelect,
  value,
  options,
  searchQuery,
  searchResults,
  selectedItem,
}: {
  tabs: EntityTab[];
  onItemSelect: (item: PickerItem) => void;
  value?: PickerItem;
  options: EntityPickerOptions;
  searchQuery: string;
  searchResults: PickerItem[] | null;
  selectedItem: PickerItem | null;
}) => {
  const hasSearchTab = !!searchQuery;
  const defaultTab = hasSearchTab ? { model: "search" } : tabs[0];

  return (
    <Tabs
      defaultValue={defaultTab.model}
      style={{
        flexGrow: 1,
        height: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Tabs.List px="md">
        {tabs.map(tab => {
          const { name, icon, displayName } = tab;

          return (
            <Tabs.Tab
              key={name}
              value={name}
              icon={<Icon name={icon} />}
            >
              {displayName}
            </Tabs.Tab>
          );
        })}
        {hasSearchTab && (
          <EntityPickerSearchTab
            searchResults={searchResults}
            searchQuery={searchQuery}
          />
        )}
      </Tabs.List>

      {tabs.map(Tab => {
        const { name } = Tab;

        return (
          <Tabs.Panel
            key={name}
            value={name}
            style={{
              flexGrow: 1,
              height: 0,
            }}
          >
            <Tab
              onItemSelect={onItemSelect}
              value={value}
              options={options}
            />
          </Tabs.Panel>
        );
      })}
      {hasSearchTab && (
        <Tabs.Panel
          key="search"
          value="search"
          style={{
            flexGrow: 1,
            height: 0,
          }}
        >
          <EntityPickerSearchResults
            searchResults={searchResults}
            onItemSelect={onItemSelect}
            selectedItem={selectedItem}
          />
        </Tabs.Panel>
      )}
    </Tabs>
  );
};
