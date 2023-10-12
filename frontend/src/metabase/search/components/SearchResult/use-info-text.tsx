import { useMemo } from "react";
import { t } from "ttag";
import type { WrappedResult } from "metabase/search/types";
import type { Collection } from "metabase-types/api";
import {
  useDatabaseQuery,
  useSchemaListQuery,
  useTableQuery,
} from "metabase/common/hooks";
import {
  browseDatabase,
  browseSchema,
  collection as collectionUrl,
  tableRowsQuery,
} from "metabase/lib/urls";
import {
  PLUGIN_COLLECTION_COMPONENTS,
  PLUGIN_COLLECTIONS,
} from "metabase/plugins";
import type TableType from "metabase-lib/metadata/Table";

export type InfoTextData = {
  link?: string | null;
  icon?: JSX.Element | null;
  label: string | null;
};

const { CollectionAuthorityLevelIcon } = PLUGIN_COLLECTION_COMPONENTS;

export const useInfoText = (result: WrappedResult): InfoTextData[] => {
  let infoTextHook;

  switch (result.model) {
    case "table":
      infoTextHook = useTablePath;
      break;
    case "segment":
    case "metric":
      infoTextHook = useTableLink;
      break;
    case "collection":
      infoTextHook = useCollectionInfoText;
      break;
    case "database":
      infoTextHook = useDatabaseInfoText;
      break;
    case "action":
      infoTextHook = useActionInfoText;
      break;
    case "card":
    case "dataset":
    case "indexed-entity":
    default:
      infoTextHook = useCollectionResultLink;
      break;
  }

  return infoTextHook(result);
};
const useActionInfoText = (result: WrappedResult): InfoTextData[] => {
  return [
    {
      label: result.model_name,
    },
  ];
};
const useDatabaseInfoText = (): InfoTextData[] => {
  return [
    {
      label: t`Database`,
    },
  ];
};
const useCollectionInfoText = (result: WrappedResult): InfoTextData[] => {
  const collection: Partial<Collection> = result.getCollection();

  if (
    PLUGIN_COLLECTIONS.isRegularCollection(collection) ||
    !collection.authority_level
  ) {
    return [
      {
        label: t`Collection`,
      },
    ];
  }
  const level = PLUGIN_COLLECTIONS.AUTHORITY_LEVEL[collection.authority_level];
  return [
    {
      label: `${level.name} ${t`Collection`}`,
    },
  ];
};
const useTablePath = (result: WrappedResult): InfoTextData[] => {
  const { data: database, isLoading: isDatabaseLoading } = useDatabaseQuery({
    id: result.database_id,
  });

  const databaseLink: InfoTextData | null = useMemo(() => {
    if (isDatabaseLoading || !database || database.name === null) {
      return null;
    }

    return {
      link: browseDatabase(database),
      label: database.name,
    };
  }, [database, isDatabaseLoading]);

  const { data = [], isLoading: isSchemaListLoading } = useSchemaListQuery({
    query: {
      dbId: result.database_id,
    },
  });

  const tableLink: InfoTextData | null = useMemo(() => {
    if (isSchemaListLoading || result.table_schema === null) {
      return null;
    }

    const link = browseSchema({
      db: { id: result.database_id },
      schema_name: result.table_schema,
    } as TableType);

    return {
      link,
      label: result.table_schema,
    };
  }, [isSchemaListLoading, result.database_id, result.table_schema]);

  return [databaseLink, databaseLink ? tableLink : null].filter(
    Boolean,
  ) as InfoTextData[];
};

const useTableLink = (result: WrappedResult): InfoTextData[] => {
  const { data: table } = useTableQuery({
    id: result.table_id,
  });

  return [
    {
      link: tableRowsQuery(result.database_id, result.table_id),
      label: table?.display_name ?? null,
    },
  ];
};

const useCollectionResultLink = (result: WrappedResult): InfoTextData[] => {
  const collection = result.getCollection();
  const colUrl = collectionUrl(collection);
  const collectionName = collection.name;
  return collectionName
    ? [
        {
          icon:
            !PLUGIN_COLLECTIONS.isRegularCollection &&
            collection.authority_level ? (
              <CollectionAuthorityLevelIcon size={15} collection={collection} />
            ) : null,
          link: colUrl,
          label: collectionName,
        },
      ]
    : [];
};
