# Contributing

Thank you for your interest in contributing to the Secure Smart-Contract Permission & Key Management project.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Compile contracts: `npx hardhat compile`
5. Run the test suite: `npx hardhat test`

## Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all tests pass: `npx hardhat test`
4. Run static analysis: `slither . --config-file slither.config.json`
5. Submit a pull request

## Code Style

- **Solidity**: Follow the [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html). Use 2-space indentation.
- **JavaScript**: 2-space indentation, semicolons, single quotes.
- **Java**: 4-space indentation, follow standard Java conventions.

## Adding a New Pattern

If you want to contribute a new permission/key-management pattern:

1. Add the Solidity contract in `contracts/`
2. Write a Certora CVL specification in `specs/`
3. Add unit tests in `test/unit/`
4. Add adversarial test scenarios in `test/adversarial/`
5. Document the formal properties in `docs/properties.md`
6. Update `certora.conf` with the new contract and spec

## Reporting Issues

Use the [GitHub issue tracker](../../issues) to report bugs or request features. Please include:

- A clear description of the issue
- Steps to reproduce (if applicable)
- Expected vs actual behavior
- Solidity compiler version and Node.js version

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
