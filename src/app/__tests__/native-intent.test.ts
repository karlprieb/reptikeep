import { redirectSystemPath } from "@/app/+native-intent";

describe("redirectSystemPath", () => {
  const uuid = "0123abcd-1234-5678-9abc-0123456789ab";

  it("rewrites a valid enclosure label url to the animal route", () => {
    expect(
      redirectSystemPath({ path: `https://reptikeep.com/a/?id=${uuid}` }),
    ).toBe(`/animal/${uuid}`);
  });

  it("rewrites with log=1 into a query param", () => {
    expect(
      redirectSystemPath({
        path: `https://reptikeep.com/a/?id=${uuid}&log=1`,
      }),
    ).toBe(`/animal/${uuid}?log=1`);
  });

  it("rewrites the custom scheme form the same way", () => {
    expect(redirectSystemPath({ path: `reptikeep://a/?id=${uuid}` })).toBe(
      `/animal/${uuid}`,
    );
  });

  it("falls back to a safe placeholder id for a malformed uuid", () => {
    expect(
      redirectSystemPath({
        path: "https://reptikeep.com/a/?id=../../settings",
      }),
    ).toBe("/animal/invalid");
  });

  it("passes unrelated paths through unchanged", () => {
    expect(
      redirectSystemPath({ path: "https://reptikeep.com/animal/abc" }),
    ).toBe("https://reptikeep.com/animal/abc");
    expect(redirectSystemPath({ path: "reptikeep://animal/abc" })).toBe(
      "reptikeep://animal/abc",
    );
    expect(redirectSystemPath({ path: "/settings" })).toBe("/settings");
  });

  it("leaves /a/ links on other hosts alone", () => {
    for (const path of [
      `https://example.com/a/?id=${uuid}`,
      `reptikeep://other/a/?id=${uuid}`,
    ]) {
      expect(redirectSystemPath({ path })).toBe(path);
    }
  });

  it("rewrites a bare label path", () => {
    expect(redirectSystemPath({ path: `/a/?id=${uuid}` })).toBe(
      `/animal/${uuid}`,
    );
  });

  it("never throws on malformed input", () => {
    expect(() => redirectSystemPath({ path: "" })).not.toThrow();
    expect(() =>
      redirectSystemPath({ path: "not a url at all ://" }),
    ).not.toThrow();
    expect(redirectSystemPath({ path: "" })).toBe("");
  });
});
