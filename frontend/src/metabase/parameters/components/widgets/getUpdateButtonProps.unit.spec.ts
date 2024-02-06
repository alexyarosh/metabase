import { createMockParameter } from "metabase-types/api/mocks/parameters";
import type { Parameter } from "metabase-types/api";
import { getUpdateButtonProps } from "./getUpdateButtonProps";

describe("getUpdateButtonProps", () => {
  let parameter: Parameter;

  describe("non-required parameters", () => {
    beforeEach(() => {
      parameter = createMockParameter({});
    });

    it("without both value and unsaved, shows disabled add", () => {
      expect(getUpdateButtonProps([], [], parameter)).toStrictEqual({
        label: "Add filter",
        disabled: true,
      });
    });

    it("without a value, shows enabled add", () => {
      expect(getUpdateButtonProps([], ["a"], parameter)).toStrictEqual({
        label: "Add filter",
        disabled: false,
      });
    });

    it("with a different unsaved, shows enabled update", () => {
      expect(getUpdateButtonProps(["New"], ["Hello"], parameter)).toStrictEqual(
        {
          label: "Update filter",
          disabled: false,
        },
      );
    });

    it("when value is the same, shows disabled update", () => {
      expect(
        getUpdateButtonProps(["Value"], ["Value"], parameter),
      ).toStrictEqual({
        label: "Update filter",
        disabled: true,
      });
    });

    it("when unsaved is empty, shows update", () => {
      expect(getUpdateButtonProps(["Value"], [], parameter)).toStrictEqual({
        label: "Update filter",
        disabled: false,
      });
    });
  });

  describe("required parameters", () => {
    beforeEach(() => {
      parameter = createMockParameter({
        required: true,
        default: ["CA", "WA"],
      });
    });

    it("without both values, shows reset", () => {
      expect(getUpdateButtonProps([], [], parameter)).toStrictEqual({
        label: "Reset to default",
        disabled: false,
      });
    });

    it("when value equals default, and unsaved is the same, shows disabled reset", () => {
      expect(
        getUpdateButtonProps(["WA", "CA"], ["CA", "WA"], parameter),
      ).toStrictEqual({
        label: "Reset to default",
        disabled: true,
      });
    });

    it("when value equals default, and unsaved is different, shows update", () => {
      expect(
        getUpdateButtonProps(["WA", "CA"], ["WA"], parameter),
      ).toStrictEqual({
        label: "Update filter",
        disabled: false,
      });
    });

    it("when value does not equal default, and unsaved is different, shows update", () => {
      expect(getUpdateButtonProps(["WA"], ["FL"], parameter)).toStrictEqual({
        label: "Update filter",
        disabled: false,
      });
    });

    it("when value equals default, and unsaved is empty, shows reset to default", () => {
      expect(getUpdateButtonProps(["WA", "CA"], [], parameter)).toStrictEqual({
        label: "Reset to default",
        disabled: false,
      });
    });

    it("when value does not equal default, and unsaved is empty, shows reset to default", () => {
      expect(getUpdateButtonProps(["WA"], [], parameter)).toStrictEqual({
        label: "Reset to default",
        disabled: false,
      });
    });
  });

  describe("non-required parameters with default value", () => {
    beforeEach(() => {
      parameter = createMockParameter({ default: "default" });
    });

    it("without both values, shows disabled update", () => {
      expect(getUpdateButtonProps(null, null, parameter)).toStrictEqual({
        label: "Update filter",
        disabled: true,
      });
    });

    it("with value not equal default and different unsaved, shows update", () => {
      expect(getUpdateButtonProps("old", "new", parameter)).toStrictEqual({
        label: "Update filter",
        disabled: false,
      });
    });

    it("with no value and unsaved same as default, shows reset", () => {
      expect(getUpdateButtonProps(null, "default", parameter)).toStrictEqual({
        label: "Reset to default",
        disabled: false,
      });
    });

    it("when value and unsaved are samb but different from default, shows disabled update", () => {
      expect(getUpdateButtonProps("old", "old", parameter)).toStrictEqual({
        label: "Update filter",
        disabled: true,
      });
    });

    it("when value and unsaved are same as default, shows disabled reset", () => {
      expect(
        getUpdateButtonProps("default", "default", parameter),
      ).toStrictEqual({
        label: "Reset to default",
        disabled: true,
      });
    });
  });
});
