// Config file with test secret pattern (for testing gitleaks detection)
module.exports = {
  apiUrl: "https://api.example.com",
  // Custom test pattern - detected by local .gitleaks.toml custom rule
  testSecret: "TEST_SECRET_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
};
