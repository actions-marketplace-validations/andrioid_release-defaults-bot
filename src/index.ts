import { Probot } from "probot";
import compareVersions from "compare-versions";
import semver from "semver";

/**
 * TODO:
 * 1. Fetch all releases matching our major + minor and add their body to ours as
 * 2. Cleanup and split up
 */

const PAGE_BREAK_MD = "\n<!-- Page break -->\n";

export = (app: Probot) => {
  app.on("issues.edited", async (context) => {
    app.log.info("onIssueEdit");
    const issueComment = context.issue({
      body: "Tak for edit. Du er sød.",
    });
    await context.octokit.issues.createComment(issueComment);
  });

  app.on("release", async (context) => {
    app.log.info("onRelease", context.payload, context.config);
    /**
     * 1. List releases and find the latest release (lower semver)
     * 2. Find this release
     * 3. Do a compare to find all pull-requests merged in between
     * 4. Generate release draft
     * 5. Add to this release
     */

    if (context.payload.release.body !== "") {
      context.log.warn("Body is not empty, ignoring event");
      return;
    }

    const thisVersion = context.payload.release.tag_name;
    if (!semver.valid(thisVersion)) {
      context.log.warn("Version in tag name is not valid, ignoring");
      return;
    }

    let releases = await context.octokit.paginate(
      "GET /repos/{owner}/{repo}/releases",
      {
        owner: context.repo().owner,
        repo: context.repo().repo,
      }
    );

    const filteredReleases = releases
      .map((r) => ({
        name: r.name,
        tag_name: r.tag_name,
        draft: r.draft,
        prerelease: r.prerelease,
        body: r.body,
      }))
      .filter((r) => {
        // Exclude drafts and pre-releases from comparison
        if (r.draft || r.prerelease) {
          return false;
        }
        // Exclude any newer versions than our own
        if (
          compareVersions(r.tag_name, context.payload.release.tag_name) >= 0
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => compareVersions(b.tag_name, a.tag_name));

    if (filteredReleases.length === 0) {
      return; // No earlier releases, nothing to do.
    }
    const lastRelease = filteredReleases[0];

    const comparison = await context.octokit.repos.compareCommits({
      owner: context.repo().owner,
      repo: context.repo().repo,
      base: lastRelease.tag_name,
      head: context.payload.release.tag_name,
    });

    console.log("filtered", filteredReleases);
    const commits = comparison.data.commits;

    let pullRequests: {
      [key: number]: {
        id: number;
        title: string;
        url: string;
        body: string | null;
        number: number;
      };
    } = {};

    context.log.info(`Number of commits`, JSON.stringify(comparison));

    for (let i = 0; i < commits.length; i++) {
      let pr = await context.octokit.repos.listPullRequestsAssociatedWithCommit(
        {
          owner: context.repo().owner,
          repo: context.repo().repo,
          commit_sha: commits[i].sha,
        }
      );
      if (pr.data.length > 0) {
        console.log(
          "adding pr to list",
          commits[i].commit.message,
          pr.data[0].title
        );
        pullRequests[pr.data[0].id] = pr.data[0];
      }
    }

    if (Object.keys(pullRequests).length === 0) {
      context.log.warn("No pull requests found, aborting");
      return;
    }

    // Add pull-requests to the body
    let newBody = ``;

    for (const k in pullRequests) {
      newBody += `- ${pullRequests[k].title} (#${pullRequests[k].number})\n`;
    }

    // Add any previous releases
    newBody += PAGE_BREAK_MD;
    newBody += `## Previous releases\n\n`;
    for (let i = 0; i < filteredReleases.length; i++) {
      const body = filteredReleases[i].body;
      if (!body) {
        continue;
      }
      newBody += `### ${filteredReleases[i].name}\n\n`;

      const bodyPart =
        (filteredReleases[i].body &&
          filteredReleases[i].body?.split(PAGE_BREAK_MD)[0]) ||
        "";
      if (bodyPart) {
        newBody += `${bodyPart}\n\n`;
      } else {
        newBody += `${filteredReleases[i].body}\n\n`;
      }
    }

    await context.octokit.repos.updateRelease({
      owner: context.repo().owner,
      repo: context.repo().repo,
      release_id: context.payload.release.id,
      body: newBody,
    });
  });

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
