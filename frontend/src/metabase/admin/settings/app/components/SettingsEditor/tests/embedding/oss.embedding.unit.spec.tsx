import { screen } from "__support__/ui";
import {
  goToStaticEmbeddingSettings,
  setupEmbedding,
  getQuickStartLink,
  goToInteractiveEmbeddingSettings,
} from "./setup";

let embeddingSettingEnabled = false;
describe("[OSS] embedding settings", () => {
  describe("when the embedding is disabled", () => {
    beforeEach(() => {
      embeddingSettingEnabled = false;
    });
    describe("static embedding", () => {
      it("should not allow going to static embedding settings page", async () => {
        await setupEmbedding({
          settingValues: { "enable-embedding": embeddingSettingEnabled },
        });

        expect(() => {
          goToStaticEmbeddingSettings();
        }).toThrow();
      });

      it("should prompt to upgrade to remove the Powered by text", async () => {
        await setupEmbedding({
          settingValues: { "enable-embedding": embeddingSettingEnabled },
        });

        expect(screen.getByText("upgrade to a plain plan")).toBeInTheDocument();

        expect(
          screen.getByRole("link", { name: "upgrade to a plain plan" }),
        ).toHaveProperty("href", expect.stringContaining("embed_standalone"));
      });
    });

    describe("interactive embedding", () => {
      it("should have a learn more button for interactive embedding", async () => {
        await setupEmbedding({
          settingValues: { "enable-embedding": embeddingSettingEnabled },
        });
        expect(
          screen.getByRole("link", { name: "Learn More" }),
        ).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Learn More" })).toHaveProperty(
          "href",
          "https://www.metabase.com/product/embedded-analytics?utm_source=product&utm_medium=CTA&utm_campaign=embed-settings-oss-cta",
        );
      });

      it("should link to quickstart for interactive embedding", async () => {
        await setupEmbedding({
          settingValues: { "enable-embedding": embeddingSettingEnabled },
        });
        expect(getQuickStartLink()).toBeInTheDocument();
        expect(getQuickStartLink()).toHaveProperty(
          "href",
          "https://www.metabase.com/learn/customer-facing-analytics/interactive-embedding-quick-start?utm_source=product&utm_medium=CTA&utm_campaign=embed-settings-oss-cta",
        );
      });

      it("should link to https://www.metabase.com/blog/why-full-app-embedding", async () => {
        await setupEmbedding({
          settingValues: { "enable-embedding": embeddingSettingEnabled },
        });

        expect(
          screen.getByText("offer multi-tenant, self-service analytics"),
        ).toHaveProperty(
          "href",
          "https://www.metabase.com/blog/why-full-app-embedding",
        );
      });
    });
  });
  describe("when the embedding is enabled", () => {
    beforeEach(() => {
      embeddingSettingEnabled = true;
    });
    it("should allow going to static embedding settings page", async () => {
      const { history } = await setupEmbedding({
        settingValues: { "enable-embedding": embeddingSettingEnabled },
      });

      goToStaticEmbeddingSettings();

      const location = history.getCurrentLocation();
      expect(location.pathname).toEqual(
        "/admin/settings/embedding-in-other-applications/standalone",
      );
    });

    it("should not allow going to interactive embedding settings page", async () => {
      await setupEmbedding({
        settingValues: { "enable-embedding": embeddingSettingEnabled },
      });

      expect(() => goToInteractiveEmbeddingSettings()).toThrow();
    });
  });
});
