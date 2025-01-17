import {
  createAction,
  restore,
  setActionsEnabledForDB,
} from "e2e/support/helpers";
import { SAMPLE_DB_ID } from "e2e/support/cypress_data";
import { ORDERS_QUESTION_ID } from "e2e/support/cypress_sample_instance_data";

const ACTION_DETAILS = {
  name: "Update orders quantity",
  description: "Set orders quantity to the same value",
  type: "query",
  model_id: ORDERS_QUESTION_ID,
  database_id: SAMPLE_DB_ID,
  dataset_query: {
    database: SAMPLE_DB_ID,
    native: {
      query: "UPDATE orders SET quantity = quantity",
    },
    type: "native",
  },
  parameters: [],
  visualization_settings: {
    type: "button",
  },
};

describe("issue 29378", () => {
  beforeEach(() => {
    restore();
    cy.signInAsAdmin();
    setActionsEnabledForDB(SAMPLE_DB_ID);
  });

  it("should not crash the model detail page after searching for an action (metabase#29378)", () => {
    cy.request("PUT", `/api/card/${ORDERS_QUESTION_ID}`, { type: "model" });
    createAction(ACTION_DETAILS);

    cy.visit(`/model/${ORDERS_QUESTION_ID}/detail`);
    cy.findByRole("tab", { name: "Actions" }).click();
    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText(ACTION_DETAILS.name).should("be.visible");
    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText(ACTION_DETAILS.dataset_query.native.query).should(
      "be.visible",
    );

    cy.findByRole("tab", { name: "Used by" }).click();
    cy.findByPlaceholderText("Search…").type(ACTION_DETAILS.name);
    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText(ACTION_DETAILS.name).should("be.visible");

    cy.findByRole("tab", { name: "Actions" }).click();
    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText(ACTION_DETAILS.name).should("be.visible");
    // eslint-disable-next-line no-unscoped-text-selectors -- deprecated usage
    cy.findByText(ACTION_DETAILS.dataset_query.native.query).should(
      "be.visible",
    );
  });
});
