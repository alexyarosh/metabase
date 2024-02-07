import _ from "underscore";
import { updateIn } from "icepick";

import { copy } from "metabase/lib/utils";
import * as Lib from "metabase-lib";
import { normalizeParameterValue } from "metabase-lib/parameters/utils/parameter-values";
import { deriveFieldOperatorFromParameter } from "metabase-lib/parameters/utils/operators";

export function isNative(card) {
  return card?.dataset_query?.type === "native";
}

function cardVisualizationIsEquivalent(cardA, cardB) {
  return _.isEqual(
    _.pick(cardA, "display", "visualization_settings"),
    _.pick(cardB, "display", "visualization_settings"),
  );
}

export function cardQueryIsEquivalent(cardA, cardB) {
  cardA = updateIn(cardA, ["dataset_query", "parameters"], p => p || []);
  cardB = updateIn(cardB, ["dataset_query", "parameters"], p => p || []);
  return Lib.areLegacyQueriesEqual(
    _.pick(cardA, "dataset_query"),
    _.pick(cardB, "dataset_query"),
  );
}

export function cardParametersAreEquivalent(cardA, cardB) {
  return _.isEqual(cardA.parameters || [], cardB.parameters || []);
}

export function cardIsEquivalent(cardA, cardB) {
  return (
    cardQueryIsEquivalent(cardA, cardB) &&
    cardVisualizationIsEquivalent(cardA, cardB)
  );
}

export function getQuery(card) {
  if (card.dataset_query.type === "query") {
    return card.dataset_query.query;
  } else {
    return null;
  }
}

// NOTE Atte Keinänen 7/5/17: Still used in dashboards and public questions.
// Query builder uses `Question.getResults` which contains similar logic.
export function applyParameters(
  card,
  parameters,
  parameterValues = {},
  parameterMappings = [],
) {
  const datasetQuery = copy(card.dataset_query);
  // clean the query
  if (datasetQuery.type === "query") {
    const mlv2Query = datasetQuery.query.getMLv2Query();
    const cleanQuery = Lib.dropStageIfEmpty(mlv2Query, -1);
    datasetQuery.query = Lib.toLegacyQuery(cleanQuery);
  }
  datasetQuery.parameters = [];
  for (const parameter of parameters || []) {
    const value = parameterValues[parameter.id];

    const cardId = card.id || card.original_card_id;
    const mapping = _.findWhere(
      parameterMappings,
      cardId != null
        ? {
            card_id: cardId,
            parameter_id: parameter.id,
          }
        : // NOTE: this supports transient dashboards where cards don't have ids
          // BUT will not work correctly with multiseries dashcards since
          // there's no way to identify which card the mapping applies to.
          {
            parameter_id: parameter.id,
          },
    );

    const type = parameter.type;
    const options =
      deriveFieldOperatorFromParameter(parameter)?.optionsDefaults;

    const queryParameter = {
      type,
      value: normalizeParameterValue(type, value),
      id: parameter.id,
    };

    if (options) {
      queryParameter.options = options;
    }

    if (mapping) {
      // mapped target, e.x. on a dashboard
      queryParameter.target = mapping.target;
      datasetQuery.parameters.push(queryParameter);
    } else if (parameter.target) {
      // inline target, e.x. on a card
      queryParameter.target = parameter.target;
      datasetQuery.parameters.push(queryParameter);
    }
  }

  return datasetQuery;
}

export function isTransientId(id) {
  return id != null && typeof id === "string" && isNaN(parseInt(id));
}
