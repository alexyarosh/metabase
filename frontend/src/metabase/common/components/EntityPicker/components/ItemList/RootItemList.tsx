import { useAsync } from "react-use";
import { t } from "ttag";
import { useSelector } from "metabase/lib/redux";
import { CollectionsApi, UserApi } from "metabase/services";
import { getUserIsAdmin } from "metabase/selectors/user";
import { PERSONAL_COLLECTIONS } from "metabase/entities/collections";
import { useCollectionQuery } from "metabase/common/hooks";
import type { EntityPickerOptions, PickerItem } from "../../types";

import { ItemList } from "./ItemList";

const personalCollectionsRoot = {
  ...PERSONAL_COLLECTIONS,
  can_write: false,
  model: "collection",
  location: "/",
  description: "",
} as unknown as PickerItem;

interface RootItemListProps {
  onClick: (val: any) => void;
  selectedItem: PickerItem | null;
  folderModel: string;
  options: EntityPickerOptions;
}
/**
 * This is a special item list that exists "above" our analytics and might include:
 * a) the highest-level collections the user can access (often "our analytics")
 * b) the user's personal collection
 * c) a top level folder including all personal collections (admin only)
 */
export const RootItemList = ({
  onClick,
  selectedItem,
  folderModel,
  options,
}: RootItemListProps) => {
  const isAdmin = useSelector(getUserIsAdmin);

  const {
    data: rootCollection,
    isLoading: isLoadingRootCollecton,
    error: rootCollectionError,
  } = useCollectionQuery({ id: "root" });

  const { value: data, loading: isLoading } = useAsync(async () => {
    const collectionsData: PickerItem[] = [];

    if (options.showRootCollection || options.namespace === "snippets") {
      if (rootCollection && !rootCollectionError) {
        collectionsData.push({
          ...rootCollection,
          model: "collection",
          location: "/",
        });
      } else if (rootCollectionError) {
        collectionsData.push({
          name: t`Our Analytics`,
          id: "root",
          description: null,
          can_write: false,
          model: "collection",
          location: "/",
        });
      }
    }

    if (options.showPersonalCollections && options.namespace !== "snippets") {
      const currentUser = await UserApi.current();
      const personalCollection = await CollectionsApi.get({
        id: currentUser.personal_collection_id,
      });
      collectionsData.push({
        ...personalCollection,
        model: "collection",
      });

      if (isAdmin) {
        collectionsData.push(personalCollectionsRoot);
      }
    }

    return collectionsData;
  }, [rootCollection]);

  return (
    <ItemList
      items={data}
      isLoading={isLoading || isLoadingRootCollecton}
      onClick={onClick}
      selectedItem={selectedItem}
      folderModel={folderModel}
    />
  );
};
