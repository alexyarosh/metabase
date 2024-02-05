import type { SearchResult, SearchListQuery } from "metabase-types/api";
import type { IconName } from "metabase/ui";
import type { CollectionPickerOptions } from "./SpecificEntityPickers/CollectionPicker";
import type { EntityPickerModalOptions } from "./components/EntityPickerModal";

export type PickerState<T> = PickerStateItem<T>[];

export type PickerStateItem<T> = EntityPickerStateItem<T>;

type EntityPickerStateItem<T> = {
  query?: SearchListQuery;
  selectedItem: T | any | null;
};

export type EntityPickerOptions = EntityPickerModalOptions &
  CollectionPickerOptions;

export type PickerItem = Pick<
  SearchResult,
  "id" | "name" | "description" | "can_write" | "model"
> & { location: string };

export type EntityTab = React.FC<{
  onItemSelect: (item: PickerItem) => void;
  value?: PickerItem;
  options?: EntityPickerOptions;
}> & {
  displayName: string;
  model: string;
  icon: IconName;
};
