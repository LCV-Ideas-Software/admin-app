import { expect, test } from "vitest";

import { verifyThirdPartyInventory } from "./verify-thirdparty.mjs";

const packageJson = {
  dependencies: { alpha: "^1.0.0" },
  devDependencies: { beta: "^2.0.0" },
};

const packageLock = {
  packages: {
    "node_modules/alpha": {
      version: "1.0.1",
      license: "MIT",
      resolved: "https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz",
    },
    "node_modules/beta": {
      version: "2.0.2",
      license: "Apache-2.0",
      resolved: "https://registry.npmjs.org/beta/-/beta-2.0.2.tgz",
    },
  },
};

function inventory(rows = [
  "| alpha | ^1.0.0 | MIT | Não | https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz |",
  "| beta | ^2.0.0 | Apache-2.0 | Não | https://registry.npmjs.org/beta/-/beta-2.0.2.tgz |",
]) {
  return `# Third-Party Components

| Componente | Versão | Licença Original | Modificado? | Link de Origem |
|------------|--------|------------------|-------------|----------------|
${rows.join("\n")}
`;
}

function verify(overrides = {}) {
  const rootInventory = overrides.rootInventory ?? inventory();
  verifyThirdPartyInventory({
    packageJson: overrides.packageJson ?? packageJson,
    packageLock: overrides.packageLock ?? packageLock,
    rootInventory,
    publicInventory: overrides.publicInventory ?? rootInventory,
    verifiedComponents: ["alpha", "beta"],
  });
}

test("accepts byte-identical scoped dependency metadata", () => {
  expect(() => verify()).not.toThrow();
});

test("rejects divergence between root and public copies", () => {
  expect(() => verify({ publicInventory: `${inventory()}\n` })).toThrow(
    /must be byte-identical/u,
  );
});

test("rejects a missing verified component", () => {
  expect(() => verify({ rootInventory: inventory([inventory().split("\n")[4]]) })).toThrow(
    /inventory metadata does not match/u,
  );
});

test("rejects duplicate components", () => {
  const row = "| alpha | ^1.0.0 | MIT | Não | https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz |";
  expect(() => verify({ rootInventory: inventory([row, row]) })).toThrow(/duplicate/u);
});

test("rejects manifest version drift", () => {
  const changed = inventory().replace("| alpha | ^1.0.0 |", "| alpha | ^1.9.0 |");
  expect(() => verify({ rootInventory: changed })).toThrow(/does not match/u);
});

test("rejects license drift", () => {
  const changed = inventory().replace("| alpha | ^1.0.0 | MIT |", "| alpha | ^1.0.0 | ISC |");
  expect(() => verify({ rootInventory: changed })).toThrow(/does not match/u);
});

test("rejects effective source drift", () => {
  const changed = inventory().replace("alpha-1.0.1.tgz", "alpha-1.0.0.tgz");
  expect(() => verify({ rootInventory: changed })).toThrow(/does not match/u);
});
