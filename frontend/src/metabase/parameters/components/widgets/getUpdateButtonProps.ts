import { t } from "ttag";
import type { Parameter } from "metabase-types/api";
import { areParameterValuesIdentical } from "metabase-lib/parameters/utils/parameter-values";

const UPDATE = t`Update filter`;
const ADD = t`Add filter`;
const RESET = t`Reset to default`;

/**
 * This is used to show the correct button when picking filter values.
 * Since the label and disable state depend on current value, unsaved value
 * and whether a parameter is required or not, the logic is a bit more
 * sophisticated that we would like it to be.
 *
 * See tests for a better explanation.
 */
export function getUpdateButtonProps(
  value: unknown,
  unsavedValue: unknown,
  parameter: Parameter,
): { label: string; disabled: boolean } {
  if (parameter.required) {
    return {
      label:
        !hasValue(unsavedValue) ||
        areParameterValuesIdentical(unsavedValue, parameter.default)
          ? RESET
          : UPDATE,
      disabled:
        areParameterValuesIdentical(unsavedValue, value) &&
        hasValue(unsavedValue),
    };
  }

  if (hasValue(parameter.default)) {
    return {
      label: areParameterValuesIdentical(unsavedValue, parameter.default)
        ? RESET
        : UPDATE,
      disabled: areParameterValuesIdentical(value, unsavedValue),
    };
  }

  return {
    label: hasValue(value) ? UPDATE : ADD,
    disabled: areParameterValuesIdentical(value, unsavedValue),
  };
}

function hasValue(value: unknown): boolean {
  return Array.isArray(value) ? value.length > 0 : value != null;
}
