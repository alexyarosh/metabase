import { createMockMetadata } from "__support__/metadata";
import { isDimensionTarget } from "metabase-types/guards";
import type { ParameterDimensionTarget } from "metabase-types/api";
import { createMockTemplateTag } from "metabase-types/api/mocks";
import {
  createSampleDatabase,
  PRODUCTS,
  PRODUCTS_ID,
  SAMPLE_DB_ID,
} from "metabase-types/api/mocks/presets";
import type Database from "metabase-lib/metadata/Database";
import {
  getParameterTargetField,
  isVariableTarget,
  getTemplateTagFromTarget,
} from "metabase-lib/parameters/utils/targets";

describe("parameters/utils/targets", () => {
  const metadata = createMockMetadata({
    databases: [createSampleDatabase()],
  });

  const db = metadata.database(SAMPLE_DB_ID) as Database;

  describe("isDimensionTarget", () => {
    it("should return false for non-dimension targets", () => {
      expect(isDimensionTarget(["variable", ["template-tag", "foo"]])).toBe(
        false,
      );
      // @ts-expect-error - this function is still used in untyped code -- making sure non-arrays don't blow up
      expect(isDimensionTarget()).toBe(false);
    });

    it('should return true for a target that contains a "dimension" string in the first entry', () => {
      expect(isDimensionTarget(["dimension", ["field", 1, null]])).toBe(true);
      expect(isDimensionTarget(["dimension", ["template-tag", "foo"]])).toBe(
        true,
      );
    });
  });

  describe("isVariableTarget", () => {
    it("should return false for non-variable targets", () => {
      expect(isVariableTarget(["dimension", ["field", 1, null]])).toBe(false);
      expect(isVariableTarget(["dimension", ["template-tag", "foo"]])).toBe(
        false,
      );
      // @ts-expect-error - this function is still used in untyped code -- making sure non-arrays don't blow up
      expect(isVariableTarget()).toBe(false);
    });

    it("should return true for a variable target", () => {
      expect(isVariableTarget(["variable", ["template-tag", "foo"]])).toBe(
        true,
      );
    });
  });

  describe("getTemplateTagFromTarget", () => {
    it("should return the tag of a template tag target", () => {
      expect(
        getTemplateTagFromTarget(["variable", ["template-tag", "foo"]]),
      ).toBe("foo");
      expect(
        getTemplateTagFromTarget(["dimension", ["template-tag", "bar"]]),
      ).toBe("bar");
    });

    it("should return null for targets that are not template tags", () => {
      // @ts-expect-error - this function is still used in untyped code -- making sure non-arrays don't blow up
      expect(getTemplateTagFromTarget(["dimension"])).toBe(null);
      // @ts-expect-error - this function is still used in untyped code -- making sure non-arrays don't blow up
      expect(getTemplateTagFromTarget()).toBe(null);
      expect(
        getTemplateTagFromTarget(["dimension", ["field", 123, null]]),
      ).toBe(null);
    });
  });

  describe("getParameterTargetField", () => {
    it("should return null when the target is not a dimension", () => {
      const question = db.nativeQuestion({
        query: "select * from PRODUCTS where CATEGORY = {{foo}}",
        "template-tags": {
          foo: createMockTemplateTag({
            type: "text",
          }),
        },
      });

      expect(
        getParameterTargetField(
          ["variable", ["template-tag", "foo"]],
          question,
        ),
      ).toBe(null);
    });

    it("should return the mapped field behind a template tag field filter", () => {
      const target: ParameterDimensionTarget = [
        "dimension",
        ["template-tag", "foo"],
      ];
      const question = db.nativeQuestion({
        query: "select * from PRODUCTS where {{foo}}",
        "template-tags": {
          foo: createMockTemplateTag({
            type: "dimension",
            dimension: ["field", PRODUCTS.CATEGORY, null],
          }),
        },
      });

      expect(getParameterTargetField(target, question)).toEqual(
        expect.objectContaining({
          id: PRODUCTS.CATEGORY,
        }),
      );
    });

    it("should return the target field", () => {
      const target: ParameterDimensionTarget = [
        "dimension",
        ["field", PRODUCTS.CATEGORY, null],
      ];
      const question = db.question({
        "source-table": PRODUCTS_ID,
      });
      expect(getParameterTargetField(target, question)).toEqual(
        expect.objectContaining({
          id: PRODUCTS.CATEGORY,
        }),
      );
    });
  });
});
