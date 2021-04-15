# draft-on-release-tag

> A GitHub App built with [Probot](https://github.com/probot/probot) that Drafts release notes when a new tag is created

Testing something 2

## Setup

```sh
# Install dependencies
npm install

# Run the bot
npm start
```

## Docker

```sh
# 1. Build container
docker build -t draft-on-release-tag .

# 2. Start container
docker run -e APP_ID=<app-id> -e PRIVATE_KEY=<pem-value> draft-on-release-tag
```

## Contributing

If you have suggestions for how draft-on-release-tag could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2021 Andri Oskarsson <ano@venuepos.net>
