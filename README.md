# Release Defaults

Ever needed to release something without having the time to write release notes? Ever found yourself reading the commit log to be able to tell someone what changes are in the release?

**Release Defaults** drafts release-notes for releases that don't have a body.

## Goals (and non-goals)

- [x] Pull-Request Overview
- [x] Direct Commit Collapsed Overview
- [x] Less annoying than commit-log
- [ ] Organize by PR labels
- [ ] Allow some customization

### Non Goals

- Customer Ready or picture perfect
- Project specific additions that can't be solved with a configuration

## How Release Defaults works

1. Every time it finds an empty release body, it activates (created, edited, etc)
2. It fetches a list of releases that are older (according to semver)
3. It compares the current release to the last one
4. It finds all the pull-requests for the difference and grabs the details.
5. A new release note body is created
   - Pull-Requests
   - Collapsed list of commits that don't belong to a PR
   - Lists release-notes for previous releases of the same major+minor version. E.g. 1.0.1 will list 1.0.0 as a previous release, but not 0.9.1.

---

## Before

```
Fix: Added some stuff to some lines
```

## After

- A very important feature PR (#3)
- Another important feature PR (#4)

<details><summary>Direct Commits</summary>

- **Andri**: [sort of works now](https://github.com/andrioid/draft-on-release-tag/commit/24f4bfa9bf2c37e275d5af076823585873e5abc8)
- **Andri**: [Merge branch 'master' of github.com:andrioid/draft-on-release-tag](https://github.com/andrioid/draft-on-release-tag/commit/221cc686a3ffad906f56695b243ea246d37b9b1f)

</details>

<!-- Page break -->

### Previous releases

### [v0.0.5: count: 13](https://github.com/andrioid/draft-on-release-tag/releases/tag/v0.0.5)

- First PR test (#2)

---

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

## Github Actions

Add to a Github workflow file (e.g. .github/workflows/example.yml)

```yml
name: Release Defaults Bot
on:
  release:
    types:
      - created
      - edited

jobs:
  release-notes:
    runs-on: ubuntu-latest
    steps:
      - uses: andrioid/release-defaults-bot@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Contributing

If you have suggestions for how draft-on-release-tag could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[MIT](LICENSE) © 2021 Andri Oskarsson
