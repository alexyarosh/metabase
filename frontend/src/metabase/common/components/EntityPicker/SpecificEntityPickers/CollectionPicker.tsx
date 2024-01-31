import { useEffect, useState } from "react";
import { t } from "ttag";
import type { CollectionId, CollectionItem } from "metabase-types/api";

import { useCollectionQuery } from "metabase/common/hooks";
import { isRootCollection } from "metabase/collections/utils";
import { useSelector } from "metabase/lib/redux";
import { getUserPersonalCollectionId } from "metabase/selectors/user";
import { PERSONAL_COLLECTIONS } from "metabase/entities/collections";
import { LoadingSpinner, NestedItemPicker } from "../components";
import type { PickerState, PickerItem } from "../types";

export type CollectionPickerOptions = {
  showPersonalCollections?: boolean;
  showRootCollection?: boolean;
  namespace?: "snippets";
};

const defaultOptions: CollectionPickerOptions = {
  showPersonalCollections: true,
  showRootCollection: true,
};

interface CollectionPickerProps {
  onItemSelect: (item: PickerItem) => void;
  value?: PickerItem;
  options?: CollectionPickerOptions;
}

const CollectionPickerComponent = ({
  onItemSelect,
  value,
  options = defaultOptions,
}: CollectionPickerProps) => {
  const [path, setPath] = useState<PickerState<PickerItem>>(() =>
    getStateFromIdPath({
      idPath: [null as unknown as CollectionId, "root"],
      namespace: options.namespace,
    }),
  );

  const { data: currentCollection, isLoading: loadingCurrentCollection } =
    useCollectionQuery({ id: value?.id, enabled: !!value?.id });

  const userPersonalCollectionId = useSelector(getUserPersonalCollectionId);

  const onFolderSelect = ({ folder }: { folder: PickerItem }) => {
    const newPath = getStateFromIdPath({
      idPath: getCollectionIdPath(folder, userPersonalCollectionId),
      namespace: options.namespace,
    });
    setPath(newPath);
    onItemSelect(folder);
  };

  useEffect(
    function setInitialPath() {
      if (currentCollection?.id) {
        const newPath = getStateFromIdPath({
          idPath: getCollectionIdPath(
            {
              id: currentCollection.id,
              location: currentCollection.location,
              is_personal: currentCollection.is_personal,
            },
            userPersonalCollectionId,
          ),
          namespace: options.namespace,
        });

        setPath(newPath);
      }
      // we need to trigger this effect on these properties because the object reference isn't stable
    },
    [
      currentCollection?.id,
      currentCollection?.location,
      currentCollection?.is_personal,
      options.namespace,
      userPersonalCollectionId,
    ],
  );

  if (loadingCurrentCollection) {
    return <LoadingSpinner />;
  }

  return (
    <NestedItemPicker
      itemModel="question"
      folderModel="collection"
      options={options}
      onFolderSelect={onFolderSelect}
      onItemSelect={onItemSelect}
      path={path}
    />
  );
};

export const CollectionPicker = Object.assign(CollectionPickerComponent, {
  displayName: t`Collection`,
  model: "collection",
  icon: "folder",
});

const getCollectionIdPath = (
  collection: Pick<
    CollectionItem,
    "id" | "effective_location" | "is_personal" | "location"
  >,
  userPersonalCollectionId?: CollectionId,
): CollectionId[] => {
  const location = collection?.effective_location ?? collection?.location;
  const pathFromRoot: CollectionId[] =
    location?.split("/").filter(Boolean).map(Number) ?? [];

  const isInUserPersonalCollection =
    userPersonalCollectionId &&
    (collection.id === userPersonalCollectionId ||
      pathFromRoot.includes(userPersonalCollectionId));

  if (isRootCollection(collection)) {
    return ["root"];
  }

  if (collection.id === PERSONAL_COLLECTIONS.id) {
    return ["personal"];
  }

  if (collection.is_personal) {
    return isInUserPersonalCollection
      ? [...pathFromRoot, collection.id]
      : ["personal", ...pathFromRoot, collection.id];
  }

  return ["root", ...pathFromRoot, collection.id];
};

const getStateFromIdPath = ({
  idPath,
  namespace,
}: {
  idPath: CollectionId[];
  namespace?: "snippets";
}): PickerState<PickerItem> => {
  // TODO: handle collections buried in another user's personal collection 😱

  const statePath: PickerState<PickerItem> = [
    {
      selectedItem: {
        model: "collection",
        id: idPath[0],
      },
    },
  ];

  idPath.forEach((id, index) => {
    const nextLevelId = idPath[index + 1] ?? null;

    statePath.push({
      query: {
        collection: id,
        models: ["collection"],
        namespace,
      },
      selectedItem: nextLevelId
        ? { model: "collection", id: nextLevelId }
        : null,
    });
  });

  return statePath;
};
