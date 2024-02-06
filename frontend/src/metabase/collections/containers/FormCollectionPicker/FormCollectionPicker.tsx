import type { HTMLAttributes } from "react";
import { useState, useRef } from "react";
import { t } from "ttag";
import { useField } from "formik";
import { Button, Icon } from "metabase/ui";

import { useUniqueId } from "metabase/hooks/use-unique-id";

import FormField from "metabase/core/components/FormField";
import Collections from "metabase/entities/collections";

import CollectionName from "metabase/containers/CollectionName";
import SnippetCollectionName from "metabase/containers/SnippetCollectionName";

import {
  canonicalCollectionId,
  isValidCollectionId,
} from "metabase/collections/utils";

import type { CollectionId } from "metabase-types/api";

import { useSelector } from "metabase/lib/redux";
import type { FilterItemsInPersonalCollection } from "metabase/containers/ItemPicker";
import { CollectionPickerModal } from "metabase/common/components/EntityPicker";

export interface FormCollectionPickerProps
  extends HTMLAttributes<HTMLDivElement> {
  name: string;
  title?: string;
  placeholder?: string;
  type?: "collections" | "snippet-collections";
  initialOpenCollectionId?: CollectionId;
  onOpenCollectionChange?: (collectionId: CollectionId) => void;
  filterPersonalCollections?: FilterItemsInPersonalCollection;
}

function ItemName({
  id,
  type = "collections",
}: {
  id: CollectionId;
  type?: "collections" | "snippet-collections";
}) {
  return type === "snippet-collections" ? (
    <SnippetCollectionName id={id} />
  ) : (
    <CollectionName id={id} />
  );
}

function FormCollectionPicker({
  className,
  style,
  name,
  title,
  placeholder = t`Select a collection`,
  type = "collections",
  filterPersonalCollections,
}: FormCollectionPickerProps) {
  const id = useUniqueId();
  const [{ value }, { error, touched }, { setValue }] = useField(name);
  const formFieldRef = useRef<HTMLDivElement>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const [openCollectionId] = useState<CollectionId>("root");

  const openCollection = useSelector(state =>
    Collections.selectors.getObject(state, {
      entityId: openCollectionId,
    }),
  );

  const isOpenCollectionInPersonalCollection = openCollection?.is_personal;
  const showCreateNewCollectionOption =
    filterPersonalCollections !== "only" ||
    isOpenCollectionInPersonalCollection;

  // Search API doesn't support collection namespaces yet
  const hasSearch = type === "collections";
  const isSnippetCollection = type === "snippet-collections";

  return (
    <>
      <FormField
        className={className}
        style={style}
        title={title}
        htmlFor={id}
        error={touched ? error : undefined}
        ref={formFieldRef}
      >
        <Button
          onClick={() => setIsPickerOpen(true)}
          fullWidth
          rightIcon={<Icon name="ellipsis" />}
          styles={{ inner: { justifyContent: "space-between" } }}
        >
          {isValidCollectionId(value) ? (
            <ItemName id={value} type={type} />
          ) : (
            placeholder
          )}
        </Button>
      </FormField>
      {isPickerOpen && (
        <CollectionPickerModal
          title={t`Select a collection`}
          value={{ id: value, model: "collection" }}
          onChange={({ id }) => {
            setValue(canonicalCollectionId(id));
            setIsPickerOpen(false);
          }}
          onClose={() => setIsPickerOpen(false)}
          options={{
            showPersonalCollections: filterPersonalCollections !== "exclude",
            showRootCollection: filterPersonalCollections !== "only",
            showSearch: hasSearch,
            hasConfirmButtons: true,
            namespace: isSnippetCollection ? "snippets" : undefined,
            allowCreateNew: showCreateNewCollectionOption,
          }}
        />
      )}
    </>
  );
}

// eslint-disable-next-line import/no-default-export -- deprecated usage
export default FormCollectionPicker;
