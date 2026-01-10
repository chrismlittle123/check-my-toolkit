// Config file with hardcoded secrets (for testing gitleaks detection)
module.exports = {
  apiUrl: "https://api.example.com",
  // Generic secret patterns that gitleaks should detect
  githubToken: "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  privateKey: `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy0AHB7MaH3hGv5T5K8bKcL
QWmD3P0eKXArF1TH8MKp7YS3BL8WPMoL9O6q0XRJqJCk8uxGrXL3BZx3xJcT+guq
-----END RSA PRIVATE KEY-----`,
};
