import { entityForObject } from "metabase/lib/schema";
import type { Collection } from "metabase-types/api";

import type { PickerItem } from "./types";

export const getIcon = (item: PickerItem) => {
  const entity = entityForObject(item);
  return entity?.objectSelectors?.getIcon?.(item)?.name || "table";
};

export const isSelectedItem = (
  item: PickerItem,
  selectedItem: PickerItem | null,
): boolean => {
  return (
    !!selectedItem &&
    item.id === selectedItem.id &&
    item.model === selectedItem.model
  );
};

export const collectionToPickerItem = (collection: Collection): PickerItem => {
  return {
    ...collection,
    model: "collection",
    location: collection.location || "/",
  };
};
