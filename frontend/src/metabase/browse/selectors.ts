import { getSetting } from "metabase/selectors/settings";
import type { State } from "metabase-types/store";
import type { BrowseTabId } from "./utils";
import { isValidBrowseTab } from "./utils";

export const getDefaultBrowseTab = (state: State): BrowseTabId | null => {
  const defaultBrowseTab = getSetting(state, "default-browse-tab");
  return isValidBrowseTab(defaultBrowseTab) ? defaultBrowseTab : null;
};

export const getVerifiedModelsFilterForBrowseModels = (state: State) => {
  return getSetting(state, "only-show-verified-models-in-browse-data");
};
