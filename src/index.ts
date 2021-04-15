import { Probot } from "probot";
import compareVersions from "compare-versions";
//import log from "./log"

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
      }))
      .filter((r) => !r.draft)
      .filter(
        (r) => compareVersions(r.tag_name, context.payload.release.tag_name) < 0
      )
      .sort((a, b) => compareVersions(b.tag_name, a.tag_name));

    if (filteredReleases.length === 0) {
      return; // No earlier releases, nothing to do.
    }
    const lastRelease = filteredReleases[0];

    const comparison = await context.octokit.repos.compareCommits({
      owner: context.repo().owner,
      repo: context.repo().repo,
      base: context.payload.release.tag_name,
      head: lastRelease.tag_name,
    });

    //console.log("releases", releases);
    console.log("filtered", filteredReleases);
    console.log("comparison", comparison);

    //  let releases = await context.octokit.paginate(
    //   context.octokit.getReleases(context.repo()),
    //   res => res.data
    // )

    // releases = releases
    //   .filter(r => !r.draft)
    //   .sort((r1, r2) => compareVersions(r2.tag_name, r1.tag_name))

    // if (releases.length === 0) {
    //   log({ app, context, message: `No releases found` })
    //   return
    // }

    //const latestRelease = await context.octokit.repos.getLatestRelease();
    //const releaseId = context.payload.release.id
    //const releaseOwner = context.payload.release.author
    //const releaseRepo = context.payload.repository
    //context.octokit.repos.getRelease(context.payload.release.id)
  });

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
