const { withEntitlementsPlist } = require("expo/config-plugins");

module.exports = function withNoPushEntitlement(config) {
  return withEntitlementsPlist(config, (modConfig) => {
    delete modConfig.modResults["aps-environment"];
    return modConfig;
  });
};
